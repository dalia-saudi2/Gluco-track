import { apiClient } from '../config/api';
import { storageService } from './storageService';
import { environmentConfig } from '../config/environment';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  blood_type?: string;
  emergency_contact?: string;
  date_of_birth?: string;
  is_active: boolean;
  google_id?: string | null;
  google_picture?: string | null;
  hashed_password?: string | null; // Note: This is only used to check if password exists, never exposed
  /** Insulin sensitivity factor (mg/dL per unit). */
  isf_mg_dl_per_unit?: number | null;
  /** Insulin-to-carb ratio (grams carb per unit). */
  icr_grams_per_unit?: number | null;
  age?: number | null;
  ethnicity?: string | null;
  education_level?: string | null;
  education_major?: string | null;
  employment_status?: string | null;
  income_level?: string | null;
  onboarding_completed?: boolean;
  onboarding_lab_opt_in?: boolean | null;
  lab_upload_pending?: boolean;
  gender?: string | null;
  is_diabetic_path?: boolean | null;
  nationality?: string | null;
  marital_status?: string | null;
  caregiver_name?: string | null;
  caregiver_phone?: string | null;
  preferred_language?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

class AuthService {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Update API client base URL if needed
      const baseUrl = environmentConfig.getApiBaseUrl();
      (apiClient as any).baseUrl = baseUrl;

      const response = await apiClient.login(email, password);

      // Save token and user info
      if (response.access_token) {
        await storageService.saveToken(response.access_token);
        await storageService.saveUserEmail(email);
        apiClient.setToken(response.access_token);
      }

      // Save refresh token if provided
      if (response.refresh_token) {
        await storageService.saveRefreshToken(response.refresh_token);
      }

      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error?.message || 'Login failed. Please check your credentials.');
    }
  }

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
    address?: string;
    gender?: string;
  }): Promise<any> {
    try {
      const baseUrl = environmentConfig.getApiBaseUrl();
      (apiClient as any).baseUrl = baseUrl;

      const response = await apiClient.register(userData);
      return response;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error?.message || 'Registration failed. Please try again.');
    }
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const baseUrl = environmentConfig.getApiBaseUrl();
      (apiClient as any).baseUrl = baseUrl;

      const response = await apiClient.loginWithGoogle(idToken);

      if (response.access_token) {
        await storageService.saveToken(response.access_token);
        apiClient.setToken(response.access_token);
      }

      return response;
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error?.message || 'Google login failed.');
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await storageService.clearAuthData();
      apiClient.setToken('');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await storageService.getToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get stored token
   */
  async getStoredToken(): Promise<string | null> {
    return await storageService.getToken();
  }

  /**
   * Initialize auth state (restore token on app start)
   */
  /** Restore session; returns user if valid (single /users/me on success path). */
  async initializeAuth(): Promise<User | null> {
    try {
      const token = await storageService.getToken();
      if (!token) return null;

      apiClient.setToken(token);
      const baseUrl = environmentConfig.getApiBaseUrl();
      (apiClient as any).baseUrl = baseUrl;

      try {
        const user = await apiClient.getCurrentUser();
        await storageService.saveUserData(user);
        return user as User;
      } catch {
        console.log('Token validation failed, attempting refresh...');
        const refreshed = await this.refreshTokenIfNeeded();
        if (!refreshed) return null;
        try {
          const user = await apiClient.getCurrentUser();
          await storageService.saveUserData(user);
          return user as User;
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await storageService.getRefreshToken();

      if (!refreshToken) {
        // No refresh token available, user needs to login again
        await this.logout();
        return null;
      }

      // Note: Your backend needs to implement a refresh token endpoint
      // For now, we'll try to use the existing token or re-login
      // In a real implementation, you'd call: POST /auth/refresh with refresh_token

      // Since FastAPI doesn't have refresh endpoint by default,
      // we'll check if we can get user info, otherwise logout
      try {
        apiClient.setSuppressAuthRefresh(true);
        await apiClient.getCurrentUser();
        const token = await storageService.getToken();
        return token;
      } catch (error) {
        // Token expired, need to re-login
        await this.logout();
        return null;
      } finally {
        apiClient.setSuppressAuthRefresh(false);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return null;
    }
  }

  /**
   * Refresh token if needed (with promise caching to prevent multiple simultaneous refreshes)
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      // Wait for ongoing refresh
      try {
        const token = await this.refreshPromise;
        return !!token;
      } catch {
        return false;
      }
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshToken();

    try {
      const token = await this.refreshPromise;
      return !!token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiClient.getCurrentUser();
      await storageService.saveUserData(user);
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();

