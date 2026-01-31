'use client';

import React, { useState } from 'react';
import { Frame, FrameSection as FrameSectionType, FrameType } from '@/types';
import { useFrameStore } from '@/store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FrameSection, EditableList, EditableText } from './FrameSection';
import { FloatingAISidebar } from '@/components/sidebar/FloatingAISidebar';
import { formatDate, getStatusLabel, truncate } from '@/lib/utils';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckSquare,
  Play,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrameDetailProps {
  frame: Frame;
  onBack: () => void;
  onOpenRefineDialog: (section: FrameSectionType) => void;
  onOpenAIConfig: () => void;
  onOpenCommentDialog: (section: FrameSectionType) => void;
  onOpenQuestionnaire: (section: FrameSectionType) => void;
  onOpenFeedback: () => void;
}

// Fixed checklists for each activity type
const activityChecklists: Record<FrameType, Array<{ id: string; label: string; description: string }>> = {
  bug: [
    { id: 'understood_symptom', label: 'I have clearly identified the symptom', description: 'The unexpected behavior is documented' },
    { id: 'understood_user', label: 'I understand who is affected', description: 'User role and impact are clear' },
    { id: 'understood_cause', label: 'I have a hypothesis for the root cause', description: 'Or I know what to investigate' },
    { id: 'understood_fix', label: 'I know how to verify the fix', description: 'Success criteria are defined' },
  ],
  feature: [
    { id: 'understood_need', label: 'I understand the user need', description: 'Why this feature matters now' },
    { id: 'understood_workflow', label: 'I understand the workflow', description: 'How users will use this feature' },
    { id: 'understood_scope', label: 'I have defined the scope', description: 'What\'s in and what\'s out' },
    { id: 'understood_validation', label: 'I know how to measure success', description: 'Success metrics are defined' },
  ],
  exploration: [
    { id: 'understood_question', label: 'I have a clear question to answer', description: 'The uncertainty to resolve' },
    { id: 'understood_constraints', label: 'I understand the constraints', description: 'Time, scope, and boundaries' },
    { id: 'understood_output', label: 'I know what output is expected', description: 'Deliverable format is clear' },
    { id: 'understood_decision', label: 'I know what decision this enables', description: 'How findings will be used' },
  ],
};

export function FrameDetail({
  frame,
  onBack,
  onOpenRefineDialog,
  onOpenAIConfig,
  onOpenCommentDialog,
  onOpenQuestionnaire,
  onOpenFeedback,
}: FrameDetailProps) {
  const {
    updateFrame,
    submitForReview,
    markAsReady,
    startFeedback,
    getUser,
    setFocusedSection,
    focusedSection,
    aiConfig,
    saveFrame,
    discardUnsavedFrame,
    isFrameSaved,
  } = useFrameStore();

  const isSaved = isFrameSaved(frame.id);

  const owner = getUser(frame.ownerId);

  // Read-only for feedback and archived frames
  const isReadOnly = frame.status === 'feedback' || frame.status === 'archived';
  const isDraft = frame.status === 'draft';
  const isInReview = frame.status === 'in_review';
  const isReady = frame.status === 'ready';
  const isFeedback = frame.status === 'feedback';
  const isArchived = frame.status === 'archived';

  // AI Sidebar visibility
  const [showAISidebar, setShowAISidebar] = useState(false);

  // Header collapse state
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState<Set<FrameSectionType | 'checklist'>>(new Set());

  // Expand/Collapse all
  const [allExpanded, setAllExpanded] = useState(true);

  // Checklist state (stored locally, keyed by checklist item id)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleSection = (section: FrameSectionType | 'checklist') => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(section)) {
      newCollapsed.delete(section);
    } else {
      newCollapsed.add(section);
    }
    setCollapsedSections(newCollapsed);
  };

  const toggleAllSections = () => {
    if (allExpanded) {
      setCollapsedSections(new Set(['user', 'engineering', 'validation', 'checklist']));
      setHeaderCollapsed(true);
      setAllExpanded(false);
    } else {
      setCollapsedSections(new Set());
      setHeaderCollapsed(false);
      setAllExpanded(true);
    }
  };

  const handleUpdateFrame = (updates: Partial<Frame>) => {
    updateFrame(frame.id, updates);
  };

  const handleAIAction = (action: 'generate' | 'improve' | 'refine', section: FrameSectionType) => {
    if (!aiConfig) {
      onOpenAIConfig();
      return;
    }
    if (action === 'refine') {
      onOpenRefineDialog(section);
    } else {
      setShowAISidebar(true);
      setFocusedSection(section);
    }
  };

  const handleSectionFocus = (section: FrameSectionType) => {
    setFocusedSection(section);
  };

  const getSectionComments = (section: FrameSectionType) => {
    return frame.comments?.filter((c) => c.section === section) || [];
  };

  // Get the checklist for current frame type
  const checklist = activityChecklists[frame.type];
  const allChecked = checklist.every(item => checkedItems.has(item.id));
  const checkedCount = checklist.filter(item => checkedItems.has(item.id)).length;

  const toggleCheckItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  // Check if sections have content
  const isSectionEmpty = (section: FrameSectionType): boolean => {
    switch (section) {
      case 'user':
        return !frame.userPerspective.user &&
               !frame.userPerspective.context &&
               frame.userPerspective.journeySteps.length === 0 &&
               frame.userPerspective.painPoints.length === 0;
      case 'engineering':
        return frame.engineeringFraming.principles.length === 0 &&
               frame.engineeringFraming.nonGoals.length === 0;
      case 'validation':
        return frame.validationThinking.successSignals.length === 0 &&
               frame.validationThinking.disconfirmingEvidence.length === 0;
      default:
        return false;
    }
  };

  // Type-specific guidance
  const typeGuidance = {
    bug: {
      user: 'Describe who experiences this bug and their journey to encountering it',
      engineering: 'Define what should work correctly (invariants) and what you won\'t fix',
      validation: 'How will you verify the fix works? What would indicate the fix failed?',
    },
    feature: {
      user: 'Who needs this feature and what workflow does it enable?',
      engineering: 'What principles guide implementation? What\'s out of scope?',
      validation: 'What signals success? What would prove this approach is wrong?',
    },
    exploration: {
      user: 'Who benefits from this exploration? What decisions depend on it?',
      engineering: 'What constraints guide research? What approaches are excluded?',
      validation: 'What would a successful exploration produce? What might invalidate it?',
    },
  };

  const guidance = typeGuidance[frame.type];

  // Get status badge variant
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

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Compact Header Bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Breadcrumb + Type/Status */}
            <div className="flex items-center gap-4">
              <Breadcrumb
                items={[
                  { label: 'Dashboard', onClick: onBack },
                  { label: truncate(frame.problemStatement || 'Untitled Frame', 30) },
                ]}
              />
              <div className="flex items-center gap-2">
                {isReadOnly ? (
                  <Badge variant={frame.type as 'bug' | 'feature' | 'exploration'}>
                    {frame.type.charAt(0).toUpperCase() + frame.type.slice(1)}
                  </Badge>
                ) : (
                  <Select
                    value={frame.type}
                    onValueChange={(v) => {
                      handleUpdateFrame({ type: v as FrameType });
                      setCheckedItems(new Set()); // Reset checklist when type changes
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
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllSections}
                className="text-slate-500 gap-1.5 h-8"
              >
                {allExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    Collapse
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">

          {/* Problem Statement Section - Collapsible */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div
              className={cn(
                'flex items-center justify-between px-5 py-3 cursor-pointer select-none',
                !headerCollapsed && 'border-b border-slate-100'
              )}
              onClick={() => setHeaderCollapsed(!headerCollapsed)}
            >
              <div className="flex items-center gap-2">
                <button className="p-0.5 hover:bg-slate-100 rounded transition-colors">
                  {headerCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Problem Statement
                </h3>
              </div>
              {headerCollapsed && frame.problemStatement && (
                <p className="text-sm text-slate-500 truncate max-w-lg">
                  {truncate(frame.problemStatement, 60)}
                </p>
              )}
            </div>
            {!headerCollapsed && (
              <div className="p-5">
                {isReadOnly ? (
                  <p className="text-slate-900 leading-relaxed">
                    {frame.problemStatement || 'No problem statement defined'}
                  </p>
                ) : (
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
                    className="min-h-[60px] border-0 bg-slate-50 focus-visible:ring-1 resize-none"
                  />
                )}
              </div>
            )}
          </div>

          {/* User Perspective Section */}
          <FrameSection
            title="User Perspective"
            section="user"
            isActive={focusedSection === 'user'}
            isReadOnly={isReadOnly}
            isCollapsed={collapsedSections.has('user')}
            isEmpty={isSectionEmpty('user')}
            onToggleCollapse={() => toggleSection('user')}
            onFocus={() => handleSectionFocus('user')}
            onAIGenerate={() => handleAIAction('generate', 'user')}
            onAIImprove={() => handleAIAction('improve', 'user')}
            onAIRefine={() => handleAIAction('refine', 'user')}
            onStartQuestionnaire={() => onOpenQuestionnaire('user')}
            comments={getSectionComments('user')}
            onAddComment={isReadOnly ? () => onOpenCommentDialog('user') : undefined}
          >
            <div className="space-y-5">
              {!isReadOnly && (
                <p className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  {guidance.user}
                </p>
              )}
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    User / Persona
                  </label>
                  <EditableText
                    value={frame.userPerspective.user}
                    onChange={(value) =>
                      handleUpdateFrame({
                        userPerspective: { ...frame.userPerspective, user: value },
                      })
                    }
                    placeholder="e.g., Network Administrator"
                    isReadOnly={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Context
                  </label>
                  <EditableText
                    value={frame.userPerspective.context}
                    onChange={(value) =>
                      handleUpdateFrame({
                        userPerspective: { ...frame.userPerspective, context: value },
                      })
                    }
                    placeholder="Environment and situation"
                    isReadOnly={isReadOnly}
                    multiline
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  User Journey <span className="text-slate-400 font-normal">(min 3 steps)</span>
                </label>
                <EditableList
                  items={frame.userPerspective.journeySteps}
                  onChange={(items) =>
                    handleUpdateFrame({
                      userPerspective: { ...frame.userPerspective, journeySteps: items },
                    })
                  }
                  placeholder="Add a journey step..."
                  isReadOnly={isReadOnly}
                  minItems={3}
                  ordered={true}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Pain Points
                </label>
                <EditableList
                  items={frame.userPerspective.painPoints}
                  onChange={(items) =>
                    handleUpdateFrame({
                      userPerspective: { ...frame.userPerspective, painPoints: items },
                    })
                  }
                  placeholder="Add a pain point..."
                  isReadOnly={isReadOnly}
                  ordered={false}
                />
              </div>
            </div>
          </FrameSection>

          {/* Engineering Framing Section */}
          <FrameSection
            title="Engineering Framing"
            section="engineering"
            isActive={focusedSection === 'engineering'}
            isReadOnly={isReadOnly}
            isCollapsed={collapsedSections.has('engineering')}
            isEmpty={isSectionEmpty('engineering')}
            onToggleCollapse={() => toggleSection('engineering')}
            onFocus={() => handleSectionFocus('engineering')}
            onAIGenerate={() => handleAIAction('generate', 'engineering')}
            onAIImprove={() => handleAIAction('improve', 'engineering')}
            onAIRefine={() => handleAIAction('refine', 'engineering')}
            onStartQuestionnaire={() => onOpenQuestionnaire('engineering')}
            comments={getSectionComments('engineering')}
            onAddComment={isReadOnly ? () => onOpenCommentDialog('engineering') : undefined}
          >
            <div className="space-y-5">
              {!isReadOnly && (
                <p className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  {guidance.engineering}
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Engineering Principles <span className="text-slate-400 font-normal">(max 5)</span>
                </label>
                <EditableList
                  items={frame.engineeringFraming.principles}
                  onChange={(items) =>
                    handleUpdateFrame({
                      engineeringFraming: { ...frame.engineeringFraming, principles: items.slice(0, 5) },
                    })
                  }
                  placeholder="Add a principle..."
                  isReadOnly={isReadOnly}
                  ordered={true}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Non-goals / Trade-offs
                </label>
                <EditableList
                  items={frame.engineeringFraming.nonGoals}
                  onChange={(items) =>
                    handleUpdateFrame({
                      engineeringFraming: { ...frame.engineeringFraming, nonGoals: items },
                    })
                  }
                  placeholder="What are you NOT doing?"
                  isReadOnly={isReadOnly}
                  ordered={false}
                />
              </div>
            </div>
          </FrameSection>

          {/* Validation Thinking Section */}
          <FrameSection
            title="Validation Thinking"
            section="validation"
            isActive={focusedSection === 'validation'}
            isReadOnly={isReadOnly}
            isCollapsed={collapsedSections.has('validation')}
            isEmpty={isSectionEmpty('validation')}
            onToggleCollapse={() => toggleSection('validation')}
            onFocus={() => handleSectionFocus('validation')}
            onAIGenerate={() => handleAIAction('generate', 'validation')}
            onAIImprove={() => handleAIAction('improve', 'validation')}
            onAIRefine={() => handleAIAction('refine', 'validation')}
            onStartQuestionnaire={() => onOpenQuestionnaire('validation')}
            comments={getSectionComments('validation')}
            onAddComment={isReadOnly ? () => onOpenCommentDialog('validation') : undefined}
          >
            <div className="space-y-5">
              {!isReadOnly && (
                <p className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                  {guidance.validation}
                </p>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Success Signals
                </label>
                <EditableList
                  items={frame.validationThinking.successSignals}
                  onChange={(items) =>
                    handleUpdateFrame({
                      validationThinking: { ...frame.validationThinking, successSignals: items },
                    })
                  }
                  placeholder="How will you know it worked?"
                  isReadOnly={isReadOnly}
                  ordered={false}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Disconfirming Evidence
                </label>
                <EditableList
                  items={frame.validationThinking.disconfirmingEvidence}
                  onChange={(items) =>
                    handleUpdateFrame({
                      validationThinking: { ...frame.validationThinking, disconfirmingEvidence: items },
                    })
                  }
                  placeholder="What would prove this wrong?"
                  isReadOnly={isReadOnly}
                  ordered={false}
                />
              </div>
            </div>
          </FrameSection>

          {/* Fixed Checklist Section - Based on Activity Type (only for draft) */}
          {isDraft && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div
                className={cn(
                  'flex items-center justify-between px-5 py-3 cursor-pointer select-none',
                  !collapsedSections.has('checklist') && 'border-b border-slate-100'
                )}
                onClick={() => toggleSection('checklist')}
              >
                <div className="flex items-center gap-2">
                  <button className="p-0.5 hover:bg-slate-100 rounded transition-colors">
                    {collapsedSections.has('checklist') ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  <CheckSquare className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {frame.type === 'bug' ? 'Bug Fix' : frame.type === 'feature' ? 'Feature' : 'Exploration'} Checklist
                  </h3>
                  {allChecked && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      Complete
                    </span>
                  )}
                </div>
                {collapsedSections.has('checklist') && !allChecked && (
                  <span className="text-xs text-amber-600">
                    {checkedCount}/{checklist.length} checked
                  </span>
                )}
              </div>
              {!collapsedSections.has('checklist') && (
                <div className="p-5 space-y-3">
                  {checklist.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                        checkedItems.has(item.id)
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      <Checkbox
                        checked={checkedItems.has(item.id)}
                        onCheckedChange={() => toggleCheckItem(item.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className={cn(
                          'text-sm font-medium',
                          checkedItems.has(item.id) ? 'text-emerald-700' : 'text-slate-700'
                        )}>
                          {item.label}
                        </span>
                        <p className={cn(
                          'text-xs mt-0.5',
                          checkedItems.has(item.id) ? 'text-emerald-600' : 'text-slate-500'
                        )}>
                          {item.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Owner & Date Info */}
          <div className="flex items-center justify-between text-sm text-slate-500 px-2">
            <span>
              Owner: <span className="font-medium text-slate-700">{owner?.name}</span>
            </span>
            <span>Last updated: {formatDate(frame.updatedAt)}</span>
          </div>

          {/* Spacer for fixed footer */}
          <div className="h-20" />
        </div>
      </div>

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
              {isDraft && !allChecked && (
                <span className="text-slate-500">
                  Complete checklist to submit ({checkedCount}/{checklist.length})
                </span>
              )}
              {isDraft && allChecked && (
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
                        onBack();
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
                      onBack();
                    }}
                  >
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => submitForReview(frame.id)}
                    disabled={!allChecked}
                  >
                    Submit for Review
                  </Button>
                </>
              )}

              {/* In Review status actions */}
              {isInReview && (
                <>
                  <Button variant="outline" onClick={onBack}>
                    Back
                  </Button>
                  <Button onClick={() => markAsReady(frame.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Ready
                  </Button>
                </>
              )}

              {/* Ready status actions */}
              {isReady && (
                <>
                  <Button variant="outline" onClick={onBack}>
                    Back
                  </Button>
                  <Button onClick={() => startFeedback(frame.id)}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Implementation
                  </Button>
                </>
              )}

              {/* Feedback status actions */}
              {isFeedback && (
                <>
                  <Button variant="outline" onClick={onBack}>
                    Back
                  </Button>
                  <Button onClick={onOpenFeedback}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete with Feedback
                  </Button>
                </>
              )}

              {/* Archived status actions */}
              {isArchived && (
                <Button variant="outline" onClick={onBack}>
                  Back to Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI Chat Button - not shown for archived/feedback */}
      {!isReadOnly && (
        <button
          onClick={() => setShowAISidebar(true)}
          className={cn(
            'fixed bottom-20 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40',
            'hover:scale-105 active:scale-95',
            showAISidebar && 'hidden'
          )}
        >
          <Bot className="h-5 w-5" />
        </button>
      )}

      {/* Floating AI Sidebar - not shown for archived/feedback */}
      {!isReadOnly && (
        <FloatingAISidebar
          open={showAISidebar}
          onClose={() => setShowAISidebar(false)}
          frame={frame}
          focusedSection={focusedSection}
          onOpenAIConfig={onOpenAIConfig}
        />
      )}
    </div>
  );
}
