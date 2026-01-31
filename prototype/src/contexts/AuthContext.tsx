'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthService, type AuthState } from '@/lib/api';

interface AuthContextValue {
  user: AuthState['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    email: string;
    password: string;
    passwordConfirm: string;
    name?: string;
  }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuthService();
  const [user, setUser] = useState<AuthState['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state from storage
  useEffect(() => {
    const currentUser = auth.getUser();
    setUser(currentUser);
    setInitialized(true);

    // Try to refresh token if we have one
    if (currentUser) {
      auth.refresh().then((success) => {
        if (success) {
          setUser(auth.getUser());
        } else {
          setUser(null);
        }
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await auth.login(email, password);
      setUser(loggedInUser);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  }, [auth]);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    passwordConfirm: string;
    name?: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const registeredUser = await auth.register(data);
      setUser(registeredUser);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
      return false;
    }
  }, [auth]);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, [auth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Don't render children until we've initialized
  if (!initialized) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
