'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

interface KnowledgeCardsProps {
  items: Array<Record<string, unknown>>;
}

export function KnowledgeCards({ items }: KnowledgeCardsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Relevant Knowledge
      </h3>
      <div className="space-y-2">
        {items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex items-start gap-2">
              <BookOpen className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                {String(item.content || item.title || '')}
              </p>
            </div>
            {item.metadata != null && typeof item.metadata === 'object' ? (
              <div className="mt-1.5 flex gap-1">
                {(item.metadata as Record<string, string>).category ? (
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                    {String((item.metadata as Record<string, string>).category)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
