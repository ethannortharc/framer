'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFrameStore } from '@/store';
import { useAuthContext } from '@/contexts/AuthContext';
import { Frame, FrameSection as FrameSectionType, FrameType } from '@/types';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FrameDocumentView } from '@/components/frame/FrameDocumentView';
import { FeedbackForm } from '@/components/frame/FeedbackForm';
import { formatDate, getStatusLabel, truncate, cn } from '@/lib/utils';
import { getAPIClient, type FrameHistoryEntry, type KnowledgeEntryResponse } from '@/lib/api';
import { MarkdownContent } from '@/components/frame/MarkdownContent';
import {
  Pencil,
  Eye,
  Play,
  CheckCircle,
  Loader2,
  MessageSquare,
  Clock,
  Sparkles,
  AlertTriangle,
  Shield,
  Brain,
  Tag,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';

function formatHistoryTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Section config for draft editing
const sections = [
  { key: 'user' as FrameSectionType, title: 'User Perspective', field: 'userPerspective' as const, placeholder: 'Describe who is affected, their context, journey, and pain points...\n\nSupports **markdown**: headings, lists, bold, code blocks.' },
  { key: 'engineering' as FrameSectionType, title: 'Engineering Framing', field: 'engineeringFraming' as const, placeholder: 'Define key principles, trade-offs, and explicit non-goals...\n\nSupports **markdown**: headings, lists, bold, code blocks.' },
  { key: 'validation' as FrameSectionType, title: 'Validation Thinking', field: 'validationThinking' as const, placeholder: 'Describe success signals and what would disprove your approach...\n\nSupports **markdown**: headings, lists, bold, code blocks.' },
] as const;

export default function FrameDetailPage() {
  const router = useRouter();
  const params = useParams();
  const frameId = params.id as string;

  const { user } = useAuthContext();
  const {
    frames,
    loadFrames,
    getFrame,
    updateFrame,
    submitForReview,
    markAsReady,
    startFeedback,
    submitFeedback,
    setFocusedSection,
    saveFrame,
    discardUnsavedFrame,
    isFrameSaved,
    evaluateFrame: triggerEvaluate,
    isLoading,
  } = useFrameStore();

  const [frame, setFrame] = useState<Frame | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasRefetched, setHasRefetched] = useState(false);
  const [history, setHistory] = useState<FrameHistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showReviewerSelect, setShowReviewerSelect] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [reviewConversationId, setReviewConversationId] = useState<string | null>(null);
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeEntryResponse[]>([]);
  const [showKnowledgeDialog, setShowKnowledgeDialog] = useState(false);
  const [isDistilling, setIsDistilling] = useState(false);
  const [expandedKnowledgeId, setExpandedKnowledgeId] = useState<string | null>(null);

  // Always load fresh data on mount to pick up review summaries, version changes, etc.
  useEffect(() => {
    loadFrames();
  }, [loadFrames]);

  useEffect(() => {
    const foundFrame = getFrame(frameId);
    if (foundFrame) {
      setFrame(foundFrame);
    } else if (frames.length > 0 && !hasRefetched) {
      setHasRefetched(true);
      loadFrames();
    }
  }, [frameId, frames, getFrame, loadFrames, hasRefetched]);

  // Check if frame has linked conversations (authoring + review)
  useEffect(() => {
    async function checkConversations() {
      try {
        const api = getAPIClient();
        const conversations = await api.listConversations({ frame_id: frameId });
        const authoring = conversations.find(
          (c) => c.frame_id === frameId && (c.purpose === 'authoring' || !c.purpose)
        );
        if (authoring) {
          setConversationId(authoring.id);
        }
        const review = conversations.find(
          (c) => c.frame_id === frameId && c.purpose === 'review'
        );
        if (review) {
          setReviewConversationId(review.id);
        }
      } catch {
        // Ignore errors - conversation link is optional
      }
    }
    checkConversations();
  }, [frameId]);

  // Fetch version history
  useEffect(() => {
    async function fetchHistory() {
      try {
        const api = getAPIClient();
        const entries = await api.getFrameHistory(frameId, 20);
        setHistory(entries);
      } catch {
        // Ignore errors - history is optional
      }
    }
    fetchHistory();
  }, [frameId]);

  if (!frame) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading frame...
        </div>
      </div>
    );
  }

  const isSaved = isFrameSaved(frame.id);
  const isDraft = frame.status === 'draft';
  const isInReview = frame.status === 'in_review';
  const isReady = frame.status === 'ready';
  const isFeedback = frame.status === 'feedback';
  const isArchived = frame.status === 'archived';

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      await triggerEvaluate(frame.id);
      // Refresh frame from store
      const updated = getFrame(frame.id);
      if (updated) setFrame(updated);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleUpdateFrame = (updates: Partial<Frame>) => {
    updateFrame(frame.id, updates);
    setFrame({ ...frame, ...updates });
  };

  const handleSectionFocus = (section: FrameSectionType) => {
    setFocusedSection(section);
  };

  const getStatusBadgeVariant = () => {
    switch (frame.status) {
      case 'ready':
        return 'success';
      case 'in_review':
        return 'warning';
      case 'feedback':
        return 'default';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Compact Header Bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Breadcrumb + Type/Status */}
            <div className="flex items-center gap-4">
              <Breadcrumb
                items={[
                  { label: 'Dashboard', onClick: handleBack },
                  { label: truncate(frame.problemStatement || 'Untitled Frame', 30) },
                ]}
              />
              <div className="flex items-center gap-2">
                {!isDraft || !isEditing ? (
                  <Badge variant={frame.type as 'bug' | 'feature' | 'exploration'}>
                    {frame.type.charAt(0).toUpperCase() + frame.type.slice(1)}
                  </Badge>
                ) : (
                  <Select
                    value={frame.type}
                    onValueChange={(v) => {
                      handleUpdateFrame({ type: v as FrameType });
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug Fix</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="exploration">Exploration</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Badge variant={getStatusBadgeVariant()}>
                  {getStatusLabel(frame.status)}
                </Badge>
                {frame.aiScore !== undefined && (
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      frame.aiScore >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {frame.aiScore}/100
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEvaluate}
                  disabled={isEvaluating}
                  className="gap-1.5 h-8"
                >
                  {isEvaluating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Evaluate
                </Button>
              )}
              {isDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="gap-1.5 h-8"
                >
                  {isEditing ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

          {/* ============ RENDERED DOCUMENT VIEW ============ */}
          {/* Shown for all non-draft states, AND for draft in preview mode */}
          {(!isDraft || !isEditing) && (
            <FrameDocumentView frame={frame} />
          )}

          {/* ============ EDIT MODE (draft only) ============ */}
          {isDraft && isEditing && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="px-6 py-6 space-y-6">
                {/* Problem Statement */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Problem Statement
                  </label>
                  <Textarea
                    value={frame.problemStatement}
                    onChange={(e) =>
                      handleUpdateFrame({ problemStatement: e.target.value })
                    }
                    placeholder={
                      frame.type === 'bug'
                        ? "Describe what's broken - what should happen vs. what actually happens?"
                        : frame.type === 'feature'
                        ? "What capability is missing? What should users be able to do?"
                        : "What question are you trying to answer? What uncertainty needs to be resolved?"
                    }
                    className="min-h-[60px] border-slate-200 bg-slate-50 focus-visible:ring-1 resize-none"
                  />
                </div>

                <hr className="border-slate-100" />

                {/* Content Sections */}
                {sections.map(({ key, title, field, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {title}
                    </label>
                    <Textarea
                      value={frame[field]}
                      onChange={(e) =>
                        handleUpdateFrame({ [field]: e.target.value })
                      }
                      onFocus={() => handleSectionFocus(key)}
                      placeholder={placeholder}
                      className="min-h-[150px] border-slate-200 bg-slate-50 focus-visible:ring-1 resize-y font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Evaluation Card */}
          {frame.aiScore != null && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  AI Evaluation
                </h3>
                <span
                  className={cn(
                    'text-lg font-bold px-3 py-1 rounded-full',
                    frame.aiScore >= 80
                      ? 'bg-emerald-100 text-emerald-700'
                      : frame.aiScore >= 50
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {frame.aiScore}/100
                </span>
              </div>

              {/* Score Breakdown */}
              {frame.aiScoreBreakdown && (
                <div className="space-y-2">
                  {Object.entries(frame.aiScoreBreakdown).map(([key, value]) => {
                    const label = key
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    const pct = (value / 25) * 100;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>{label}</span>
                          <span className="font-medium">{value}/25</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Feedback */}
              {frame.aiFeedback && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Feedback</h4>
                  <div className="prose prose-sm prose-slate max-w-none">
                    <MarkdownContent content={frame.aiFeedback} />
                  </div>
                </div>
              )}

              {/* Issues */}
              {frame.aiIssues && frame.aiIssues.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Issues</h4>
                  <ul className="space-y-1.5">
                    {frame.aiIssues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Feedback Form */}
          {isFeedback && (
            <FeedbackForm
              isLoading={isLoading || isDistilling}
              onSubmit={async (fb) => {
                await submitFeedback(frame.id, {
                  outcome: fb.outcome,
                  summary: fb.summary,
                  lessonsLearned: fb.lessonsLearned,
                  assumptionResults: [],
                  completedAt: new Date(),
                });
                // Distill knowledge from feedback via AI
                setIsDistilling(true);
                try {
                  const api = getAPIClient();
                  const entries = await api.distillKnowledge({
                    frame_id: frame.id,
                    feedback: `Outcome: ${fb.outcome}. ${fb.summary}. Lessons: ${fb.lessonsLearned.join('; ')}`,
                  });
                  if (entries.length > 0) {
                    setKnowledgeResults(entries);
                    setShowKnowledgeDialog(true);
                    return; // Don't navigate yet — dialog will handle it
                  }
                } catch {
                  // Knowledge distillation is best-effort
                } finally {
                  setIsDistilling(false);
                }
                router.push('/dashboard');
              }}
            />
          )}

          {/* Source Conversation Card */}
          {conversationId && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
                    <MessageSquare className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Source Conversation</h4>
                    <p className="text-xs text-slate-500">The discussion that shaped this frame</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/new?conversation=${conversationId}`)}
                  className="gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  View Conversation
                </Button>
              </div>
            </div>
          )}

          {/* Review Conversation Card */}
          {reviewConversationId && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Shield className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Review Conversation</h4>
                    <p className="text-xs text-slate-500">AI-guided review discussion</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/new?conversation=${reviewConversationId}`)}
                  className="gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  View Review
                </Button>
              </div>
            </div>
          )}

          {/* Start Review Button */}
          {isInReview && !reviewConversationId && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={async () => {
                  try {
                    const api = getAPIClient();
                    const resp = await api.startConversation(
                      user?.id || 'anonymous',
                      'review',
                      frameId
                    );
                    setReviewConversationId(resp.id);
                    router.push(`/new?conversation=${resp.id}`);
                  } catch {
                    // Ignore
                  }
                }}
              >
                <Shield className="h-4 w-4" />
                Start Review Conversation
              </Button>
            </div>
          )}

          {/* Review Summary */}
          {frame.reviewSummary && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Review Summary
                </h3>
                {frame.reviewRecommendation && (
                  <Badge
                    variant={
                      frame.reviewRecommendation === 'approve' ? 'success' :
                      frame.reviewRecommendation === 'revise' ? 'warning' : 'default'
                    }
                  >
                    {frame.reviewRecommendation.charAt(0).toUpperCase() + frame.reviewRecommendation.slice(1)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{frame.reviewSummary}</p>
              {frame.reviewComments && frame.reviewComments.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</h4>
                  {frame.reviewComments.map((comment, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant={
                          comment.severity === 'blocker' ? 'error' :
                          comment.severity === 'concern' ? 'warning' : 'outline'
                        }
                        className="text-[10px] mt-0.5 flex-shrink-0"
                      >
                        {comment.section.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-slate-700">{comment.content}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Version History */}
          {history.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Version History
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />

                <div className="space-y-3">
                  {history.map((entry, i) => (
                    <div key={entry.hash} className="flex items-start gap-3 relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        'h-[15px] w-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10',
                        i === 0
                          ? 'bg-violet-500 border-violet-500'
                          : 'bg-white border-slate-300'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">
                          {entry.message}
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.author_name} &middot; {formatHistoryTimestamp(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Owner & Date Info */}
          <div className="flex items-center justify-between text-sm text-slate-500 px-2">
            <div className="flex items-center gap-4">
              <span>
                Owner: <span className="font-medium text-slate-700">{user?.name || user?.email}</span>
              </span>
              {frame.reviewer && (
                <span>
                  Reviewer: <span className="font-medium text-slate-700">{frame.reviewer}</span>
                </span>
              )}
            </div>
            <span>Last updated: {formatDate(frame.updatedAt)}</span>
          </div>

          {/* Spacer for fixed footer */}
          <div className="h-20" />
        </div>
      </div>

      {/* Knowledge Distilling Loading Overlay */}
      {isDistilling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-xl border border-slate-200 shadow-2xl px-8 py-6 flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
              <Brain className="h-6 w-6 text-violet-500 animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-slate-900">Distilling Knowledge...</h3>
              <p className="text-xs text-slate-500 mt-1">Extracting insights from your feedback via AI</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          </div>
        </div>
      )}

      {/* Knowledge Distill Results Modal (plain HTML, no Radix) */}
      {showKnowledgeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowKnowledgeDialog(false);
              router.push('/dashboard');
            }}
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-500" />
                Knowledge Extracted
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {knowledgeResults.length} insight{knowledgeResults.length !== 1 ? 's' : ''} distilled from your feedback and saved to the knowledge base.
              </p>
            </div>

            {/* Scrollable entries */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {knowledgeResults.map((entry) => {
                const isExpanded = expandedKnowledgeId === entry.id;
                const sourceLabel =
                  entry.source === 'feedback' ? 'Frame Feedback' :
                  entry.source === 'conversation' ? 'Conversation' :
                  entry.source === 'manual' ? 'Manual' : entry.source;
                return (
                  <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    {/* Clickable header */}
                    <div
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                      onClick={() => setExpandedKnowledgeId(isExpanded ? null : entry.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{entry.title}</span>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0 capitalize">
                        {entry.category}
                      </Badge>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-200">
                        <p className="text-sm text-slate-600 leading-relaxed pt-3">{entry.content}</p>

                        {/* Source */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <FileText className="h-3 w-3" />
                          <span>Source: <span className="text-slate-500 font-medium">{sourceLabel}</span></span>
                          {entry.source_id && (
                            <span className="text-slate-300">({entry.source_id.slice(0, 16)}...)</span>
                          )}
                        </div>

                        {/* Tags */}
                        {entry.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag className="h-3 w-3 text-slate-400" />
                            {entry.tags.map((tag) => (
                              <span key={tag} className="text-[11px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100 flex justify-end">
              <Button onClick={() => {
                setShowKnowledgeDialog(false);
                router.push('/dashboard');
              }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Action Footer */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {isDraft && !isSaved && (
                <span className="text-amber-600 mr-3">
                  ● Unsaved
                </span>
              )}
              {isDraft && isSaved && (
                <span className="text-slate-400 mr-3">
                  ✓ Saved
                </span>
              )}
              {isDraft && isSaved && (
                <span className="text-emerald-600">
                  Ready to submit for review
                </span>
              )}
              {isInReview && (
                <span className="text-amber-600">
                  Under review - mark as ready when approved
                </span>
              )}
              {isReady && (
                <span className="text-emerald-600">
                  Ready for implementation
                </span>
              )}
              {isFeedback && (
                <span className="text-violet-600">
                  Implementation complete - provide feedback
                </span>
              )}
              {isArchived && (
                <span className="text-slate-400">
                  Archived with feedback
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Draft status actions */}
              {isDraft && (
                <>
                  {!isSaved && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        discardUnsavedFrame(frame.id);
                        handleBack();
                      }}
                      className="text-slate-500 hover:text-red-600"
                    >
                      Discard
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      saveFrame(frame.id);
                      handleBack();
                    }}
                  >
                    Save Draft
                  </Button>
                  {!showReviewerSelect ? (
                    <Button
                      onClick={async () => {
                        try {
                          const api = getAPIClient();
                          const userList = await api.listUsers();
                          setUsers(userList);
                          setShowReviewerSelect(true);
                        } catch {
                          // If users endpoint fails, submit without reviewer
                          await submitForReview(frame.id);
                          const updated = getFrame(frame.id);
                          if (updated) setFrame(updated);
                        }
                      }}
                      disabled={isLoading}
                    >
                      Submit for Review
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                        <SelectTrigger className="w-44 h-9 text-sm">
                          <SelectValue placeholder="Choose reviewer..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={async () => {
                          await submitForReview(frame.id, selectedReviewer || undefined);
                          const updated = getFrame(frame.id);
                          if (updated) setFrame(updated);
                          setShowReviewerSelect(false);
                        }}
                        disabled={isLoading}
                        size="sm"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Confirm'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowReviewerSelect(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* In Review status actions */}
              {isInReview && (
                <>
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={() => markAsReady(frame.id)} disabled={isLoading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Ready
                  </Button>
                </>
              )}

              {/* Ready status actions */}
              {isReady && (
                <>
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={() => startFeedback(frame.id)} disabled={isLoading}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Implementation
                  </Button>
                </>
              )}

              {/* Feedback status actions */}
              {isFeedback && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}

              {/* Archived status actions */}
              {isArchived && (
                <Button variant="outline" onClick={handleBack}>
                  Back to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
