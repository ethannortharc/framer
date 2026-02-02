'use client';

import React from 'react';
import { Settings, Frame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
  onSettingsClick: () => void;
}

export function AppShell({ children, onSettingsClick }: AppShellProps) {
  const { user } = useAuthContext();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between h-full px-6">
          {/* Logo & Team */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-900">
                <Frame className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-slate-900">
                Framer
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <span className="text-sm text-slate-600">
              Team: <span className="font-medium text-slate-900">Platform Engineering</span>
            </span>
          </div>

          {/* User & Settings */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50">
              <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {getUserInitials()}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-700">
                {getDisplayName()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="text-slate-500 hover:text-slate-700"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
