/**
 * PocketBase Authentication Service
 *
 * Handles user authentication with PocketBase backend.
 */

import { getAPIClient } from './client';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';
const AUTH_STORAGE_KEY = 'framer-auth';
const AUTH_COOKIE_NAME = 'framer-auth';

// Auth state interface
export interface AuthState {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    verified: boolean;
  };
}

// Auth error class
export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_credentials' | 'expired' | 'network' | 'unknown'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * PocketBase Auth Service
 */
export class PocketBaseAuth {
  private pocketbaseURL: string;
  private authState: AuthState | null = null;

  constructor(pocketbaseURL: string = POCKETBASE_URL) {
    this.pocketbaseURL = pocketbaseURL;
    this.loadFromStorage();
  }

  /**
   * Load auth state from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        this.authState = JSON.parse(stored);
        // Update API client with token
        if (this.authState?.token) {
          getAPIClient().setToken(this.authState.token);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save auth state to localStorage and cookie
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      if (this.authState) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.authState));
        // Set cookie for SSR middleware (7 day expiry)
        document.cookie = `${AUTH_COOKIE_NAME}=${this.authState.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        // Remove cookie
        document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState !== null;
  }

  /**
   * Get current user
   */
  getUser(): AuthState['user'] | null {
    return this.authState?.user || null;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.authState?.token || null;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthState['user']> {
    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/collections/users/auth-with-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        }
      );

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new AuthError('Invalid email or password', 'invalid_credentials');
        }
        throw new AuthError('Authentication failed', 'unknown');
      }

      const data = await response.json();

      this.authState = {
        token: data.token,
        user: {
          id: data.record.id,
          email: data.record.email,
          name: data.record.name,
          verified: data.record.verified,
        },
      };

      this.saveToStorage();
      getAPIClient().setToken(this.authState.token);

      return this.authState.user;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Network error during login', 'network');
    }
  }

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    passwordConfirm: string;
    name?: string;
  }): Promise<AuthState['user']> {
    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/collections/users/records`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new AuthError(errorData.message || 'Registration failed', 'unknown');
      }

      // Auto-login after registration
      return this.login(data.email, data.password);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('Network error during registration', 'network');
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.authState = null;
    this.saveToStorage();
    getAPIClient().setToken(null);
  }

  /**
   * Refresh the auth token
   */
  async refresh(): Promise<boolean> {
    if (!this.authState?.token) return false;

    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/collections/users/auth-refresh`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authState.token,
          },
        }
      );

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();

      this.authState = {
        token: data.token,
        user: {
          id: data.record.id,
          email: data.record.email,
          name: data.record.name,
          verified: data.record.verified,
        },
      };

      this.saveToStorage();
      getAPIClient().setToken(this.authState.token);

      return true;
    } catch {
      this.logout();
      return false;
    }
  }
}

// Singleton instance
let authService: PocketBaseAuth | null = null;

/**
 * Get the auth service singleton
 */
export function getAuthService(): PocketBaseAuth {
  if (!authService) {
    authService = new PocketBaseAuth();
  }
  return authService;
}

/**
 * Reset the auth service (useful for testing)
 */
export function resetAuthService(): void {
  authService = null;
}
