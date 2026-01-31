'use client';

import React from 'react';
import { Settings, User, Zap, Users } from 'lucide-react';
import { useFrameStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAIConfig: () => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  onOpenAIConfig,
}: SettingsModalProps) {
  const { currentUser, aiConfig } = useFrameStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Profile Section */}
          <SettingsSection icon={User} title="Profile">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Name
                </label>
                <Input value={currentUser.name} disabled className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Email
                </label>
                <Input value={currentUser.email} disabled className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Role
                </label>
                <Input
                  value={currentUser.role.replace('_', ' ')}
                  disabled
                  className="mt-1 capitalize"
                />
              </div>
            </div>
          </SettingsSection>

          {/* AI Configuration Section */}
          <SettingsSection icon={Zap} title="AI Configuration">
            <div className="space-y-3">
              {aiConfig ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div>
                      <div className="text-sm font-medium text-emerald-700">
                        Connected
                      </div>
                      <div className="text-xs text-emerald-600">
                        {aiConfig.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenAIConfig();
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">
                    Connect an AI provider to enable AI-assisted features.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenAIConfig();
                    }}
                  >
                    Configure AI
                  </Button>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Team Section */}
          <SettingsSection icon={Users} title="Team">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-sm font-medium text-slate-700">
                Platform Engineering
              </div>
              <div className="text-xs text-slate-500 mt-1">
                4 members
              </div>
            </div>
          </SettingsSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SettingsSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, children }: SettingsSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}
