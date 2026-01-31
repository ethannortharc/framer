'use client';

import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AIConfig, AIProvider } from '@/types';
import { useFrameStore } from '@/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AIConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIConfigModal({ open, onOpenChange }: AIConfigModalProps) {
  const { aiConfig, setAIConfig } = useFrameStore();

  const [provider, setProvider] = useState<AIProvider>('anthropic');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.anthropic.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');

  // Load existing config when modal opens
  useEffect(() => {
    if (open && aiConfig) {
      setProvider(aiConfig.provider);
      setApiEndpoint(aiConfig.apiEndpoint);
      setApiKey(aiConfig.apiKey);
      setModel(aiConfig.model || '');
    }
  }, [open, aiConfig]);

  const defaultEndpoints: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setApiEndpoint(defaultEndpoints[newProvider]);
    setTestStatus('idle');
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');

    // Simulate API test
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For prototype, randomly succeed (80%) or fail (20%)
    if (apiKey && apiKey.length > 5) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
    }
  };

  const handleSave = () => {
    const config: AIConfig = {
      provider,
      apiEndpoint,
      apiKey,
      model: model || undefined,
    };
    setAIConfig(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-600" />
            Configure AI Provider
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-slate-500">
            Framer uses AI to help you think through problems. Connect your own
            AI provider to enable these features.
          </p>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Provider Type
            </label>
            <div className="flex gap-2">
              <ProviderButton
                selected={provider === 'openai'}
                onClick={() => handleProviderChange('openai')}
                label="OpenAI-compatible"
              />
              <ProviderButton
                selected={provider === 'anthropic'}
                onClick={() => handleProviderChange('anthropic')}
                label="Anthropic-compatible"
              />
            </div>
          </div>

          {/* API Endpoint */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              API Endpoint
            </label>
            <Input
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-slate-500">
              Pre-filled with official endpoint. Change for local/self-hosted
              providers.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'anthropic'
                  ? 'sk-ant-************************'
                  : 'sk-************************'
              }
            />
          </div>

          {/* Model (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Model <span className="text-slate-400">(optional)</span>
            </label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === 'anthropic'
                  ? 'claude-sonnet-4-20250514'
                  : 'gpt-4o'
              }
            />
            <p className="text-xs text-slate-500">
              Leave empty for provider default
            </p>
          </div>

          {/* Test Connection */}
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!apiKey || testStatus === 'testing'}
            className="w-full gap-2"
          >
            {testStatus === 'testing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : testStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Connection successful
              </>
            ) : testStatus === 'error' ? (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                Connection failed
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {/* Security Note */}
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <strong>Security:</strong> Your API key is stored locally in your
            browser and never sent to Framer servers. All AI calls happen
            directly from your browser.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!apiKey}>
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProviderButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
        selected
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      )}
    >
      {label}
    </button>
  );
}
