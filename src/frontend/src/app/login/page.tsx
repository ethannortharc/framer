'use client';

import React, { useState } from 'react';
import { Frame, Mail, Lock, User, AlertCircle, Loader2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFrameStore } from '@/store';
import { useT } from '@/lib/i18n';

type AuthMode = 'login' | 'register';

export default function LoginPage() {
  const { login, register, error, clearError, isLoading } = useAuthContext();
  const { contentLanguage, setContentLanguage } = useFrameStore();
  const t = useT();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (mode === 'login') {
      await login(email, password);
    } else {
      if (password !== confirmPassword) {
        return;
      }
      await register({
        email,
        password,
        passwordConfirm: confirmPassword,
        name: name || undefined,
      });
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  const passwordsMatch = mode === 'register' ? password === confirmPassword : true;
  const canSubmit = email && password && (mode === 'login' || (passwordsMatch && confirmPassword));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Language Toggle - top right */}
      <button
        onClick={() => setContentLanguage(contentLanguage === 'en' ? 'zh' : 'en')}
        className="fixed top-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm z-10"
        title="Toggle language"
      >
        <Globe className="h-3.5 w-3.5" />
        {contentLanguage === 'en' ? 'EN' : 'ZH'}
      </button>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-xl bg-slate-900">
              <Frame className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">
              {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? t('login.signInDesc')
                : t('login.signUpDesc')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('login.nameOptional')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('login.yourName')}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('login.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t('login.confirmPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('login.confirmPlaceholder')}
                    className="pl-10"
                    required
                  />
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-600">{t('login.passwordsNoMatch')}</p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!canSubmit || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'login' ? t('login.signingIn') : t('login.creatingAccount')}
                </>
              ) : (
                <>{mode === 'login' ? t('login.signIn') : t('login.createAccount')}</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {mode === 'login' ? (
                <>
                  {t('login.noAccount')}{' '}
                  <span className="font-medium text-slate-900">{t('login.signUp')}</span>
                </>
              ) : (
                <>
                  {t('login.hasAccount')}{' '}
                  <span className="font-medium text-slate-900">{t('login.signInLink')}</span>
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
