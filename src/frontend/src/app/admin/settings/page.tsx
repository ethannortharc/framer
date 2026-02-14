'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AdminNav } from '@/components/layout/AdminNav';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Settings, Save, Loader2, RefreshCw, CheckCircle } from 'lucide-react';

interface AIConfig {
  provider: string;
  model: string;
  api_key: string | null;
  endpoint: string | null;
  temperature: number;
  max_tokens: number;
  timeout: number;
  ssl_verify: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function AdminSettingsPage() {
  const { isAuthenticated, token } = useAdminAuth();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load config (${res.status})`);
      }
      const data: AIConfig = await res.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchConfig();
    }
  }, [isAuthenticated, token, fetchConfig]);

  const handleSave = async () => {
    if (!config || !token) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        throw new Error(`Failed to save config (${res.status})`);
      }
      const data: AIConfig = await res.json();
      setConfig(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      <AdminNav />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500 mt-1">
                AI provider configuration
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConfig}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || isLoading || !config}
                className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Loading state */}
          {isLoading && !config ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : config ? (
            <div className="space-y-6">
              {/* Card 1: AI Provider */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <h2 className="text-lg font-semibold text-slate-900">AI Provider</h2>
                </div>

                <div className="grid gap-5">
                  {/* Provider */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Provider
                    </label>
                    <select
                      value={config.provider}
                      onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    >
                      <option value="openai">openai</option>
                      <option value="anthropic">anthropic</option>
                      <option value="minimax">minimax</option>
                      <option value="glm">glm</option>
                    </select>
                  </div>

                  {/* Model */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Model
                    </label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={config.api_key ?? ''}
                      onChange={(e) =>
                        setConfig({ ...config, api_key: e.target.value || null })
                      }
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {/* Custom Endpoint */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Custom Endpoint
                    </label>
                    <input
                      type="text"
                      value={config.endpoint ?? ''}
                      onChange={(e) =>
                        setConfig({ ...config, endpoint: e.target.value || null })
                      }
                      placeholder="https://api.example.com/v1"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Parameters */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Parameters</h2>
                </div>

                <div className="grid gap-5">
                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Temperature
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {config.temperature.toFixed(1)}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={config.temperature}
                      onChange={(e) =>
                        setConfig({ ...config, temperature: parseFloat(e.target.value) })
                      }
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>0</span>
                      <span>2</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={config.max_tokens}
                      onChange={(e) =>
                        setConfig({ ...config, max_tokens: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {/* Timeout */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-700">
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      value={config.timeout}
                      onChange={(e) =>
                        setConfig({ ...config, timeout: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {/* SSL Verification */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="ssl-verify"
                      checked={config.ssl_verify}
                      onChange={(e) =>
                        setConfig({ ...config, ssl_verify: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <label htmlFor="ssl-verify" className="text-sm font-medium text-slate-700">
                      SSL Certificate Verification
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
