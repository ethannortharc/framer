'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Send,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { Frame, FrameSection, AIIssue } from '@/types';
import { useFrameStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getScoreColor } from '@/lib/utils';

interface AISidebarProps {
  frame: Frame;
  focusedSection: FrameSection | null;
  onOpenAIConfig: () => void;
}

export function AISidebar({ frame, focusedSection, onOpenAIConfig }: AISidebarProps) {
  const { aiConfig, updateFrame } = useFrameStore();
  const [chatInput, setChatInput] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);

  const sectionLabels: Record<FrameSection, string> = {
    header: 'Header',
    user: 'User Perspective',
    engineering: 'Engineering Framing',
    validation: 'Validation Thinking',
  };

  const handleAssessFrame = async () => {
    if (!aiConfig) {
      onOpenAIConfig();
      return;
    }

    setIsAssessing(true);

    // Simulate AI assessment delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For prototype, use existing score or generate mock
    const existingScore = frame.aiScore;
    if (!existingScore) {
      // Generate mock score
      updateFrame(frame.id, {
        aiScore: 74,
        aiScoreBreakdown: {
          problemClarity: 18,
          userPerspective: 14,
          engineeringFraming: 20,
          validationThinking: 12,
          internalConsistency: 10,
        },
        aiIssues: [
          {
            id: 'gen-1',
            section: 'validation',
            severity: 'error',
            message: 'No disconfirming evidence specified',
          },
          {
            id: 'gen-2',
            section: 'user',
            severity: 'warning',
            message: 'Journey step 4 is outcome, not user action',
          },
          {
            id: 'gen-3',
            section: 'engineering',
            severity: 'warning',
            message: '"Fix the bug" is not a principle',
          },
        ],
      });
    }

    setIsAssessing(false);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    if (!aiConfig) {
      onOpenAIConfig();
      return;
    }
    console.log('AI Chat:', chatInput);
    setChatInput('');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-100">
            <Sparkles className="h-4 w-4 text-violet-600" />
          </div>
          <span className="font-semibold text-slate-900">AI Assistant</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Focus Indicator */}
        {focusedSection && (
          <div className="text-xs text-slate-500">
            Focusing on:{' '}
            <span className="font-medium text-slate-700">
              {sectionLabels[focusedSection]}
            </span>
          </div>
        )}

        {/* Suggestions */}
        <SuggestionsPanel focusedSection={focusedSection} />

        {/* Quality Score */}
        <ScorePanel
          frame={frame}
          isAssessing={isAssessing}
          onAssess={handleAssessFrame}
        />

        {/* Issues */}
        <IssuesPanel issues={frame.aiIssues || []} />
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-white">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Ask AI
        </div>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your question..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
          />
          <Button
            size="icon"
            onClick={handleSendChat}
            disabled={!chatInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuggestionsPanel({ focusedSection }: { focusedSection: FrameSection | null }) {
  // Mock suggestions based on section
  const suggestions: Record<FrameSection, string> = {
    header:
      'Consider making the problem statement more specific - what exact behavior is unexpected?',
    user: "Consider adding a step showing the admin's expectation vs actual result...",
    engineering:
      'The principle "fix the bug" is too vague. What invariant should hold?',
    validation:
      'What would prove this framing wrong? Consider adding falsifiable criteria.',
  };

  const currentSuggestion = focusedSection
    ? suggestions[focusedSection]
    : 'Select a section to get contextual suggestions';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Suggestions
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{currentSuggestion}</p>
      {focusedSection && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="secondary">
            Apply
          </Button>
          <Button size="sm" variant="ghost">
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

interface ScorePanelProps {
  frame: Frame;
  isAssessing: boolean;
  onAssess: () => void;
}

function ScorePanel({ frame, isAssessing, onAssess }: ScorePanelProps) {
  const hasScore = frame.aiScore !== undefined;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Quality Score
      </div>

      {!hasScore ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-3">Not yet assessed</p>
          <Button onClick={onAssess} disabled={isAssessing} className="gap-2">
            {isAssessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Assessing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Assess Frame
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score Circle */}
          <div className="flex items-center justify-center">
            <div
              className={cn(
                'relative h-20 w-20 rounded-full flex items-center justify-center',
                frame.aiScore! >= 80
                  ? 'bg-emerald-100'
                  : frame.aiScore! >= 60
                  ? 'bg-amber-100'
                  : 'bg-red-100'
              )}
            >
              <span
                className={cn(
                  'text-2xl font-bold',
                  getScoreColor(frame.aiScore!)
                )}
              >
                {frame.aiScore}
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            {frame.aiScore! >= 80 ? (
              <span className="text-emerald-600">Ready to proceed</span>
            ) : (
              <span className="text-amber-600">Needs improvement</span>
            )}
          </p>

          {/* Score Breakdown */}
          {frame.aiScoreBreakdown && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <ScoreRow
                label="Problem Clarity"
                score={frame.aiScoreBreakdown.problemClarity}
                max={20}
              />
              <ScoreRow
                label="User Perspective"
                score={frame.aiScoreBreakdown.userPerspective}
                max={20}
              />
              <ScoreRow
                label="Engineering Framing"
                score={frame.aiScoreBreakdown.engineeringFraming}
                max={25}
              />
              <ScoreRow
                label="Validation Thinking"
                score={frame.aiScoreBreakdown.validationThinking}
                max={20}
              />
              <ScoreRow
                label="Internal Consistency"
                score={frame.aiScoreBreakdown.internalConsistency}
                max={15}
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onAssess}
            disabled={isAssessing}
            className="w-full gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isAssessing && 'animate-spin')} />
            Re-assess
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const percentage = (score / max) * 100;

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              percentage >= 80
                ? 'bg-emerald-500'
                : percentage >= 60
                ? 'bg-amber-500'
                : 'bg-red-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-slate-500 tabular-nums">
          {score}/{max}
        </span>
      </div>
    </div>
  );
}

function IssuesPanel({ issues }: { issues: AIIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Issues (0)
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          No issues detected
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Issues ({issues.length})
      </div>
      <div className="space-y-2">
        {issues.map((issue) => (
          <IssueItem key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueItem({ issue }: { issue: AIIssue }) {
  const sectionLabels: Record<string, string> = {
    header: 'Header',
    user: 'User',
    engineering: 'Engineering',
    validation: 'Validation',
  };

  return (
    <button className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-2">
        {issue.severity === 'error' ? (
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <span className="text-xs font-medium text-slate-500">
            {sectionLabels[issue.section]}:
          </span>
          <p className="text-sm text-slate-700">{issue.message}</p>
        </div>
      </div>
    </button>
  );
}
