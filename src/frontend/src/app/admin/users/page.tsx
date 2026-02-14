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

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';

export default function AdminUsersPage() {
  const { isAuthenticated } = useAdminAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', name: '', password: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const api = getAPIClient();
      const result = await api.listUsers();
      setUsers(result as UserRecord[]);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch(`${POCKETBASE_URL}/api/collections/users/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          passwordConfirm: createForm.password,
          name: createForm.name || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.message || `Failed to create user (${response.status})`;
        throw new Error(message);
      }

      setCreateForm({ email: '', name: '', password: '' });
      setShowCreateModal(false);
      await fetchUsers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
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
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No users found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

                return (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 flex items-center gap-4"
                  >
                    {/* Avatar initial */}
                    <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">{initial}</span>
                    </div>

                    {/* Name & email */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {user.name || 'Unnamed User'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-500 truncate">{user.email}</span>
                      </div>
                    </div>

                    {/* Role badge */}
                    {user.role && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex-shrink-0">
                        {user.role}
                      </span>
                    )}

                    {/* ID */}
                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                      {user.id}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setCreateError(null);
          setCreateForm({ email: '', name: '', password: '' });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new user account in PocketBase
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {createError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateError(null);
                setCreateForm({ email: '', name: '', password: '' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={!createForm.email.trim() || !createForm.password.trim() || isCreating}
              className="gap-2"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
