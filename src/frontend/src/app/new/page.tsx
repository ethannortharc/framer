'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { useConversationStore } from '@/store/conversationStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChatInterface } from '@/components/conversation/ChatInterface';
import { CoveragePanel } from '@/components/conversation/CoveragePanel';
import { KnowledgeCards } from '@/components/conversation/KnowledgeCards';
import { Button } from '@/components/ui/button';

export default function NewFramePage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const {
    activeConversation,
    relevantKnowledge,
    isTyping,
    isLoading,
    error,
    startConversation,
    sendMessage,
    synthesizeFrame,
    clearConversation,
  } = useConversationStore();

  // Start conversation on mount
  useEffect(() => {
    if (!activeConversation && user) {
      startConversation(user.id);
    }
    return () => {
      // Clear on unmount only if not synthesized
      const conv = useConversationStore.getState().activeConversation;
      if (conv && conv.status === 'active') {
        clearConversation();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                  clearConversation();
                  router.push('/dashboard');
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-slate-900">
                  New Frame
                </h1>
                <p className="text-xs text-slate-500">
                  Describe your problem and I&apos;ll help you frame it
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

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={activeConversation?.messages || []}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            disabled={!activeConversation || isSynthesized}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-72 bg-white border-l border-slate-200 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Coverage */}
          <CoveragePanel state={state} />

          {/* Knowledge */}
          <KnowledgeCards items={relevantKnowledge} />
        </div>

        {/* Synthesize Button */}
        <div className="flex-shrink-0 border-t border-slate-200 p-4">
          <Button
            className="w-full gap-2"
            onClick={handleSynthesize}
            disabled={!state.readyToSynthesize || isLoading || isSynthesized}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Synthesizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Synthesize Frame
              </>
            )}
          </Button>
          {!state.readyToSynthesize && activeConversation && (
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Continue the conversation to build enough coverage
            </p>
          )}
          {isSynthesized && activeConversation?.frameId && (
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() =>
                router.push(`/frame/${activeConversation.frameId}`)
              }
            >
              View Frame
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
