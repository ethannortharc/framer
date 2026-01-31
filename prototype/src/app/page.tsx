'use client';

import React, { useState, useEffect } from 'react';
import { useFrameStore } from '@/store';
import { FrameType, FrameSection, Frame, FrameFeedback } from '@/types';
import { LeftNav } from '@/components/layout/LeftNav';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { TemplateSpace } from '@/components/templates/TemplateSpace';
import { ArchiveSpace } from '@/components/archive/ArchiveSpace';
import { FrameDetail } from '@/components/frame/FrameDetail';
import { NewFrameModal } from '@/components/modals/NewFrameModal';
import { AIConfigModal } from '@/components/modals/AIConfigModal';
import { RefineDialog } from '@/components/modals/RefineDialog';
import { CommentDialog } from '@/components/modals/CommentDialog';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { QuestionnaireDialog } from '@/components/modals/QuestionnaireDialog';
import { FrameQuestionnaireModal } from '@/components/modals/FrameQuestionnaireModal';
import { FeedbackDialog } from '@/components/modals/FeedbackDialog';
import { AuthModal } from '@/components/modals/AuthModal';

export default function Home() {
  const {
    selectedFrameId,
    setSelectedFrame,
    getFrame,
    createFrame,
    updateFrame,
    addComment,
    submitFeedback,
    currentSpace,
    useAPI,
    loadFrames,
    isLoading,
    error,
    setError,
  } = useFrameStore();

  // Load frames from API on mount if in API mode
  useEffect(() => {
    if (useAPI) {
      loadFrames();
    }
  }, [useAPI, loadFrames]);

  // Modal states
  const [showNewFrameModal, setShowNewFrameModal] = useState(false);
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showQuestionnaireDialog, setShowQuestionnaireDialog] = useState(false);
  const [showFrameQuestionnaire, setShowFrameQuestionnaire] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Track which section we're working on
  const [activeSection, setActiveSection] = useState<FrameSection | null>(null);

  // Track pending frame type for questionnaire flow
  const [pendingFrameType, setPendingFrameType] = useState<FrameType | null>(null);

  const selectedFrame = selectedFrameId ? getFrame(selectedFrameId) : null;

  // Handle frame type selection from NewFrameModal
  const handleFrameTypeSelected = async (type: FrameType, useQuestionnaire: boolean) => {
    if (useQuestionnaire) {
      // Start questionnaire flow
      setPendingFrameType(type);
      setShowNewFrameModal(false);
      setShowFrameQuestionnaire(true);
    } else {
      // Create frame directly with manual input
      try {
        const frame = await createFrame(type);
        setSelectedFrame(frame.id);
        setShowNewFrameModal(false);
      } catch (err) {
        console.error('Failed to create frame:', err);
      }
    }
  };

  // Handle questionnaire-generated frame content
  const handleApplyFrameQuestionnaire = async (data: Partial<Frame>) => {
    if (!pendingFrameType) return;

    try {
      // Create the frame with questionnaire data
      const frame = await createFrame(pendingFrameType);

      // Apply the questionnaire data
      await updateFrame(frame.id, {
        problemStatement: data.problemStatement || '',
        userPerspective: data.userPerspective || frame.userPerspective,
        engineeringFraming: data.engineeringFraming || frame.engineeringFraming,
        validationThinking: data.validationThinking || frame.validationThinking,
      });

      setSelectedFrame(frame.id);
      setPendingFrameType(null);
    } catch (err) {
      console.error('Failed to create frame from questionnaire:', err);
    }
  };

  // Handle opening refine dialog
  const handleOpenRefineDialog = (section: FrameSection) => {
    setActiveSection(section);
    setShowRefineDialog(true);
  };

  // Handle opening comment dialog
  const handleOpenCommentDialog = (section: FrameSection) => {
    setActiveSection(section);
    setShowCommentDialog(true);
  };

  // Handle opening questionnaire dialog
  const handleOpenQuestionnaire = (section: FrameSection) => {
    setActiveSection(section);
    setShowQuestionnaireDialog(true);
  };

  // Handle opening feedback dialog
  const handleOpenFeedback = () => {
    setShowFeedbackDialog(true);
  };

  // Handle feedback submission
  const handleSubmitFeedback = (feedback: FrameFeedback) => {
    if (selectedFrame) {
      submitFeedback(selectedFrame.id, feedback);
      setSelectedFrame(null);
    }
  };

  // Handle applying refined content from AI dialog
  const handleApplyRefinedContent = (section: FrameSection, content: string) => {
    if (!selectedFrame) return;

    // Parse and apply content based on section
    switch (section) {
      case 'header':
        updateFrame(selectedFrame.id, { problemStatement: content });
        break;
      case 'user':
        console.log('Apply user content:', content);
        break;
      case 'engineering':
        console.log('Apply engineering content:', content);
        break;
      case 'validation':
        console.log('Apply validation content:', content);
        break;
    }
  };

  // Handle applying questionnaire-generated content
  const handleApplyQuestionnaireContent = (section: FrameSection, data: any) => {
    if (!selectedFrame) return;

    console.log('Apply questionnaire content for', section, ':', data);

    if (data.raw) {
      const rawContent = data.raw as string;

      switch (section) {
        case 'header':
          updateFrame(selectedFrame.id, { problemStatement: rawContent });
          break;
        case 'user':
          const userMatch = rawContent.match(/User:\s*(.+?)(?:\n|$)/);
          const contextMatch = rawContent.match(/Context:\s*([\s\S]+?)(?:\n\n|$)/);
          const journeyMatch = rawContent.match(/Journey:\n([\s\S]+?)(?:\n\nPain Points:|$)/);
          const painMatch = rawContent.match(/Pain Points:\n([\s\S]+?)$/);

          updateFrame(selectedFrame.id, {
            userPerspective: {
              user: userMatch?.[1]?.trim() || selectedFrame.userPerspective.user,
              context: contextMatch?.[1]?.trim() || selectedFrame.userPerspective.context,
              journeySteps: journeyMatch
                ? journeyMatch[1].split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '').trim())
                : selectedFrame.userPerspective.journeySteps,
              painPoints: painMatch
                ? painMatch[1].split('\n').filter(s => s.trim()).map(s => s.replace(/^[•-]\s*/, '').trim())
                : selectedFrame.userPerspective.painPoints,
            },
          });
          break;
        case 'engineering':
          const principlesMatch = rawContent.match(/Principles:\n([\s\S]+?)(?:\n\nNon-goals:|$)/);
          const nonGoalsMatch = rawContent.match(/Non-goals:\n([\s\S]+?)$/);

          updateFrame(selectedFrame.id, {
            engineeringFraming: {
              principles: principlesMatch
                ? principlesMatch[1].split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '').trim())
                : selectedFrame.engineeringFraming.principles,
              nonGoals: nonGoalsMatch
                ? nonGoalsMatch[1].split('\n').filter(s => s.trim()).map(s => s.replace(/^[•-]\s*/, '').trim())
                : selectedFrame.engineeringFraming.nonGoals,
            },
          });
          break;
        case 'validation':
          const successMatch = rawContent.match(/Success Signals[^:]*:\n([\s\S]+?)(?:\n\nDisconfirming|$)/);
          const disconfirmMatch = rawContent.match(/Disconfirming Evidence:\n([\s\S]+?)$/);

          updateFrame(selectedFrame.id, {
            validationThinking: {
              successSignals: successMatch
                ? successMatch[1].split('\n').filter(s => s.trim()).map(s => s.replace(/^[•-]\s*/, '').trim())
                : selectedFrame.validationThinking.successSignals,
              disconfirmingEvidence: disconfirmMatch
                ? disconfirmMatch[1].split('\n').filter(s => s.trim()).map(s => s.replace(/^[•-]\s*/, '').trim())
                : selectedFrame.validationThinking.disconfirmingEvidence,
            },
          });
          break;
      }
    }
  };

  // Handle submitting a comment
  const handleSubmitComment = (content: string) => {
    if (!selectedFrame || !activeSection) return;
    addComment(selectedFrame.id, activeSection, content);
  };

  // Render content based on current space
  const renderSpaceContent = () => {
    // If a frame is selected in working space, show detail view
    if (currentSpace === 'working' && selectedFrame) {
      return (
        <FrameDetail
          frame={selectedFrame}
          onBack={() => setSelectedFrame(null)}
          onOpenRefineDialog={handleOpenRefineDialog}
          onOpenAIConfig={() => setShowAIConfigModal(true)}
          onOpenCommentDialog={handleOpenCommentDialog}
          onOpenQuestionnaire={handleOpenQuestionnaire}
          onOpenFeedback={handleOpenFeedback}
        />
      );
    }

    switch (currentSpace) {
      case 'working':
        return (
          <Dashboard
            onFrameClick={(id) => setSelectedFrame(id)}
            onNewFrame={() => setShowNewFrameModal(true)}
          />
        );
      case 'templates':
        return <TemplateSpace />;
      case 'archive':
        return <ArchiveSpace />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Left Navigation */}
      <LeftNav
        onSettingsClick={() => setShowSettingsModal(true)}
        onLoginClick={() => setShowAuthModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
            <span className="text-sm text-blue-700">Loading...</span>
          </div>
        )}

        {renderSpaceContent()}
      </div>

      {/* Modals */}
      <NewFrameModal
        open={showNewFrameModal}
        onOpenChange={setShowNewFrameModal}
        onSelectType={handleFrameTypeSelected}
      />

      <FrameQuestionnaireModal
        open={showFrameQuestionnaire}
        onOpenChange={(open) => {
          setShowFrameQuestionnaire(open);
          if (!open) setPendingFrameType(null);
        }}
        frameType={pendingFrameType}
        onApply={handleApplyFrameQuestionnaire}
      />

      <AIConfigModal
        open={showAIConfigModal}
        onOpenChange={setShowAIConfigModal}
      />

      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        onOpenAIConfig={() => {
          setShowSettingsModal(false);
          setShowAIConfigModal(true);
        }}
      />

      <RefineDialog
        open={showRefineDialog}
        onOpenChange={setShowRefineDialog}
        section={activeSection}
        frame={selectedFrame || null}
        onApply={handleApplyRefinedContent}
      />

      <CommentDialog
        open={showCommentDialog}
        onOpenChange={setShowCommentDialog}
        section={activeSection}
        onSubmit={handleSubmitComment}
      />

      {selectedFrame && (
        <QuestionnaireDialog
          open={showQuestionnaireDialog}
          onOpenChange={setShowQuestionnaireDialog}
          section={activeSection}
          frameType={selectedFrame.type}
          frame={selectedFrame}
          onApply={handleApplyQuestionnaireContent}
        />
      )}

      <FeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        frame={selectedFrame ?? null}
        onSubmit={handleSubmitFeedback}
      />

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          // Reload frames after successful login
          if (useAPI) {
            loadFrames();
          }
        }}
      />
    </div>
  );
}
