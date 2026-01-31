'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  X,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Frame, FrameFeedback } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frame: Frame | null;
  onSubmit: (feedback: FrameFeedback) => void;
}

type Outcome = 'success' | 'partial' | 'failed';

const outcomeOptions: { value: Outcome; label: string; icon: React.ElementType; color: string; bgColor: string; description: string }[] = [
  {
    value: 'success',
    label: 'Success',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    description: 'The frame achieved its goals',
  },
  {
    value: 'partial',
    label: 'Partial Success',
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    description: 'Some goals achieved, some not',
  },
  {
    value: 'failed',
    label: 'Did Not Succeed',
    icon: XCircle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    description: 'Goals were not achieved',
  },
];

interface AssumptionResult {
  assumption: string;
  wasCorrect: boolean | null;
  note: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  frame,
  onSubmit,
}: FeedbackDialogProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [summary, setSummary] = useState('');
  const [newLesson, setNewLesson] = useState('');
  const [lessons, setLessons] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<AssumptionResult[]>([]);
  const [newAssumption, setNewAssumption] = useState('');

  // Initialize assumptions from frame validation thinking
  React.useEffect(() => {
    if (open && frame) {
      // Pre-populate assumptions from success signals and disconfirming evidence
      const initialAssumptions: AssumptionResult[] = [
        ...frame.validationThinking.successSignals.slice(0, 3).map((signal) => ({
          assumption: signal,
          wasCorrect: null,
          note: '',
        })),
      ];
      setAssumptions(initialAssumptions);
      setOutcome(null);
      setSummary('');
      setLessons([]);
    }
  }, [open, frame]);

  const handleAddLesson = () => {
    if (newLesson.trim()) {
      setLessons([...lessons, newLesson.trim()]);
      setNewLesson('');
    }
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const handleAddAssumption = () => {
    if (newAssumption.trim()) {
      setAssumptions([...assumptions, { assumption: newAssumption.trim(), wasCorrect: null, note: '' }]);
      setNewAssumption('');
    }
  };

  const handleRemoveAssumption = (index: number) => {
    setAssumptions(assumptions.filter((_, i) => i !== index));
  };

  const handleAssumptionResult = (index: number, wasCorrect: boolean) => {
    const updated = [...assumptions];
    updated[index].wasCorrect = wasCorrect;
    setAssumptions(updated);
  };

  const handleAssumptionNote = (index: number, note: string) => {
    const updated = [...assumptions];
    updated[index].note = note;
    setAssumptions(updated);
  };

  const handleSubmit = () => {
    if (!outcome || !summary.trim()) return;

    const feedback: FrameFeedback = {
      outcome,
      summary: summary.trim(),
      lessonsLearned: lessons,
      assumptionResults: assumptions
        .filter((a) => a.wasCorrect !== null)
        .map((a) => ({
          assumption: a.assumption,
          wasCorrect: a.wasCorrect!,
          note: a.note || undefined,
        })),
      completedAt: new Date(),
    };

    onSubmit(feedback);
    onOpenChange(false);
  };

  const canSubmit = outcome && summary.trim();

  if (!frame) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Frame with Feedback</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Outcome Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              What was the outcome?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {outcomeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = outcome === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setOutcome(option.value)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-center transition-all',
                      isSelected ? option.bgColor : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Icon className={cn('h-6 w-6 mx-auto mb-2', isSelected ? option.color : 'text-slate-400')} />
                    <div className={cn('font-medium text-sm', isSelected ? 'text-slate-900' : 'text-slate-600')}>
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Summary <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What happened? What was the overall result?"
              className="min-h-[80px]"
            />
          </div>

          {/* Assumption Results */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assumption Results
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Review your assumptions from the validation section. Were they correct?
            </p>

            <div className="space-y-3">
              {assumptions.map((assumption, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 font-medium">
                        {assumption.assumption}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleAssumptionResult(idx, true)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            assumption.wasCorrect === true
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
                          )}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          Correct
                        </button>
                        <button
                          onClick={() => handleAssumptionResult(idx, false)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            assumption.wasCorrect === false
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50'
                          )}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          Incorrect
                        </button>
                      </div>
                      {assumption.wasCorrect !== null && (
                        <Input
                          value={assumption.note}
                          onChange={(e) => handleAssumptionNote(idx, e.target.value)}
                          placeholder="Add a note (optional)"
                          className="mt-2 h-8 text-sm"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAssumption(idx)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add assumption */}
              <div className="flex gap-2">
                <Input
                  value={newAssumption}
                  onChange={(e) => setNewAssumption(e.target.value)}
                  placeholder="Add another assumption to evaluate..."
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAssumption()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAssumption}
                  disabled={!newAssumption.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Lessons Learned */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Lessons Learned
            </label>
            <p className="text-xs text-slate-500 mb-3">
              What would you do differently next time?
            </p>

            <div className="space-y-2">
              {lessons.map((lesson, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-slate-700">{lesson}</span>
                  <button
                    onClick={() => handleRemoveLesson(idx)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  value={newLesson}
                  onChange={(e) => setNewLesson(e.target.value)}
                  placeholder="Add a lesson learned..."
                  className="text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLesson()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLesson}
                  disabled={!newLesson.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Complete Frame
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
