'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

// Routes managed by their own auth context
const isExcludedRoute = (path: string) => path.startsWith('/admin');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuthService();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthState['user'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage and handle routing
  useEffect(() => {
    const initAuth = async () => {
      const currentUser = auth.getUser();

      if (isExcludedRoute(pathname)) {
        // Skip user auth for admin routes (they have their own auth)
        setIsLoading(false);
        return;
      }

      if (currentUser) {
        // Try to refresh token if we have one
        const success = await auth.refresh();
        if (success) {
          setUser(auth.getUser());
        } else {
          setUser(null);
          // Redirect to login if on protected route
          if (!PUBLIC_ROUTES.includes(pathname)) {
            router.replace('/login');
          }
        }
      } else {
        // No user - redirect to login if on protected route
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.replace('/login');
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Handle route protection when pathname changes
  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublicRoute && !isExcludedRoute(pathname)) {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [pathname, user, isLoading, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await auth.login(email, password);
      setUser(loggedInUser);
      setIsLoading(false);
      router.replace('/dashboard');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  }, [auth, router]);

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
      router.replace('/dashboard');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
      return false;
    }
  }, [auth, router]);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
    router.replace('/login');
  }, [auth, router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
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
