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
