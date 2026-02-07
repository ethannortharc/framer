'use client';

import React from 'react';
import { AdminPage } from '@/components/admin/AdminPage';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminRoute() {
  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <div className="bg-slate-900 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to Framer
        </Link>
      </div>
      <AdminPage />
    </div>
  );
}
