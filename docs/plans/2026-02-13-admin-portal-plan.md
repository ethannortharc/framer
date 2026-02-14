# Admin Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a separate admin portal at `/admin` with PocketBase superadmin login, project management, user management, and AI settings configuration.

**Architecture:** Separate admin auth flow using PocketBase's admin API (`/api/admins/auth-with-password`), independent from regular user auth. Admin token stored under `framer-admin-auth`. Backend gets new `/api/admin/config` endpoints for AI config CRUD. Frontend gets `AdminAuthContext`, admin layout with sidebar, and three admin pages (projects, users, settings).

**Tech Stack:** Next.js App Router, PocketBase admin API, FastAPI, Zustand (not needed — context only), Tailwind CSS, Lucide icons

---

### Task 1: Backend — Admin Config API

**Files:**
- Create: `src/backend/app/api/admin.py`
- Modify: `src/backend/app/main.py:79-104`

**Step 1: Create `src/backend/app/api/admin.py`**

This module provides GET/PUT endpoints for AI config, protected by PocketBase admin token validation.

```python
"""
Admin API endpoints.

Provides configuration management for administrators.
Admin authentication is validated via PocketBase admin token.
"""
import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field


POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://localhost:8090")


class AIConfigResponse(BaseModel):
    """Response model for AI configuration."""
    provider: str
    model: str
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    temperature: float
    max_tokens: int
    timeout: int
    ssl_verify: bool


class AIConfigUpdateRequest(BaseModel):
    """Request model for updating AI configuration."""
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    timeout: Optional[int] = Field(default=None, ge=1)
    ssl_verify: Optional[bool] = None


async def validate_admin_token(request: Request) -> None:
    """
    Validate that the request has a valid PocketBase admin token.

    Raises HTTPException 401 if invalid.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing admin token")

    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else auth_header

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{POCKETBASE_URL}/api/admins/auth-refresh",
                headers={"Authorization": token},
            )
            if response.status_code != 200:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
    except httpx.HTTPError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to validate admin token")


def create_admin_router() -> APIRouter:
    """Create the admin API router."""
    router = APIRouter()

    @router.get("/config", response_model=AIConfigResponse)
    async def get_config(request: Request) -> AIConfigResponse:
        """Get current AI configuration."""
        await validate_admin_token(request)

        from app.agents.config import get_ai_config
        config = get_ai_config()
        return AIConfigResponse(
            provider=config.provider,
            model=config.model,
            api_key=config.api_key,
            endpoint=config.endpoint,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            timeout=config.timeout,
            ssl_verify=config.ssl_verify,
        )

    @router.put("/config", response_model=AIConfigResponse)
    async def update_config(request: Request, body: AIConfigUpdateRequest) -> AIConfigResponse:
        """Update AI configuration. Writes to ai.yaml and reloads."""
        await validate_admin_token(request)

        import yaml
        from app.agents.config import get_ai_config, reload_ai_config

        # Read current config
        config_path = os.getenv("AI_CONFIG_PATH", "/config/ai.yaml")
        current = get_ai_config()

        # Merge updates
        updated = {
            "provider": body.provider if body.provider is not None else current.provider,
            "model": body.model if body.model is not None else current.model,
            "api_key": body.api_key if body.api_key is not None else current.api_key,
            "endpoint": body.endpoint if body.endpoint is not None else current.endpoint,
            "temperature": body.temperature if body.temperature is not None else current.temperature,
            "max_tokens": body.max_tokens if body.max_tokens is not None else current.max_tokens,
            "timeout": body.timeout if body.timeout is not None else current.timeout,
            "ssl_verify": body.ssl_verify if body.ssl_verify is not None else current.ssl_verify,
        }

        # Write to YAML file
        with open(config_path, "w") as f:
            yaml.dump(updated, f, default_flow_style=False, sort_keys=False)

        # Reload config singleton
        new_config = reload_ai_config()

        return AIConfigResponse(
            provider=new_config.provider,
            model=new_config.model,
            api_key=new_config.api_key,
            endpoint=new_config.endpoint,
            temperature=new_config.temperature,
            max_tokens=new_config.max_tokens,
            timeout=new_config.timeout,
            ssl_verify=new_config.ssl_verify,
        )

    return router
```

**Step 2: Register the admin router in `src/backend/app/main.py`**

Add import at top (after line 15):
```python
from app.api.admin import create_admin_router
```

Add router registration (after line 103, before `return app`):
```python
    app.include_router(
        create_admin_router(),
        prefix="/api/admin",
        tags=["admin"],
    )
```

**Step 3: Verify backend compiles**

Run: `cd src/backend && python3 -m py_compile app/api/admin.py && python3 -m py_compile app/main.py && echo "OK"`
Expected: `OK`

**Step 4: Commit**

```bash
git add src/backend/app/api/admin.py src/backend/app/main.py
git commit -m "feat: add admin config API with PocketBase admin token validation"
```

---

### Task 2: Frontend — Admin Auth Service

**Files:**
- Create: `src/frontend/src/lib/api/adminAuth.ts`
- Modify: `src/frontend/src/lib/api/index.ts`

**Step 1: Create `src/frontend/src/lib/api/adminAuth.ts`**

This mirrors `auth.ts` but targets PocketBase admin endpoints and uses a separate storage key.

```typescript
/**
 * PocketBase Admin Authentication Service
 *
 * Handles admin authentication with PocketBase's admin API.
 * Completely separate from user auth — uses different endpoints and storage keys.
 */

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';
const ADMIN_AUTH_STORAGE_KEY = 'framer-admin-auth';
const ADMIN_AUTH_COOKIE_NAME = 'framer-admin-auth';

export interface AdminAuthState {
  token: string;
  admin: {
    id: string;
    email: string;
  };
}

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_credentials' | 'expired' | 'network' | 'unknown'
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export class PocketBaseAdminAuth {
  private pocketbaseURL: string;
  private authState: AdminAuthState | null = null;

  constructor(pocketbaseURL: string = POCKETBASE_URL) {
    this.pocketbaseURL = pocketbaseURL;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      if (stored) {
        this.authState = JSON.parse(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      if (this.authState) {
        localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(this.authState));
        document.cookie = `${ADMIN_AUTH_COOKIE_NAME}=${this.authState.token}; path=/admin; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      } else {
        localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        document.cookie = `${ADMIN_AUTH_COOKIE_NAME}=; path=/admin; max-age=0`;
      }
    } catch {
      // Ignore storage errors
    }
  }

  isAuthenticated(): boolean {
    return this.authState !== null;
  }

  getAdmin(): AdminAuthState['admin'] | null {
    return this.authState?.admin || null;
  }

  getToken(): string | null {
    return this.authState?.token || null;
  }

  async login(email: string, password: string): Promise<AdminAuthState['admin']> {
    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/admins/auth-with-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: email, password }),
        }
      );

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          throw new AdminAuthError('Invalid admin credentials', 'invalid_credentials');
        }
        throw new AdminAuthError('Admin authentication failed', 'unknown');
      }

      const data = await response.json();

      this.authState = {
        token: data.token,
        admin: {
          id: data.admin.id,
          email: data.admin.email,
        },
      };

      this.saveToStorage();
      return this.authState.admin;
    } catch (error) {
      if (error instanceof AdminAuthError) throw error;
      throw new AdminAuthError('Network error during admin login', 'network');
    }
  }

  logout(): void {
    this.authState = null;
    this.saveToStorage();
  }

  async refresh(): Promise<boolean> {
    if (!this.authState?.token) return false;
    try {
      const response = await fetch(
        `${this.pocketbaseURL}/api/admins/auth-refresh`,
        {
          method: 'POST',
          headers: { Authorization: this.authState.token },
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
          id: data.admin.id,
          email: data.admin.email,
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

let adminAuthService: PocketBaseAdminAuth | null = null;

export function getAdminAuthService(): PocketBaseAdminAuth {
  if (!adminAuthService) {
    adminAuthService = new PocketBaseAdminAuth();
  }
  return adminAuthService;
}
```

**Step 2: Export from `src/frontend/src/lib/api/index.ts`**

Add line:
```typescript
export * from './adminAuth';
```

**Step 3: Verify**

Run: `cd src/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/frontend/src/lib/api/adminAuth.ts src/frontend/src/lib/api/index.ts
git commit -m "feat: add PocketBase admin auth service with separate token storage"
```

---

### Task 3: Frontend — Admin Auth Context

**Files:**
- Create: `src/frontend/src/contexts/AdminAuthContext.tsx`

**Step 1: Create `src/frontend/src/contexts/AdminAuthContext.tsx`**

Mirrors `AuthContext.tsx` but uses `PocketBaseAdminAuth`, protects `/admin/*` routes, and redirects to `/admin` login when unauthenticated.

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminAuthService, type AdminAuthState } from '@/lib/api/adminAuth';

interface AdminAuthContextValue {
  admin: AdminAuthState['admin'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  token: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAdminAuthService();
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminAuthState['admin'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const currentAdmin = auth.getAdmin();

      if (currentAdmin) {
        const success = await auth.refresh();
        if (success) {
          setAdmin(auth.getAdmin());
        } else {
          setAdmin(null);
          if (pathname !== '/admin') {
            router.replace('/admin');
          }
        }
      } else {
        if (pathname !== '/admin') {
          router.replace('/admin');
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!admin && pathname !== '/admin') {
      router.replace('/admin');
    }
  }, [pathname, admin, isLoading, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInAdmin = await auth.login(email, password);
      setAdmin(loggedInAdmin);
      setIsLoading(false);
      router.replace('/admin/projects');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin login failed');
      setIsLoading(false);
      return false;
    }
  }, [auth, router]);

  const logout = useCallback(() => {
    auth.logout();
    setAdmin(null);
    router.replace('/admin');
  }, [auth, router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: admin !== null,
        isLoading,
        error,
        login,
        logout,
        clearError,
        token: auth.getToken(),
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
```

**Step 2: Verify**

Run: `cd src/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/frontend/src/contexts/AdminAuthContext.tsx
git commit -m "feat: add AdminAuthContext with PocketBase admin login and route protection"
```

---

### Task 4: Frontend — Admin Layout & Login Page

**Files:**
- Create: `src/frontend/src/app/admin/layout.tsx`
- Modify: `src/frontend/src/app/admin/projects/page.tsx` (remove LeftNav, use admin layout)
- Create: `src/frontend/src/app/admin/page.tsx` (replace existing? — currently no admin/page.tsx)

**Step 1: Create `src/frontend/src/app/admin/layout.tsx`**

This wraps all `/admin/*` pages with AdminAuthProvider and an admin sidebar nav.

```typescript
'use client';

import React from 'react';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}
```

**Step 2: Create `src/frontend/src/app/admin/page.tsx`**

Admin login page — minimal, clean form.

```typescript
'use client';

import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminLoginPage() {
  const { login, error, clearError, isLoading, isAuthenticated } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If already authenticated, the context will redirect to /admin/projects
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-violet-600">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl text-white">Admin Portal</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in with administrator credentials
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700"
              disabled={!email || !password || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Back to user login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Update middleware to allow `/admin` routes without regular user auth**

Modify `src/frontend/src/middleware.ts` — add `/admin` to public routes or skip admin routes from user auth:

Change the `PUBLIC_ROUTES` and add an admin route check:

In middleware.ts, replace:
```typescript
const PUBLIC_ROUTES = ['/login'];
```
with:
```typescript
const PUBLIC_ROUTES = ['/login'];
const ADMIN_ROUTES_PREFIX = '/admin';
```

And after the `isPublicRoute` line, add a check to skip admin routes (they have their own auth):
```typescript
  // Skip middleware for admin routes (they have their own auth context)
  if (pathname.startsWith(ADMIN_ROUTES_PREFIX)) {
    return NextResponse.next();
  }
```

**Step 4: Verify**

Run: `cd src/frontend && npm run build 2>&1 | tail -20`
Expected: Compiled successfully, `/admin` route visible in output

**Step 5: Commit**

```bash
git add src/frontend/src/app/admin/layout.tsx src/frontend/src/app/admin/page.tsx src/frontend/src/middleware.ts
git commit -m "feat: add admin login page, admin layout with auth provider, and middleware bypass"
```

---

### Task 5: Frontend — Admin Sidebar Navigation

**Files:**
- Create: `src/frontend/src/components/layout/AdminNav.tsx`

**Step 1: Create `src/frontend/src/components/layout/AdminNav.tsx`**

Sidebar navigation for admin pages with Projects, Users, Settings tabs and logout.

```typescript
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FolderKanban, Users, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { id: 'projects', label: 'Projects', icon: FolderKanban, href: '/admin/projects' },
  { id: 'users', label: 'Users', icon: Users, href: '/admin/users' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/admin/settings' },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuth();

  return (
    <div className="w-56 h-full bg-slate-900 text-slate-300 flex flex-col">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-bold text-white tracking-tight">Admin</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Framer Administration</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.id}>
                <button
                  onClick={() => router.push(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <Icon className={cn(
                    'h-4.5 w-4.5',
                    isActive ? 'text-violet-400' : 'text-slate-500'
                  )} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin info & logout */}
      <div className="border-t border-slate-700 p-3">
        {admin && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin.email}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        <a
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors text-sm"
        >
          Back to app
        </a>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd src/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/frontend/src/components/layout/AdminNav.tsx
git commit -m "feat: add AdminNav sidebar component for admin portal"
```

---

### Task 6: Frontend — Refactor Admin Projects Page

**Files:**
- Modify: `src/frontend/src/app/admin/projects/page.tsx`

**Step 1: Refactor the existing admin projects page**

The page currently imports `LeftNav` and manages its own space state. Refactor to:
- Remove `LeftNav` import and usage — replaced by `AdminNav` in the layout
- Remove `useFrameStore` currentSpace logic
- Remove the "redirect when navigating away" useEffect
- Add `AdminNav` directly
- Keep all project CRUD functionality

Key changes:
- Remove imports: `LeftNav`, `useFrameStore`
- Remove: `const { currentSpace, setCurrentSpace } = useFrameStore();`
- Remove: `useEffect` that sets `setCurrentSpace('admin')`
- Remove: `useEffect` that redirects when `currentSpace !== 'admin'`
- Replace `<LeftNav>` with `<AdminNav>`
- Add import: `AdminNav` from `@/components/layout/AdminNav`
- Remove the settings modal (admin settings will be its own page)
- Use `useAdminAuth` instead of `useAuthContext` for user context
- Load projects/teams on mount without needing user.id (admin sees all)

**Step 2: Verify**

Run: `cd src/frontend && npm run build 2>&1 | tail -20`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/frontend/src/app/admin/projects/page.tsx
git commit -m "refactor: admin projects page to use AdminNav and AdminAuthContext"
```

---

### Task 7: Frontend — Admin Users Page

**Files:**
- Create: `src/frontend/src/app/admin/users/page.tsx`

**Step 1: Create the users management page**

Lists all PocketBase users with ability to view details. Uses the existing `/api/users` backend endpoint.

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { AdminNav } from '@/components/layout/AdminNav';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { getAPIClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Users, UserPlus, Mail, Loader2 } from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}

export default function AdminUsersPage() {
  const { isAuthenticated } = useAdminAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '' });
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUsers = async () => {
      try {
        const api = getAPIClient();
        const data = await api.listUsers();
        setUsers(data);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [isAuthenticated]);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) return;
    setCreateError(null);
    try {
      const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            passwordConfirm: newUser.password,
            name: newUser.name || undefined,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to create user');
      }
      setNewUser({ email: '', name: '', password: '' });
      setShowCreateModal(false);
      // Refresh user list
      const api = getAPIClient();
      const data = await api.listUsers();
      setUsers(data);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminNav />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage user accounts
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          </div>

          {/* User List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No users found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-200 bg-white"
                >
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">
                      {(user.name?.[0] || user.email[0]).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </div>
                  {user.role && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {user.role}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">{user.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user account</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {createError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{createError}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name (optional)</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Password"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={!newUser.email || !newUser.password}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd src/frontend && npm run build 2>&1 | tail -20`
Expected: Compiled successfully, `/admin/users` in route list

**Step 3: Commit**

```bash
git add src/frontend/src/app/admin/users/page.tsx
git commit -m "feat: add admin users management page"
```

---

### Task 8: Frontend — Admin Settings Page (AI Config)

**Files:**
- Create: `src/frontend/src/app/admin/settings/page.tsx`

**Step 1: Create the settings page**

Reads and writes AI config via the backend `/api/admin/config` endpoints. Uses the admin token for auth.

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { AdminNav } from '@/components/layout/AdminNav';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Settings, Save, Loader2, RefreshCw, CheckCircle } from 'lucide-react';

interface AIConfig {
  provider: string;
  model: string;
  api_key: string | null;
  endpoint: string | null;
  temperature: number;
  max_tokens: number;
  timeout: number;
  ssl_verify: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function AdminSettingsPage() {
  const { isAuthenticated, token } = useAdminAuth();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchConfig = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load config');
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchConfig();
    }
  }, [isAuthenticated, token]);

  const handleSave = async () => {
    if (!config || !token) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to save config');
      const data = await response.json();
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminNav />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500 mt-1">AI provider configuration</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchConfig} disabled={isLoading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !config} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : config ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  AI Provider
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Provider</label>
                    <select
                      value={config.provider}
                      onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">API Key</label>
                  <input
                    type="password"
                    value={config.api_key || ''}
                    onChange={(e) => setConfig({ ...config, api_key: e.target.value || null })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Custom Endpoint (optional)</label>
                  <input
                    type="text"
                    value={config.endpoint || ''}
                    onChange={(e) => setConfig({ ...config, endpoint: e.target.value || null })}
                    placeholder="https://your-llm-endpoint.example.com/v1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Parameters
                </h2>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Temperature ({config.temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max Tokens</label>
                    <input
                      type="number"
                      value={config.max_tokens}
                      onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 4096 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      value={config.timeout}
                      onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) || 300 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.ssl_verify}
                      onChange={(e) => setConfig({ ...config, ssl_verify: e.target.checked })}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-700">SSL Certificate Verification</span>
                  </label>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `cd src/frontend && npm run build 2>&1 | tail -20`
Expected: Compiled successfully, `/admin/settings` in route list

**Step 3: Commit**

```bash
git add src/frontend/src/app/admin/settings/page.tsx
git commit -m "feat: add admin settings page with AI config editor"
```

---

### Task 9: Frontend — Clean Up LeftNav

**Files:**
- Modify: `src/frontend/src/components/layout/LeftNav.tsx`
- Modify: `src/frontend/src/types/index.ts`
- Modify: `src/frontend/src/app/dashboard/page.tsx`

**Step 1: Remove "Admin" from regular LeftNav**

In `src/frontend/src/components/layout/LeftNav.tsx`:
- Remove the `ShieldCheck` import from lucide-react
- Remove the admin nav item from the `navItems` array (lines 35-39)

In `src/frontend/src/types/index.ts`:
- Remove `'admin'` from the `AppSpace` type union

In `src/frontend/src/app/dashboard/page.tsx`:
- Remove the `currentSpace === 'admin'` redirect logic (lines 42-44)

**Step 2: Verify**

Run: `cd src/frontend && npm run build 2>&1 | tail -20`
Expected: Compiled successfully

**Step 3: Commit**

```bash
git add src/frontend/src/components/layout/LeftNav.tsx src/frontend/src/types/index.ts src/frontend/src/app/dashboard/page.tsx
git commit -m "refactor: remove admin from regular LeftNav, now a separate portal"
```

---

### Task 10: Build, Deploy, and Verify

**Step 1: Full frontend build**

Run: `cd src/frontend && npm run build`
Expected: All routes compile, 0 TypeScript errors. Route list should include:
- `/admin` (login)
- `/admin/projects`
- `/admin/users`
- `/admin/settings`

**Step 2: Backend compile check**

Run: `cd src/backend && python3 -m py_compile app/api/admin.py && python3 -m py_compile app/main.py && echo "OK"`
Expected: `OK`

**Step 3: Docker deploy**

Run: `docker compose --env-file config/.env.dev up -d --build backend frontend`
Expected: Both containers rebuild and start

**Step 4: Verify health**

Run: `docker ps --filter "name=framer" --format "table {{.Names}}\t{{.Status}}"`
Expected: All three containers Up (backend healthy)

**Step 5: Smoke test**

- `curl -s http://localhost:8000/api/admin/config` → should return 401 (no admin token)
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin` → should return 200
- `curl -s http://localhost:8000/api/users` → should return 200 with user list

**Step 6: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete admin portal with login, projects, users, and AI settings"
```

---

## Files Changed Summary

| File | Task | Action |
|------|------|--------|
| `src/backend/app/api/admin.py` | 1 | **Create**: Admin config API with token validation |
| `src/backend/app/main.py` | 1 | **Modify**: Register admin router |
| `src/frontend/src/lib/api/adminAuth.ts` | 2 | **Create**: PocketBase admin auth service |
| `src/frontend/src/lib/api/index.ts` | 2 | **Modify**: Export adminAuth |
| `src/frontend/src/contexts/AdminAuthContext.tsx` | 3 | **Create**: Admin auth context provider |
| `src/frontend/src/app/admin/layout.tsx` | 4 | **Create**: Admin layout with auth provider |
| `src/frontend/src/app/admin/page.tsx` | 4 | **Create**: Admin login page |
| `src/frontend/src/middleware.ts` | 4 | **Modify**: Skip admin routes from user auth |
| `src/frontend/src/components/layout/AdminNav.tsx` | 5 | **Create**: Admin sidebar navigation |
| `src/frontend/src/app/admin/projects/page.tsx` | 6 | **Modify**: Use AdminNav instead of LeftNav |
| `src/frontend/src/app/admin/users/page.tsx` | 7 | **Create**: User management page |
| `src/frontend/src/app/admin/settings/page.tsx` | 8 | **Create**: AI settings config page |
| `src/frontend/src/components/layout/LeftNav.tsx` | 9 | **Modify**: Remove admin nav item |
| `src/frontend/src/types/index.ts` | 9 | **Modify**: Remove admin from AppSpace |
| `src/frontend/src/app/dashboard/page.tsx` | 9 | **Modify**: Remove admin redirect |
