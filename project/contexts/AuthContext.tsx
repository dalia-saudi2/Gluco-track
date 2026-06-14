import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/authService';
import { environmentConfig } from '../config/environment';
import { apiClient } from '../config/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    blood_type?: string;
    address?: string;
    gender?: string;
    date_of_birth?: string;
  }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsAuthenticated(false);
      setUser(null);
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
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
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
    date_of_birth?: string;
  }) => {
    try {
      setIsLoading(true);
      await authService.register(userData);
      await authService.login(userData.email, userData.password);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error: unknown) {
      setIsAuthenticated(false);
      setUser(null);
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
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
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
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        setApiBaseUrl,
        getApiBaseUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

