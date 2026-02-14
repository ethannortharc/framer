'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminAuthService, type AdminAuthState } from '@/lib/api/adminAuth';

interface AdminAuthContextValue {
  admin: AdminAuthState['admin'] | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAdminAuthService();
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminAuthState['admin'] | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage and handle routing
  useEffect(() => {
    const initAuth = async () => {
      const currentAdmin = auth.getAdmin();

      if (currentAdmin) {
        // Try to refresh token if we have one
        const success = await auth.refresh();
        if (success) {
          setAdmin(auth.getAdmin());
          setToken(auth.getToken());
        } else {
          setAdmin(null);
          setToken(null);
          // Redirect to admin login if on protected admin route
          if (pathname !== '/admin') {
            router.replace('/admin');
          }
        }
      } else {
        // No admin - redirect to admin login if on protected admin route
        if (pathname !== '/admin') {
          router.replace('/admin');
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Handle route protection when pathname changes
  useEffect(() => {
    if (isLoading) return;

    if (!admin && pathname !== '/admin') {
      router.replace('/admin');
    } else if (admin && pathname === '/admin') {
      router.replace('/admin/projects');
    }
  }, [pathname, admin, isLoading, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInAdmin = await auth.login(email, password);
      setAdmin(loggedInAdmin);
      setToken(auth.getToken());
      setIsLoading(false);
      router.replace('/admin/projects');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  }, [auth, router]);

  const logout = useCallback(() => {
    auth.logout();
    setAdmin(null);
    setToken(null);
    router.replace('/admin');
  }, [auth, router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: admin !== null,
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
