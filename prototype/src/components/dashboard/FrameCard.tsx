'use client';

import React from 'react';
import { Frame, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { truncate, getScoreColor } from '@/lib/utils';

interface FrameCardProps {
  frame: Frame;
  owner: User | undefined;
  reviewer: User | undefined;
  approver: User | undefined;
  onClick: () => void;
}

export function FrameCard({ frame, owner, reviewer, approver, onClick }: FrameCardProps) {
  const typeLabel = frame.type.charAt(0).toUpperCase() + frame.type.slice(1);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
    >
      <div className="p-4 space-y-3">
        {/* Type Badge */}
        <Badge variant={frame.type as 'bug' | 'feature' | 'exploration'}>
          {typeLabel}
        </Badge>

        {/* Title/Problem Statement */}
        <h3 className="text-sm font-medium text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">
          {truncate(frame.problemStatement || 'Untitled Frame', 80)}
        </h3>

        {/* Footer: Owner, Reviewer, Approver & Score */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5" title={`Owner: ${owner?.name || 'Unknown'}`}>
              <Avatar
                initials={owner?.avatar || owner?.name.slice(0, 2).toUpperCase() || '??'}
                size="sm"
              />
            </div>
            {reviewer && (
              <div className="flex items-center gap-0.5" title={`Reviewer: ${reviewer.name}`}>
                <span className="text-[10px] text-slate-400">R:</span>
                <Avatar
                  initials={reviewer.avatar || reviewer.name.slice(0, 2).toUpperCase()}
                  size="sm"
                />
              </div>
            )}
            {approver && (
              <div className="flex items-center gap-0.5" title={`Approver: ${approver.name}`}>
                <span className="text-[10px] text-slate-400">A:</span>
                <Avatar
                  initials={approver.avatar || approver.name.slice(0, 2).toUpperCase()}
                  size="sm"
                />
              </div>
            )}
          </div>
          <ScoreIndicator score={frame.aiScore} />
        </div>
      </div>
    </Card>
  );
}

function ScoreIndicator({ score }: { score?: number }) {
  if (score === undefined) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <span className="text-[10px] text-slate-400">--</span>
        </div>
      </div>
    );
  }

  const bgColor =
    score >= 80
      ? 'bg-emerald-100 border-emerald-200'
      : score >= 60
      ? 'bg-amber-100 border-amber-200'
      : 'bg-red-100 border-red-200';

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-6 w-6 rounded-full border flex items-center justify-center ${bgColor}`}
      >
        <span className={`text-[10px] font-semibold ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
    </div>
  );
}
