'use client';

import React from 'react';
import { Frame, FrameStatus, FrameType } from '@/types';
import { FrameCard } from './FrameCard';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface KanbanColumn {
  status: FrameStatus;
  title: string;
  bgColor?: string;
}

const columns: KanbanColumn[] = [
  { status: 'draft', title: 'Draft' },
  { status: 'in_review', title: 'In Review' },
  { status: 'ready', title: 'Ready' },
  { status: 'feedback', title: 'Feedback', bgColor: 'bg-violet-50/70' },
];

interface KanbanBoardProps {
  frames: Frame[];
  typeFilter: FrameType | 'all';
  ownerFilter: string;
  searchQuery: string;
  onFrameClick: (frameId: string) => void;
}

export function KanbanBoard({
  frames,
  typeFilter,
  ownerFilter,
  searchQuery,
  onFrameClick,
}: KanbanBoardProps) {
  const { user } = useAuthContext();

  // Filter frames
  const filteredFrames = frames.filter((frame) => {
    if (typeFilter !== 'all' && frame.type !== typeFilter) return false;
    if (ownerFilter !== 'all' && frame.ownerId !== ownerFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = frame.problemStatement.toLowerCase().includes(query);
      if (!matchesTitle) return false;
    }
    return true;
  });

  // Group by status
  const framesByStatus = columns.reduce((acc, col) => {
    acc[col.status] = filteredFrames.filter((f) => f.status === col.status);
    return acc;
  }, {} as Record<FrameStatus, Frame[]>);

  // Get owner info - in production, this would come from an API
  const getOwnerInfo = (ownerId: string) => {
    // If the owner is the current user, use their info
    if (user && ownerId === user.id) {
      return {
        name: user.name || user.email.split('@')[0],
        initials: user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase(),
      };
    }
    // For other users, we'd need to fetch from API - for now use placeholder
    return {
      name: 'Team Member',
      initials: 'TM',
    };
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {columns.map((column) => (
        <KanbanColumnComponent
          key={column.status}
          column={column}
          frames={framesByStatus[column.status]}
          getOwnerInfo={getOwnerInfo}
          onFrameClick={onFrameClick}
        />
      ))}
    </div>
  );
}

interface KanbanColumnComponentProps {
  column: KanbanColumn;
  frames: Frame[];
  getOwnerInfo: (ownerId: string) => { name: string; initials: string };
  onFrameClick: (frameId: string) => void;
}

function KanbanColumnComponent({ column, frames, getOwnerInfo, onFrameClick }: KanbanColumnComponentProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 rounded-xl p-3',
        column.bgColor || 'bg-slate-100/50'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">
            {column.title}
          </h3>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              column.status === 'feedback'
                ? 'bg-violet-200 text-violet-800'
                : 'bg-slate-200 text-slate-600'
            )}
          >
            {frames.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {frames.map((frame) => {
          const ownerInfo = getOwnerInfo(frame.ownerId);
          return (
            <FrameCard
              key={frame.id}
              frame={frame}
              ownerName={ownerInfo.name}
              ownerInitials={ownerInfo.initials}
              onClick={() => onFrameClick(frame.id)}
            />
          );
        })}

        {frames.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">
            No frames
          </div>
        )}
      </div>
    </div>
  );
}
