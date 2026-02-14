'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFrameStore } from '@/store';
import { formatDate, truncate } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function ArchivePage() {
  const router = useRouter();
  const { frames, loadFrames, getArchivedFrames } = useFrameStore();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (frames.length === 0) {
      loadFrames();
    }
  }, [frames.length, loadFrames]);

  const archivedFrames = getArchivedFrames();
  const totalPages = Math.ceil(archivedFrames.length / PAGE_SIZE);
  const paginatedFrames = archivedFrames.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900">Archive</h1>
          <span className="text-sm text-slate-500">
            {archivedFrames.length} {archivedFrames.length === 1 ? 'frame' : 'frames'}
          </span>
        </div>

        {archivedFrames.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-4 rounded-full bg-slate-100 inline-flex mb-4">
              <Archive className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-medium text-slate-900 mb-2">No Archived Frames</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Frames will appear here after they have been completed and archived with feedback.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedFrames.map((frame) => (
              <Card
                key={frame.id}
                onClick={() => router.push(`/frame/${frame.id}`)}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={frame.type as 'bug' | 'feature' | 'exploration'}>
                        {frame.type.charAt(0).toUpperCase() + frame.type.slice(1)}
                      </Badge>
                      {frame.aiScore !== undefined && (
                        <span className="text-xs font-medium text-slate-500">
                          Score: {frame.aiScore}/100
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-slate-900">
                      {truncate(frame.problemStatement || 'Untitled Frame', 100)}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Archived on {formatDate(frame.updatedAt)}
                    </p>
                    {frame.feedback && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-600 uppercase mb-1">
                          Outcome: {frame.feedback.outcome}
                        </p>
                        <p className="text-sm text-slate-700">{frame.feedback.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, archivedFrames.length)} of {archivedFrames.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('dots');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === 'dots' ? (
                    <span key={`dots-${i}`} className="px-1 text-slate-400 text-sm">...</span>
                  ) : (
                    <Button
                      key={item}
                      variant={currentPage === item ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(item as number)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {item}
                    </Button>
                  )
                )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
