/**
 * PocketBase Admin Authentication Service
 *
 * Handles admin authentication with PocketBase backend.
 * Uses the /api/collections/_superusers/auth-with-password endpoint (PB v0.23+).
 */

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';
const AUTH_STORAGE_KEY = 'framer-admin-auth';
const AUTH_COOKIE_NAME = 'framer-admin-auth';

// Admin auth state interface
export interface AdminAuthState {
  token: string;
  admin: {
    id: string;
    email: string;
  };
}

// Admin auth error class
export class AdminAuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_credentials' | 'expired' | 'network' | 'unknown'
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

/**
 * PocketBase Admin Auth Service
 */
export class PocketBaseAdminAuth {
  private pocketbaseURL: string;
  private authState: AdminAuthState | null = null;

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
        // Set cookie for SSR middleware (7 day expiry), scoped to /admin
        document.cookie = `${AUTH_COOKIE_NAME}=${this.authState.token}; path=/admin; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        // Remove cookie
        document.cookie = `${AUTH_COOKIE_NAME}=; path=/admin; max-age=0`;
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Check if admin is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState !== null;
  }

  /**
   * Get current admin
   */
  getAdmin(): AdminAuthState['admin'] | null {
    return this.authState?.admin || null;
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
  async login(email: string, password: string): Promise<AdminAuthState['admin']> {
    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/collections/_superusers/auth-with-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        }
      );

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new AdminAuthError('Invalid email or password', 'invalid_credentials');
        }
        throw new AdminAuthError('Authentication failed', 'unknown');
      }

      const data = await response.json();

      this.authState = {
        token: data.token,
        admin: {
          id: data.record.id,
          email: data.record.email,
        },
      };

      this.saveToStorage();

      return this.authState.admin;
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      throw new AdminAuthError('Network error during login', 'network');
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.authState = null;
    this.saveToStorage();
  }

  /**
   * Refresh the auth token
   */
  async refresh(): Promise<boolean> {
    if (!this.authState?.token) return false;

    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/collections/_superusers/auth-refresh`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authState.token}`,
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
        admin: {
          id: data.record.id,
          email: data.record.email,
        },
      };

      this.saveToStorage();

      return true;
    } catch {
      this.logout();
      return false;
    }
  }
}

// Singleton instance
let adminAuthService: PocketBaseAdminAuth | null = null;

/**
 * Get the admin auth service singleton
 */
export function getAdminAuthService(): PocketBaseAdminAuth {
  if (!adminAuthService) {
    adminAuthService = new PocketBaseAdminAuth();
  }
  return adminAuthService;
}

/**
 * Reset the admin auth service (useful for testing)
 */
export function resetAdminAuthService(): void {
  adminAuthService = null;
}
