# Admin Portal Design

## Overview

Add a separate admin area at `/admin` with its own login using PocketBase superadmin credentials. The admin area includes project management, user management, and AI settings configuration.

## Architecture

### Separate Admin Auth

- Uses PocketBase's admin API (`/api/admins/auth-with-password`) — independent from regular user auth
- Admin token stored under `framer-admin-auth` (localStorage + cookie) so both sessions can coexist
- Separate `AdminAuthContext` wraps all `/admin/*` routes

### Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Admin login (unauthenticated) or redirect to `/admin/projects` (authenticated) |
| `/admin/projects` | Project management (existing page, wrapped in new layout) |
| `/admin/users` | User management — list, create, disable PocketBase users |
| `/admin/settings` | AI configuration — provider, model, endpoint, temperature, etc. |

### Frontend Components

1. **`AdminAuthContext`** — Context provider for admin auth state, login/logout, route protection
2. **`AdminLayout`** — Shared layout for `/admin/*` with sidebar nav (Projects, Users, Settings) and admin auth gate
3. **Admin login page** — `/admin/page.tsx`, PocketBase superadmin login form
4. **Users page** — `/admin/users/page.tsx`, CRUD for PocketBase users
5. **Settings page** — `/admin/settings/page.tsx`, AI config editor (reads/writes `config/ai.yaml`)

### Backend Changes

- `GET /api/admin/config` — Read current AI config (requires admin token)
- `PUT /api/admin/config` — Update AI config and write to `config/ai.yaml` (requires admin token)
- Admin token validation via PocketBase `/_/admins/auth-refresh` endpoint

### LeftNav Change

- Remove the "Admin" nav item from regular user LeftNav (admin is now a separate portal)

## Data Flow

```
Admin Login → PocketBase /api/admins/auth-with-password → token stored as framer-admin-auth
Admin Settings → GET /api/admin/config → backend reads ai.yaml → returns JSON
Admin Settings → PUT /api/admin/config → backend writes ai.yaml → reloads config
Admin Users → PocketBase /api/collections/users/records (via backend proxy or direct)
```

## Security

- Admin routes protected by AdminAuthContext (frontend) and admin token validation (backend)
- Regular users cannot access admin pages — separate auth chain
- AI config endpoint validates admin token before allowing reads/writes
