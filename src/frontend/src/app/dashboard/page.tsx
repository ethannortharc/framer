'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeftNav } from '@/components/layout/LeftNav';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useFrameStore } from '@/store';
import { useAuthContext } from '@/contexts/AuthContext';
import { FrameType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bug, Lightbulb, Compass, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { loadFrames, createFrame, isLoading, currentSpace, getArchivedFrames } = useFrameStore();
  const [showNewFrameModal, setShowNewFrameModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load frames on mount
  useEffect(() => {
    loadFrames();
  }, [loadFrames]);

  const handleFrameClick = (frameId: string) => {
    router.push(`/frame/${frameId}`);
  };

  const handleNewFrame = () => {
    setShowNewFrameModal(true);
  };

  const handleCreateFrame = async (type: FrameType) => {
    if (!user) return;

    setIsCreating(true);
    try {
      const frame = await createFrame(type, user.id);
      setShowNewFrameModal(false);
      router.push(`/frame/${frame.id}`);
    } catch (error) {
      console.error('Failed to create frame:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const archivedFrames = getArchivedFrames();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Navigation */}
      <LeftNav
        onSettingsClick={() => setShowSettings(true)}
      />

      {/* Main Content */}
      <div className="flex-1 pt-0">
        {currentSpace === 'working' && (
          <Dashboard
            onFrameClick={handleFrameClick}
            onNewFrame={handleNewFrame}
          />
        )}
        {currentSpace === 'archive' && (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">Archive</h1>
            {archivedFrames.length === 0 ? (
              <p className="text-slate-500">No archived frames yet.</p>
            ) : (
              <div className="space-y-4">
                {archivedFrames.map((frame) => (
                  <div
                    key={frame.id}
                    onClick={() => handleFrameClick(frame.id)}
                    className="p-4 bg-white rounded-lg border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-slate-900">
                      {frame.problemStatement || 'Untitled Frame'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Archived - {frame.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {currentSpace === 'templates' && (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">Templates</h1>
            <p className="text-slate-500">Templates coming soon.</p>
          </div>
        )}
      </div>

      {/* New Frame Modal */}
      <Dialog open={showNewFrameModal} onOpenChange={setShowNewFrameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Frame</DialogTitle>
            <DialogDescription>
              Choose the type of work you&apos;re framing
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto py-4 px-4 justify-start gap-4"
              onClick={() => handleCreateFrame('bug')}
              disabled={isCreating}
            >
              <div className="p-2 rounded-lg bg-rose-100">
                <Bug className="h-5 w-5 text-rose-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Bug Fix</div>
                <div className="text-xs text-slate-500">
                  Frame a bug investigation and fix
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 px-4 justify-start gap-4"
              onClick={() => handleCreateFrame('feature')}
              disabled={isCreating}
            >
              <div className="p-2 rounded-lg bg-emerald-100">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Feature</div>
                <div className="text-xs text-slate-500">
                  Frame a new feature or enhancement
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 px-4 justify-start gap-4"
              onClick={() => handleCreateFrame('exploration')}
              disabled={isCreating}
            >
              <div className="p-2 rounded-lg bg-blue-100">
                <Compass className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Exploration</div>
                <div className="text-xs text-slate-500">
                  Frame a technical investigation
                </div>
              </div>
            </Button>
          </div>

          {isCreating && (
            <div className="flex items-center justify-center gap-2 py-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating frame...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Modal (placeholder) */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your Framer preferences
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-slate-500">
            Settings panel coming soon. Backend API is connected.
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        </div>
      )}
    </div>
  );
}
