'use client';

import React, { useState } from 'react';
import { LogIn, UserPlus, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAPI';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  required?: boolean;
}

type AuthMode = 'login' | 'register';

export function AuthModal({ open, onOpenChange, onSuccess, required }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      const success = await login(email, password);
      if (success) {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      if (password !== confirmPassword) {
        return;
      }
      const success = await register({
        email,
        password,
        passwordConfirm: confirmPassword,
        name: name || undefined,
      });
      if (success) {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    clearError();
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
  };

  const isValid = mode === 'login'
    ? email && password
    : email && password && confirmPassword && password === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (required) return;
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={required ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={required ? (e) => e.preventDefault() : undefined}
        hideCloseButton={required}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'login' ? (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Create Account
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Name (register only) */}
          {mode === 'register' && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Name (optional)
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
              disabled={isLoading}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Password
            </label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Confirm Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'mt-1',
                  confirmPassword && password !== confirmPassword && 'border-red-300 focus:ring-red-500'
                )}
                disabled={isLoading}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </Button>

          {/* Mode Switch */}
          <div className="text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-violet-600 hover:text-violet-700 font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-violet-600 hover:text-violet-700 font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
