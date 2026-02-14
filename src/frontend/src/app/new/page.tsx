'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles, Loader2, Lock, FileText } from 'lucide-react';
import { useConversationStore } from '@/store/conversationStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChatInterface } from '@/components/conversation/ChatInterface';
import { CoveragePanel } from '@/components/conversation/CoveragePanel';
import { KnowledgeCards } from '@/components/conversation/KnowledgeCards';
import { MarkdownContent } from '@/components/frame/MarkdownContent';
import { Button } from '@/components/ui/button';
import { getAPIClient } from '@/lib/api';
import { transformFrameResponse } from '@/lib/api/transforms';
import type { Frame } from '@/types';

export default function NewFramePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get('conversation');
  const { user } = useAuthContext();
  const {
    activeConversation,
    relevantKnowledge,
    isTyping,
    isLoading,
    error,
    startConversation,
    sendMessage,
    retryMessage,
    synthesizeFrame,
    summarizeReview,
    loadConversation,
    clearConversation,
  } = useConversationStore();

  const [isLocked, setIsLocked] = useState(false);
  const [linkedFrame, setLinkedFrame] = useState<Frame | null>(null);

  // Start or load conversation on mount
  useEffect(() => {
    if (conversationParam) {
      // Load existing conversation
      loadConversation(conversationParam);
    } else if (!activeConversation && user) {
      startConversation(user.id);
    }
    return () => {
      // Clear on unmount only if not synthesized and not viewing existing
      if (!conversationParam) {
        const conv = useConversationStore.getState().activeConversation;
        if (conv && conv.status === 'active') {
          clearConversation();
        }
      } else {
        clearConversation();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch linked frame and check lock status
  useEffect(() => {
    async function checkFrameAndLock() {
      if (!activeConversation?.frameId) return;
      try {
        const api = getAPIClient();
        const frameResp = await api.getFrame(activeConversation.frameId);
        const frame = transformFrameResponse(frameResp);
        setLinkedFrame(frame);

        // Lock authoring conversations when frame is under review+
        const purpose = activeConversation.purpose || 'authoring';
        if (purpose === 'authoring') {
          const lockedStatuses = ['in_review', 'ready', 'feedback', 'archived'];
          if (lockedStatuses.includes(frame.status)) {
            setIsLocked(true);
          }
        }
      } catch {
        // Frame may have been deleted
      }
    }
    checkFrameAndLock();
  }, [activeConversation?.frameId, activeConversation?.purpose]);

  const handleSynthesize = async () => {
    const frameId = await synthesizeFrame();
    if (frameId) {
      router.push(`/frame/${frameId}`);
    }
  };

  const state = activeConversation?.state || {
    frameType: null,
    sectionsCovered: {
      problemStatement: 0,
      userPerspective: 0,
      engineeringFraming: 0,
      validationThinking: 0,
    },
    gaps: [],
    readyToSynthesize: false,
  };

  const isSynthesized = activeConversation?.status === 'synthesized';
  const hasLinkedFrame = !!activeConversation?.frameId;
  const isReview = activeConversation?.purpose === 'review';

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!conversationParam) {
                    clearConversation();
                  }
                  router.back();
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">
                  {isReview ? 'Review Conversation' : hasLinkedFrame ? 'Continue Conversation' : 'New Frame'}
                </h1>
                <p className="text-xs text-slate-500">
                  {isReview
                    ? 'Discuss this frame with the Review Coach'
                    : hasLinkedFrame
                    ? 'Continue refining — re-synthesize to update your frame'
                    : "Describe your problem and I'll help you frame it"}
                </p>
              </div>
            </div>
            {error && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                {error}
              </span>
            )}
          </div>
        </div>

        {/* Lock Banner */}
        {isLocked && (
          <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-2">
            <div className="flex items-center gap-2 text-amber-700 text-xs">
              <Lock className="h-3.5 w-3.5" />
              This conversation is locked because the frame is under review.
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={activeConversation?.messages || []}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            onRetryMessage={retryMessage}
            disabled={!activeConversation || isLocked}
            userName={user?.name || user?.email}
            botName={isReview ? 'Review Coach' : 'Coach'}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 bg-white border-l border-slate-200 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isReview && linkedFrame ? (
            /* Review mode: show frame content as read-only context */
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Frame Context
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Problem</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{linkedFrame.problemStatement}</p>
                </div>
                {linkedFrame.userPerspective && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">User Perspective</h4>
                    <div className="text-xs text-slate-600 leading-relaxed prose prose-xs max-w-none">
                      <MarkdownContent content={linkedFrame.userPerspective} />
                    </div>
                  </div>
                )}
                {linkedFrame.engineeringFraming && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Engineering</h4>
                    <div className="text-xs text-slate-600 leading-relaxed prose prose-xs max-w-none">
                      <MarkdownContent content={linkedFrame.engineeringFraming} />
                    </div>
                  </div>
                )}
                {linkedFrame.validationThinking && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Validation</h4>
                    <div className="text-xs text-slate-600 leading-relaxed prose prose-xs max-w-none">
                      <MarkdownContent content={linkedFrame.validationThinking} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Authoring mode: show coverage + knowledge */
            <>
              <CoveragePanel state={state} />
              <KnowledgeCards items={relevantKnowledge} />
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4 space-y-2">
          {isReview ? (
            /* Review mode: Summarize Review button */
            <>
              <Button
                className="w-full gap-2"
                onClick={async () => {
                  const frameId = await summarizeReview();
                  if (frameId) {
                    router.push(`/frame/${frameId}`);
                  }
                }}
                disabled={isLoading || !activeConversation || (activeConversation.messages.length < 2)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Summarize Review
                  </>
                )}
              </Button>
              {hasLinkedFrame && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/frame/${activeConversation!.frameId}`)}
                >
                  View Frame
                </Button>
              )}
            </>
          ) : isLocked ? (
            /* Locked mode: only view frame */
            hasLinkedFrame && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/frame/${activeConversation!.frameId}`)}
              >
                View Frame
              </Button>
            )
          ) : (
            /* Normal authoring mode */
            <>
              <Button
                className="w-full gap-2"
                onClick={handleSynthesize}
                disabled={!activeConversation || (activeConversation.messages.length < 2) || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {hasLinkedFrame ? 'Updating...' : 'Synthesizing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {hasLinkedFrame ? 'Update Frame' : 'Synthesize Frame'}
                  </>
                )}
              </Button>
              {hasLinkedFrame && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(`/frame/${activeConversation!.frameId}`)
                  }
                >
                  View Frame
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
