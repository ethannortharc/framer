'use client';

import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanBoard } from './KanbanBoard';
import { useFrameStore } from '@/store';
import { useAuthContext } from '@/contexts/AuthContext';
import { FrameType } from '@/types';

interface DashboardProps {
  onFrameClick: (frameId: string) => void;
  onNewFrame: () => void;
}

export function Dashboard({ onFrameClick, onNewFrame }: DashboardProps) {
  const { frames } = useFrameStore();
  const { user } = useAuthContext();
  const [typeFilter, setTypeFilter] = useState<FrameType | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter to show only working frames (not archived)
  const workingFrames = frames.filter(f => f.status !== 'archived');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          {/* New Frame Button */}
          <Button onClick={onNewFrame} className="gap-2">
            <Plus className="h-4 w-4" />
            New Frame
          </Button>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as FrameType | 'all')}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="exploration">Exploration</SelectItem>
              </SelectContent>
            </Select>

            {/* Owner Filter */}
            <Select
              value={ownerFilter}
              onValueChange={setOwnerFilter}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {user && (
                  <SelectItem value={user.id}>
                    {user.name || user.email.split('@')[0]} (Me)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search frames..."
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard
          frames={workingFrames}
          typeFilter={typeFilter}
          ownerFilter={ownerFilter}
          searchQuery={searchQuery}
          onFrameClick={onFrameClick}
        />
      </div>
    </div>
  );
}
