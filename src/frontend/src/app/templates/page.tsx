'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TemplatesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900">Templates</h1>
        </div>

        <div className="text-center py-16">
          <div className="p-4 rounded-full bg-slate-100 inline-flex mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-medium text-slate-900 mb-2">Templates Coming Soon</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Frame templates will help you quickly start new frames with pre-filled guidance
            and best practices for different types of work.
          </p>
        </div>
      </div>
    </div>
  );
}
