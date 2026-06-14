import { environmentConfig } from './environment';
import { authService } from '../services/authService';

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000', // Default, will be overridden by environment config
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      GOOGLE: '/auth/google',
      ME: '/users/me'
    },
    DASHBOARD: '/dashboard',
    APPOINTMENTS: '/appointments',
    MEDICAL_RECORDS: '/medical-records',
    MEDICATIONS: '/medications',
    CHAT: '/chat/messages'
  }
};

// API Helper Functions
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  /** When true, 401 responses do not trigger refresh/retry (avoids deadlock inside refreshToken). */
  private suppressAuthRefresh = false;
  private onSessionExpired: (() => void) | null = null;

  constructor(baseUrl?: string) {
    // Use environment config if available, otherwise use default
    this.baseUrl = baseUrl || environmentConfig.getApiBaseUrl() || API_CONFIG.BASE_URL;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  setSuppressAuthRefresh(suppress: boolean) {
    this.suppressAuthRefresh = suppress;
  }

  setOnSessionExpired(callback: () => void) {
    this.onSessionExpired = callback;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Ensure we have the latest token
    if (!this.token) {
      const storedToken = await authService.getStoredToken();
      if (storedToken) {
        this.token = storedToken;
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - token expired
      if (response.status === 401 && retryCount === 0 && !this.suppressAuthRefresh) {
        // Try to refresh token
        const refreshed = await authService.refreshTokenIfNeeded();
        if (refreshed) {
          // Retry the request with new token
          const newToken = await authService.getStoredToken();
          if (newToken) {
            this.token = newToken;
            return this.request(endpoint, options, retryCount + 1);
          }
        }
        // If refresh failed, clear token
        this.token = null;
        // Clear stored token
        try {
          const { storageService } = await import('../services/storageService');
          await storageService.clearAuthData();
        } catch (e) {
          console.error('Error clearing auth data:', e);
        }
        this.onSessionExpired?.();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If parsing fails, use the text as is
          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${error}`);
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email,
          password: password,
          grant_type: 'password'
        })
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Login failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.setToken(data.access_token);
      return data;
    } catch (error: any) {
      // Handle network errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:8000');
      }
      throw error;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
    address?: string;
    gender?: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginWithGoogle(idToken: string) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
    if (data?.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  // Dashboard
  async getDashboard() {
    return this.request('/dashboard');
  }

  // Appointments
  async getAppointments() {
    return this.request('/appointments');
  }

  async createAppointment(appointmentData: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(id: number, appointmentData: any) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  }

  async deleteAppointment(id: number) {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  // Medical Records
  async getMedicalRecords() {
    return this.request('/medical-records');
  }

  // Medications
  async getMedications() {
    return this.request('/medications');
  }

  async createMedication(medicationData: any) {
    return this.request('/medications', {
      method: 'POST',
      body: JSON.stringify(medicationData),
    });
  }

  async updateMedication(id: number, medicationData: any) {
    return this.request(`/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicationData),
    });
  }

  // Medical Records
  async createMedicalRecord(recordData: any) {
    return this.request('/medical-records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  }

  // User
  async getCurrentUser() {
    return this.request('/users/me');
  }

  async updateUser(userData: any) {
    return this.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateOnboardingDemographics(data: {
    age?: number;
    gender?: string;
    ethnicity?: string;
    education_level?: string;
    employment_status?: string;
    income_level?: string;
    onboarding_completed?: boolean;
  }) {
    return this.request('/users/me/onboarding', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateOnboardingLabChoice(hasLabResults: boolean) {
    return this.request('/users/me/onboarding/lab-choice', {
      method: 'PATCH',
      body: JSON.stringify({
        onboarding_lab_opt_in: hasLabResults,
        onboarding_completed: hasLabResults ? false : true,
      }),
    });
  }

  async completeOnboarding() {
    return this.request('/users/me/onboarding/complete', {
      method: 'PATCH',
      body: JSON.stringify({ onboarding_completed: true }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        token,
        new_password: newPassword,
      }),
    });
  }

  // Chat Sessions
  async createChatSession() {
    return this.request('/chat/sessions', {
      method: 'POST',
    });
  }

  // Chat
  async sendMessage(message: string, sessionId?: string) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        content: message,
        message_type: 'text',
        session_id: sessionId
      }),
    });
  }

  /** ISF / ICR personalization for glucose prediction */
  async patchDiabetesSettings(body: { isf_mg_dl_per_unit?: number; icr_grams_per_unit?: number }) {
    return this.request('/users/me/diabetes-settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async searchUsdaFoods(query: string, pageSize = 20) {
    const qs = new URLSearchParams({ q: query.trim(), page_size: String(pageSize) });
    return this.request(`/nutrition/usda/search?${qs.toString()}`);
  }

  async getUsdaFoodDetail(fdcId: number) {
    return this.request(`/nutrition/usda/food/${fdcId}`);
  }

  async predictMealGlucose(body: Record<string, unknown>) {
    return this.request('/glucose/predict-meal', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getDexcomIntegrationStatus() {
    return this.request('/integrations/dexcom');
  }

  async importDexcomReadings(glucose_readings_mg_dl: number[]) {
    return this.request('/integrations/dexcom/import-readings', {
      method: 'POST',
      body: JSON.stringify({ glucose_readings_mg_dl }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Initialize API client with environment config
environmentConfig.initialize().then(() => {
  apiClient.setBaseUrl(environmentConfig.getApiBaseUrl());
});
