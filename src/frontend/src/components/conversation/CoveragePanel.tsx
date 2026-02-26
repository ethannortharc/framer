'use client';

import React from 'react';
import { ConversationState } from '@/types';
import { cn } from '@/lib/utils';

interface CoveragePanelProps {
  state: ConversationState;
}

const allSections = [
  {
    key: 'problemStatement' as const,
    label: 'Problem Statement',
    description: 'Clear, solution-free problem definition',
    bugOnly: false,
  },
  {
    key: 'rootCause' as const,
    label: 'Root Cause',
    description: 'Technical root cause analysis',
    bugOnly: true,
  },
  {
    key: 'userPerspective' as const,
    label: 'User Perspective',
    description: 'Who is affected, journey, pain points',
    bugOnly: false,
  },
  {
    key: 'engineeringFraming' as const,
    label: 'Engineering Framing',
    description: 'Principles, trade-offs, non-goals',
    bugOnly: false,
  },
  {
    key: 'validationThinking' as const,
    label: 'Validation Thinking',
    description: 'Structured test cases, success criteria',
    bugOnly: false,
  },
];

export function CoveragePanel({ state }: CoveragePanelProps) {
  const isBug = state.frameType === 'bug';
  const sections = allSections.filter((s) => !s.bugOnly || isBug);
  const sectionCount = sections.length;

  const overallCoverage =
    sections.reduce((sum, s) => sum + (state.sectionsCovered[s.key] ?? 0), 0) / sectionCount;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Discussion Coverage
          </h3>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              overallCoverage >= 0.6
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            )}
          >
            {Math.round(overallCoverage * 100)}%
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mb-2">How much of each topic has been discussed</p>
        {/* Overall progress */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              overallCoverage >= 0.6 ? 'bg-emerald-500' : 'bg-violet-500'
            )}
            style={{ width: `${Math.round(overallCoverage * 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const value = state.sectionsCovered[section.key] ?? 0;
          const pct = Math.round(value * 100);

          return (
            <div key={section.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">
                  {section.label}
                </span>
                <span className="text-xs text-slate-500">{pct}%</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    value >= 0.6
                      ? 'bg-emerald-400'
                      : value > 0
                        ? 'bg-violet-400'
                        : 'bg-slate-200'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {section.description}
              </p>
            </div>
          );
        })}
      </div>

      {state.gaps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Gaps
          </h4>
          <ul className="space-y-1">
            {state.gaps.map((gap, i) => (
              <li key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.frameType && (
        <div className="text-xs text-slate-500">
          Detected type:{' '}
          <span className="font-medium text-slate-700 capitalize">
            {state.frameType}
          </span>
        </div>
      )}
    </div>
  );
}
