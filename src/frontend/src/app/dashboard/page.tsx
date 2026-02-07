'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeftNav } from '@/components/layout/LeftNav';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useFrameStore } from '@/store';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { loadFrames, isLoading, currentSpace, getArchivedFrames } = useFrameStore();
  const [showSettings, setShowSettings] = useState(false);

  // Load frames on mount
  useEffect(() => {
    loadFrames();
  }, [loadFrames]);

  // Redirect to knowledge page when that space is selected
  useEffect(() => {
    if (currentSpace === 'knowledge') {
      router.push('/knowledge');
    }
  }, [currentSpace, router]);

  const handleFrameClick = (frameId: string) => {
    router.push(`/frame/${frameId}`);
  };

  const handleNewFrame = () => {
    router.push('/new');
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
