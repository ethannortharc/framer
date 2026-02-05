'use client';

import React, { useEffect } from 'react';
import { useFrameStore } from '@/store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export function UsersListView() {
  const { teamUsers, loadUsers, useAPI, isLoading } = useFrameStore();

  useEffect(() => {
    if (useAPI) {
      loadUsers();
    }
  }, [useAPI, loadUsers]);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'tech_lead': return 'Tech Lead';
      case 'senior_engineer': return 'Senior Engineer';
      case 'engineer': return 'Engineer';
      case 'manager': return 'Manager';
      default: return role;
    }
  };

  if (!useAPI) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-700">Users</p>
          <p className="text-sm mt-1">Enable API mode to view team members</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <span className="text-sm text-slate-500">Loading users...</span>
      </div>
    );
  }

  if (teamUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500">
          <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium text-slate-700">No Users Found</p>
          <p className="text-sm mt-1">Add users through the admin page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <span className="text-sm text-slate-400">({teamUsers.length})</span>
        </div>

        <div className="space-y-2">
          {teamUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Avatar
                initials={user.avatar || user.name.slice(0, 2).toUpperCase()}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <Badge variant="outline">
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
