'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Briefcase, Archive, Settings, LogOut, Brain, ChevronDown, FolderKanban } from 'lucide-react';
import { AppSpace } from '@/types';
import { useFrameStore } from '@/store';
import { useProjectStore } from '@/store/projectStore';
import { useAuthContext } from '@/contexts/AuthContext';
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
    id: 'knowledge',
    label: 'Knowledge',
    icon: Brain,
    description: 'Team learnings',
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    description: 'Completed frames',
  },
];

export function LeftNav({ onSettingsClick }: LeftNavProps) {
  const { currentSpace, setCurrentSpace, getWorkingFrames, getArchivedFrames, loadFrames } = useFrameStore();
  const { projects, currentProjectId, setCurrentProject } = useProjectStore();
  const { user, logout } = useAuthContext();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const workingCount = getWorkingFrames().length;
  const archiveCount = getArchivedFrames().length;

  const currentProject = projects.find((p) => p.id === currentProjectId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProjectSwitch = (projectId: string) => {
    setCurrentProject(projectId);
    setProjectDropdownOpen(false);
    // Trigger data reload
    loadFrames();
  };

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

      {/* Project Switcher */}
      {projects.length > 0 && (
        <div className="px-3 pt-3 pb-2 border-b border-slate-700" ref={dropdownRef}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-1.5 block">
            Project
          </span>
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white text-sm transition-colors"
          >
            <FolderKanban className="h-4 w-4 text-violet-400 flex-shrink-0" />
            <span className="flex-1 text-left truncate">
              {currentProject?.name || 'No project'}
            </span>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 text-slate-400 transition-transform',
              projectDropdownOpen && 'rotate-180'
            )} />
          </button>
          {projectDropdownOpen && (
            <div className="mt-1 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shadow-lg">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleProjectSwitch(project.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    project.id === currentProjectId
                      ? 'bg-violet-600/20 text-violet-300'
                      : 'text-slate-300 hover:bg-slate-700'
                  )}
                >
                  <FolderKanban className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* User & Settings */}
      <div className="border-t border-slate-700">
        {/* User Section - Always shown since auth is required */}
        <div className="p-3 border-b border-slate-700">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user.email}
                </p>
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
        </div>

        {/* Settings Button */}
        <div className="p-3">
          <button
            onClick={onSettingsClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Settings className="h-4.5 w-4.5 text-slate-500" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
