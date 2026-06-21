import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { authService, User } from '../services/authService';
import { environmentConfig } from '../config/environment';
import { apiClient } from '../config/api';
import type { OnboardingProgress } from '../utils/labOnboarding';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingProgress: OnboardingProgress | null;
  onboardingProgressLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
    address?: string;
    gender?: string;
    age?: number;
    height_cm?: number;
    weight_kg?: number;
    date_of_birth?: string;
  }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshOnboardingProgress: () => Promise<void>;
  getOnboardingProgressForRouting: () => OnboardingProgress | null;
  setApiBaseUrl: (url: string) => Promise<void>;
  getApiBaseUrl: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const [onboardingProgressLoading, setOnboardingProgressLoading] = useState(false);
  const onboardingProgressRef = useRef<OnboardingProgress | null>(null);

  const applyOnboardingProgress = useCallback((progress: OnboardingProgress | null) => {
    onboardingProgressRef.current = progress;
    setOnboardingProgress(progress);
  }, []);

  const getOnboardingProgressForRouting = useCallback(
    () => onboardingProgressRef.current ?? onboardingProgress,
    [onboardingProgress]
  );

  const loadOnboardingProgress = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      applyOnboardingProgress(null);
      return null;
    }
    setOnboardingProgressLoading(true);
    try {
      const progress = await apiClient.getOnboardingProgress();
      applyOnboardingProgress(progress);
      return progress;
    } catch {
      applyOnboardingProgress(null);
      return null;
    } finally {
      setOnboardingProgressLoading(false);
    }
  }, [applyOnboardingProgress]);

  const refreshOnboardingProgress = useCallback(async () => {
    await loadOnboardingProgress(user);
  }, [loadOnboardingProgress, user]);

  // Initialize auth state on mount
  useEffect(() => {
    apiClient.setOnSessionExpired(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Initialize environment config
      await environmentConfig.initialize();
      apiClient.setBaseUrl(environmentConfig.getApiBaseUrl());

      // Check if user is authenticated
      const currentUser = await authService.initializeAuth();

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        await loadOnboardingProgress(currentUser);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        applyOnboardingProgress(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsAuthenticated(false);
      setUser(null);
      applyOnboardingProgress(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await authService.login(email, password);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      await loadOnboardingProgress(currentUser);
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      applyOnboardingProgress(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
    address?: string;
    gender?: string;
    age?: number;
    height_cm?: number;
    weight_kg?: number;
    date_of_birth?: string;
  }) => {
    try {
      setIsLoading(true);
      await authService.register(userData);
      await authService.login(userData.email, userData.password);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      await loadOnboardingProgress(currentUser);
    } catch (error: unknown) {
      setIsAuthenticated(false);
      setUser(null);
      applyOnboardingProgress(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      setIsLoading(true);
      await authService.loginWithGoogle(idToken);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
      await loadOnboardingProgress(currentUser);
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      applyOnboardingProgress(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      applyOnboardingProgress(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
      applyOnboardingProgress(null);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      await loadOnboardingProgress(currentUser);
    } catch (error: any) {
      console.error('Refresh user error:', error);
      // If refresh fails (especially 401), user is logged out
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized') || error?.message?.includes('Session expired')) {
        await logout();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    }
  };

  const setApiBaseUrl = async (url: string) => {
    await environmentConfig.setApiBaseUrl(url);
    apiClient.setBaseUrl(url);
  };

  const getApiBaseUrl = () => {
    return environmentConfig.getApiBaseUrl();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        onboardingProgress,
        onboardingProgressLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        refreshOnboardingProgress,
        getOnboardingProgressForRouting,
        setApiBaseUrl,
        getApiBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

