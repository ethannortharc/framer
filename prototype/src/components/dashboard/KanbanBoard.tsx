'use client';

import React from 'react';
import { Frame, FrameStatus, FrameType } from '@/types';
import { FrameCard } from './FrameCard';
import { useFrameStore } from '@/store';
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
  typeFilter: FrameType | 'all';
  ownerFilter: string;
  searchQuery: string;
  onFrameClick: (frameId: string) => void;
}

export function KanbanBoard({
  typeFilter,
  ownerFilter,
  searchQuery,
  onFrameClick,
}: KanbanBoardProps) {
  const { frames, getUser } = useFrameStore();

  // Filter frames
  const filteredFrames = frames.filter((frame) => {
    if (typeFilter !== 'all' && frame.type !== typeFilter) return false;
    if (ownerFilter !== 'all' && frame.ownerId !== ownerFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = frame.problemStatement.toLowerCase().includes(query);
      const owner = getUser(frame.ownerId);
      const matchesOwner = owner?.name.toLowerCase().includes(query);
      if (!matchesTitle && !matchesOwner) return false;
    }
    return true;
  });

  // Group by status
  const framesByStatus = columns.reduce((acc, col) => {
    acc[col.status] = filteredFrames.filter((f) => f.status === col.status);
    return acc;
  }, {} as Record<FrameStatus, Frame[]>);

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.status}
          column={column}
          frames={framesByStatus[column.status]}
          onFrameClick={onFrameClick}
        />
      ))}
    </div>
  );
}

interface KanbanColumnProps {
  column: KanbanColumn;
  frames: Frame[];
  onFrameClick: (frameId: string) => void;
}

function KanbanColumn({ column, frames, onFrameClick }: KanbanColumnProps) {
  const { getUser } = useFrameStore();

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
        {frames.map((frame) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            owner={getUser(frame.ownerId)}
            onClick={() => onFrameClick(frame.id)}
          />
        ))}

        {frames.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-400">
            No frames
          </div>
        )}
      </div>
    </div>
  );
}
