'use client';

import React from 'react';
import { Briefcase, FileText, Archive, Settings } from 'lucide-react';
import { AppSpace } from '@/types';
import { useFrameStore } from '@/store';
import { cn } from '@/lib/utils';

interface LeftNavProps {
  onSettingsClick: () => void;
}

const navItems: { id: AppSpace; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: 'working',
    label: 'Working Space',
    icon: Briefcase,
    description: 'Active frames',
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: FileText,
    description: 'Frame templates',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    description: 'Completed frames',
  },
];

export function LeftNav({ onSettingsClick }: LeftNavProps) {
  const { currentSpace, setCurrentSpace, getWorkingFrames, getArchivedFrames } = useFrameStore();

  const workingCount = getWorkingFrames().length;
  const archiveCount = getArchivedFrames().length;

  const getCounts = (id: AppSpace) => {
    switch (id) {
      case 'working':
        return workingCount;
      case 'archive':
        return archiveCount;
      default:
        return null;
    }
  };

  return (
    <div className="w-56 h-full bg-slate-900 text-slate-300 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white tracking-tight">
          Framer
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Pre-dev thinking framework
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="px-3 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Spaces
          </span>
        </div>
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSpace === item.id;
            const count = getCounts(item.id);

            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentSpace(item.id)}
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
                  <span className="flex-1 text-left text-sm font-medium">
                    {item.label}
                  </span>
                  {count !== null && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isActive
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-800 text-slate-500'
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Settings className="h-4.5 w-4.5 text-slate-500" />
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
