'use client';

import React, { useState } from 'react';
import { Bug, Rocket, Compass, CheckCircle, XCircle, AlertCircle, ChevronRight, Calendar, User, FileText, Users, Wrench, Target } from 'lucide-react';
import { Frame, FrameType } from '@/types';
import { useFrameStore } from '@/store';
import { Badge } from '@/components/ui/badge';
import { cn, formatDate, truncate } from '@/lib/utils';

const typeIcons: Record<FrameType, { icon: React.ElementType; color: string }> = {
  bug: { icon: Bug, color: 'text-rose-600' },
  feature: { icon: Rocket, color: 'text-emerald-600' },
  exploration: { icon: Compass, color: 'text-blue-600' },
};

const outcomeConfig = {
  success: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Success' },
  partial: { icon: AlertCircle, color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Partial' },
  failed: { icon: XCircle, color: 'text-rose-600', bgColor: 'bg-rose-50', label: 'Failed' },
};

type DetailTab = 'feedback' | 'frame';

export function ArchiveSpace() {
  const { getArchivedFrames, getUser, setSelectedFrame, setCurrentSpace } = useFrameStore();
  const [selectedFrame, setSelectedFrameLocal] = useState<Frame | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('feedback');

  const archivedFrames = getArchivedFrames();

  const handleFrameClick = (frame: Frame) => {
    setSelectedFrameLocal(frame);
    setActiveTab('feedback');
  };

  const handleViewFrame = (frame: Frame) => {
    setSelectedFrame(frame.id);
    setCurrentSpace('working');
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Archive</h1>
        <p className="text-sm text-slate-500 mt-1">
          Completed frames with retrospective feedback
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Frame list */}
        <div className={cn(
          'flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto',
          selectedFrame ? 'w-80' : 'flex-1 max-w-2xl'
        )}>
          {archivedFrames.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">No archived frames</h3>
              <p className="text-sm text-slate-500 mt-2">
                Frames will appear here once they're completed and feedback has been submitted.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {archivedFrames.map((frame) => {
                const typeInfo = typeIcons[frame.type];
                const TypeIcon = typeInfo.icon;
                const owner = getUser(frame.ownerId);
                const outcome = frame.feedback?.outcome;
                const outcomeInfo = outcome ? outcomeConfig[outcome] : null;
                const OutcomeIcon = outcomeInfo?.icon;
                const isSelected = selectedFrame?.id === frame.id;

                return (
                  <button
                    key={frame.id}
                    onClick={() => handleFrameClick(frame)}
                    className={cn(
                      'w-full text-left p-4 transition-colors',
                      isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-1.5 rounded-lg bg-slate-100', typeInfo.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">
                            {truncate(frame.problemStatement || 'Untitled Frame', 40)}
                          </span>
                          {outcomeInfo && OutcomeIcon && (
                            <OutcomeIcon className={cn('h-4 w-4 flex-shrink-0', outcomeInfo.color)} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {owner?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {frame.feedback?.completedAt ? formatDate(frame.feedback.completedAt) : formatDate(frame.updatedAt)}
                          </span>
                        </div>
                        {frame.feedback?.summary && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                            {frame.feedback.summary}
                          </p>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 text-slate-300 flex-shrink-0 mt-1',
                        isSelected && 'text-slate-500'
                      )} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedFrame && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant={selectedFrame.type}>{selectedFrame.type}</Badge>
                  {selectedFrame.feedback?.outcome && (
                    <Badge
                      variant={
                        selectedFrame.feedback.outcome === 'success' ? 'success' :
                        selectedFrame.feedback.outcome === 'partial' ? 'warning' : 'outline'
                      }
                    >
                      {outcomeConfig[selectedFrame.feedback.outcome].label}
                    </Badge>
                  )}
                  {selectedFrame.aiScore !== undefined && (
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      selectedFrame.aiScore >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}>
                      Score: {selectedFrame.aiScore}/100
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedFrame.problemStatement || 'Untitled Frame'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Completed {selectedFrame.feedback?.completedAt && formatDate(selectedFrame.feedback.completedAt)}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('feedback')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === 'feedback'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Target className="h-4 w-4" />
                  Feedback & Retrospective
                </button>
                <button
                  onClick={() => setActiveTab('frame')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    activeTab === 'frame'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Frame Content
                </button>
              </div>

              {/* Feedback Tab */}
              {activeTab === 'feedback' && selectedFrame.feedback && (
                <div className="space-y-4">
                  {/* Feedback Summary */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                      Summary
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedFrame.feedback.summary}
                    </p>
                  </div>

                  {/* Lessons Learned */}
                  {selectedFrame.feedback.lessonsLearned.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                        Lessons Learned
                      </h3>
                      <ul className="space-y-2">
                        {selectedFrame.feedback.lessonsLearned.map((lesson, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-slate-400">•</span>
                            {lesson}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Assumption Results */}
                  {selectedFrame.feedback.assumptionResults.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                        Assumption Results
                      </h3>
                      <div className="space-y-3">
                        {selectedFrame.feedback.assumptionResults.map((result, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'p-3 rounded-lg',
                              result.wasCorrect ? 'bg-emerald-50' : 'bg-rose-50'
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {result.wasCorrect ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div>
                                <p className={cn(
                                  'text-sm font-medium',
                                  result.wasCorrect ? 'text-emerald-800' : 'text-rose-800'
                                )}>
                                  {result.assumption}
                                </p>
                                {result.note && (
                                  <p className={cn(
                                    'text-xs mt-1',
                                    result.wasCorrect ? 'text-emerald-700' : 'text-rose-700'
                                  )}>
                                    {result.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Frame Content Tab */}
              {activeTab === 'frame' && (
                <div className="space-y-4">
                  {/* Problem Statement */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Problem Statement
                      </h3>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedFrame.problemStatement || 'No problem statement defined'}
                    </p>
                  </div>

                  {/* User Perspective */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        User Perspective
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {selectedFrame.userPerspective.user && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">User / Persona</label>
                          <p className="text-sm text-slate-700">{selectedFrame.userPerspective.user}</p>
                        </div>
                      )}
                      {selectedFrame.userPerspective.context && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Context</label>
                          <p className="text-sm text-slate-700">{selectedFrame.userPerspective.context}</p>
                        </div>
                      )}
                      {selectedFrame.userPerspective.journeySteps.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">User Journey</label>
                          <ol className="list-decimal list-inside space-y-1">
                            {selectedFrame.userPerspective.journeySteps.map((step, idx) => (
                              <li key={idx} className="text-sm text-slate-700">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {selectedFrame.userPerspective.painPoints.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Pain Points</label>
                          <ul className="space-y-1">
                            {selectedFrame.userPerspective.painPoints.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="text-rose-400">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Engineering Framing */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Engineering Framing
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {selectedFrame.engineeringFraming.principles.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Engineering Principles</label>
                          <ol className="list-decimal list-inside space-y-1">
                            {selectedFrame.engineeringFraming.principles.map((principle, idx) => (
                              <li key={idx} className="text-sm text-slate-700">{principle}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {selectedFrame.engineeringFraming.nonGoals.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Non-goals / Trade-offs</label>
                          <ul className="space-y-1">
                            {selectedFrame.engineeringFraming.nonGoals.map((goal, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="text-slate-400">✗</span>
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Validation Thinking */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Validation Thinking
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {selectedFrame.validationThinking.successSignals.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Success Signals</label>
                          <ul className="space-y-1">
                            {selectedFrame.validationThinking.successSignals.map((signal, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="text-emerald-400">✓</span>
                                {signal}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedFrame.validationThinking.disconfirmingEvidence.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Disconfirming Evidence</label>
                          <ul className="space-y-1">
                            {selectedFrame.validationThinking.disconfirmingEvidence.map((evidence, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="text-amber-400">!</span>
                                {evidence}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
