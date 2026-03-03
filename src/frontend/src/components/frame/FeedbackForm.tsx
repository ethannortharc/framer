'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, ThumbsUp, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT, type TranslationKey } from '@/lib/i18n';

type Outcome = 'success' | 'partial' | 'failed';

const outcomes: { value: Outcome; labelKey: TranslationKey; icon: React.ReactNode; color: string }[] = [
  { value: 'success', labelKey: 'feedbackForm.success', icon: <ThumbsUp className="h-4 w-4" />, color: 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-emerald-500' },
  { value: 'partial', labelKey: 'feedbackForm.partial', icon: <AlertTriangle className="h-4 w-4" />, color: 'border-amber-300 bg-amber-50 text-amber-700 ring-amber-500' },
  { value: 'failed', labelKey: 'feedbackForm.failed', icon: <XCircle className="h-4 w-4" />, color: 'border-red-300 bg-red-50 text-red-700 ring-red-500' },
];

interface FeedbackFormProps {
  onSubmit: (feedback: {
    outcome: Outcome;
    summary: string;
    lessonsLearned: string[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export function FeedbackForm({ onSubmit, isLoading = false }: FeedbackFormProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [summary, setSummary] = useState('');
  const [lessonsText, setLessonsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = useT();
  const canSubmit = outcome !== null && summary.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;
    setIsSubmitting(true);
    try {
      const lessonsLearned = lessonsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      await onSubmit({
        outcome: outcome!,
        summary: summary.trim(),
        lessonsLearned,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-white p-6 space-y-5">
      <h3 className="text-sm font-semibold text-violet-700 uppercase tracking-wide">
        {t('feedbackForm.title')}
      </h3>

      {/* Outcome - clickable buttons */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          {t('feedbackForm.howDidItGo')}
        </label>
        <div className="flex gap-2">
          {outcomes.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                outcome === o.value
                  ? `${o.color} ring-2`
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {o.icon}
              {t(o.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          {t('feedbackForm.summary')} <span className="text-red-400">*</span>
        </label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={t('feedbackForm.summaryPlaceholder')}
          className="min-h-[80px] resize-y"
        />
      </div>

      {/* Lessons Learned */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          {t('feedbackForm.lessons')} <span className="text-slate-400">{t('feedbackForm.lessonsOptional')}</span>
        </label>
        <Textarea
          value={lessonsText}
          onChange={(e) => setLessonsText(e.target.value)}
          placeholder={t('feedbackForm.lessonsPlaceholder')}
          className="min-h-[100px] resize-y font-mono text-sm"
        />
      </div>

      {/* Submit */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('feedbackForm.submitting')}
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            {t('feedbackForm.complete')}
          </>
        )}
      </Button>

      {!canSubmit && !loading && (
        <p className="text-[11px] text-slate-400 text-center">
          {t('feedbackForm.hint')}
        </p>
      )}
    </div>
  );
}
