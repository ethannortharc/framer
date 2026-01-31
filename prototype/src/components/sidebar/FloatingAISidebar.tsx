'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Send,
  RefreshCw,
  CheckCircle,
  X,
  Bot,
  Loader2,
} from 'lucide-react';
import { Frame, FrameSection, AIIssue } from '@/types';
import { useFrameStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, getScoreColor } from '@/lib/utils';

interface FloatingAISidebarProps {
  open: boolean;
  onClose: () => void;
  frame: Frame;
  focusedSection: FrameSection | null;
  onOpenAIConfig: () => void;
}

export function FloatingAISidebar({
  open,
  onClose,
  frame,
  focusedSection,
  onOpenAIConfig,
}: FloatingAISidebarProps) {
  const { aiConfig, updateFrame, setFocusedSection } = useFrameStore();
  const [chatInput, setChatInput] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isThinking, setIsThinking] = useState(false);

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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate realistic score based on frame content
    let score = 50;
    if (frame.problemStatement.length > 50) score += 10;
    if (frame.userPerspective.user) score += 5;
    if (frame.userPerspective.journeySteps.length >= 3) score += 10;
    if (frame.userPerspective.painPoints.length > 0) score += 5;
    if (frame.engineeringFraming.principles.length > 0) score += 10;
    if (frame.engineeringFraming.nonGoals.length > 0) score += 5;
    if (frame.validationThinking.successSignals.length > 0) score += 10;
    if (frame.validationThinking.disconfirmingEvidence.length > 0) score += 10;

    score = Math.min(score, 100);

    const issues: AIIssue[] = [];
    if (!frame.userPerspective.user) {
      issues.push({
        id: `issue-${Date.now()}-1`,
        section: 'user',
        severity: 'error',
        message: 'No user/persona defined. Who experiences this problem?',
      });
    }
    if (frame.userPerspective.journeySteps.length < 3) {
      issues.push({
        id: `issue-${Date.now()}-2`,
        section: 'user',
        severity: 'error',
        message: `User journey has only ${frame.userPerspective.journeySteps.length} steps. Minimum 3 required.`,
      });
    }
    if (frame.validationThinking.disconfirmingEvidence.length === 0) {
      issues.push({
        id: `issue-${Date.now()}-3`,
        section: 'validation',
        severity: 'warning',
        message: 'No disconfirming evidence specified. What would prove this framing wrong?',
      });
    }
    if (frame.engineeringFraming.nonGoals.length === 0) {
      issues.push({
        id: `issue-${Date.now()}-4`,
        section: 'engineering',
        severity: 'warning',
        message: 'No explicit non-goals. What are you intentionally NOT doing?',
      });
    }

    updateFrame(frame.id, {
      aiScore: score,
      aiScoreBreakdown: {
        problemClarity: Math.min(20, Math.round(score * 0.2)),
        userPerspective: Math.min(20, Math.round(score * 0.2)),
        engineeringFraming: Math.min(25, Math.round(score * 0.25)),
        validationThinking: Math.min(20, Math.round(score * 0.2)),
        internalConsistency: Math.min(15, Math.round(score * 0.15)),
      },
      aiIssues: issues,
    });

    setIsAssessing(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    if (!aiConfig) {
      onOpenAIConfig();
      return;
    }

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsThinking(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    const responses = [
      "Based on your frame, I suggest being more specific about the user's context. What environment are they working in?",
      "Consider adding measurable success criteria. How will you know when this is truly fixed?",
      "The engineering principles could be more concrete. Instead of 'should work correctly', specify the exact behavior expected.",
      "Good progress! The user journey is clear. Now consider what might invalidate your assumptions.",
      "I notice the non-goals section is empty. What are you explicitly choosing NOT to do?",
    ];

    const aiResponse = responses[Math.floor(Math.random() * responses.length)];
    setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    setIsThinking(false);
  };

  const handleIssueClick = (section: FrameSection) => {
    setFocusedSection(section);
    // Scroll to section would be handled by the parent
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Focus Indicator */}
        {focusedSection && (
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
            Focusing on:{' '}
            <span className="font-medium text-slate-700">
              {sectionLabels[focusedSection]}
            </span>
          </div>
        )}

        {/* Suggestions */}
        <SuggestionsPanel focusedSection={focusedSection} frame={frame} />

        {/* Quality Score */}
        <ScorePanel
          frame={frame}
          isAssessing={isAssessing}
          onAssess={handleAssessFrame}
        />

        {/* Issues */}
        <IssuesPanel
          issues={frame.aiIssues || []}
          onIssueClick={handleIssueClick}
        />

        {/* Chat History */}
        {chatMessages.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-2 bg-slate-50 border-b border-slate-200">
              Conversation
            </div>
            <div className="max-h-64 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm p-2 rounded-lg',
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white ml-4'
                      : 'bg-slate-100 text-slate-700 mr-4'
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {isThinking && (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 bg-slate-50">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Ask AI
        </div>
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type your question..."
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            disabled={isThinking}
          />
          <Button
            size="icon"
            onClick={handleSendChat}
            disabled={!chatInput.trim() || isThinking}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuggestionsPanel({
  focusedSection,
  frame
}: {
  focusedSection: FrameSection | null;
  frame: Frame;
}) {
  const getSuggestion = () => {
    if (!focusedSection) {
      return 'Select a section to get contextual AI suggestions. Click on User Perspective, Engineering Framing, or Validation Thinking.';
    }

    const suggestions: Record<FrameSection, string[]> = {
      header: [
        'Make the problem statement more specific - what exact behavior is unexpected?',
        'Focus on the problem, not the solution. Describe what\'s wrong, not how to fix it.',
      ],
      user: [
        frame.userPerspective.user
          ? `Consider if "${frame.userPerspective.user}" is specific enough. What role or persona experiences this?`
          : 'Start by defining who experiences this problem. What\'s their role?',
        frame.userPerspective.journeySteps.length < 3
          ? 'Add more journey steps to show the complete user experience.'
          : 'Good journey coverage! Consider adding the moment of frustration or discovery.',
      ],
      engineering: [
        frame.engineeringFraming.principles.length === 0
          ? 'Add engineering principles that must hold true. What invariants should be preserved?'
          : 'Review your principles - are they specific and testable?',
        frame.engineeringFraming.nonGoals.length === 0
          ? 'Define explicit non-goals. What are you intentionally NOT doing?'
          : 'Good that you have non-goals defined. Consider if there are implicit assumptions to make explicit.',
      ],
      validation: [
        frame.validationThinking.successSignals.length === 0
          ? 'Add success signals. How will you know this work succeeded?'
          : 'Make sure success signals are measurable and observable.',
        frame.validationThinking.disconfirmingEvidence.length === 0
          ? 'Add disconfirming evidence. What would prove your framing wrong?'
          : 'Good falsifiability! Consider edge cases that might invalidate assumptions.',
      ],
    };

    const sectionSuggestions = suggestions[focusedSection];
    return sectionSuggestions[Math.floor(Math.random() * sectionSuggestions.length)];
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        Suggestion
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{getSuggestion()}</p>
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
                Analyzing...
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

          <p className="text-center text-sm">
            {frame.aiScore! >= 80 ? (
              <span className="text-emerald-600 font-medium">Ready to proceed</span>
            ) : frame.aiScore! >= 60 ? (
              <span className="text-amber-600 font-medium">Needs improvement</span>
            ) : (
              <span className="text-red-600 font-medium">Significant gaps</span>
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
                label="Engineering"
                score={frame.aiScoreBreakdown.engineeringFraming}
                max={25}
              />
              <ScoreRow
                label="Validation"
                score={frame.aiScoreBreakdown.validationThinking}
                max={20}
              />
              <ScoreRow
                label="Consistency"
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
        <span className="text-slate-500 tabular-nums w-8">
          {score}/{max}
        </span>
      </div>
    </div>
  );
}

function IssuesPanel({
  issues,
  onIssueClick
}: {
  issues: AIIssue[];
  onIssueClick: (section: FrameSection) => void;
}) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Issues (0)
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          No critical issues detected
        </div>
      </div>
    );
  }

  const sectionLabels: Record<string, string> = {
    header: 'Header',
    user: 'User',
    engineering: 'Engineering',
    validation: 'Validation',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
        Issues ({issues.length})
      </div>
      <div className="space-y-2">
        {issues.map((issue) => (
          <button
            key={issue.id}
            onClick={() => onIssueClick(issue.section)}
            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="flex items-start gap-2">
              {issue.severity === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="text-xs font-medium text-slate-500">
                  {sectionLabels[issue.section]}
                </span>
                <p className="text-sm text-slate-700">{issue.message}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
