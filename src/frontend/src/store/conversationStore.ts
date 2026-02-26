import { create } from 'zustand';
import {
  Conversation,
  ConversationMessage,
  ConversationPurpose,
  ConversationState,
  ConversationListItem,
  KnowledgeSearchResult,
} from '@/types';
import { getAPIClient } from '@/lib/api';
import { useProjectStore } from './projectStore';
import { useFrameStore } from './index';

interface ConversationStore {
  // Data
  activeConversation: Conversation | null;
  conversations: ConversationListItem[];
  relevantKnowledge: Array<Record<string, unknown>>;

  // UI State
  isTyping: boolean;
  isLoading: boolean;
  isPreviewing: boolean;
  previewContent: Record<string, string> | null;
  previewMessageCount: number;
  error: string | null;

  // Actions
  startConversation: (owner: string, purpose?: ConversationPurpose, frameId?: string) => Promise<Conversation>;
  sendMessage: (content: string, senderName?: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  previewFrame: () => Promise<void>;
  clearPreview: () => void;
  synthesizeFrame: () => Promise<string | null>;
  summarizeReview: () => Promise<string | null>;
  loadConversation: (id: string) => Promise<void>;
  loadConversations: (owner?: string) => Promise<void>;
  clearConversation: () => void;
  setError: (error: string | null) => void;
}

function transformConversationResponse(response: any): Conversation {
  return {
    id: response.id,
    owner: response.owner,
    status: response.status,
    purpose: response.purpose || 'authoring',
    frameId: response.frame_id,
    projectId: response.project_id,
    messages: response.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      metadata: m.metadata,
      senderName: m.sender_name,
    })),
    state: {
      frameType: response.state.frame_type,
      sectionsCovered: {
        problemStatement: response.state.sections_covered?.problem_statement ?? 0,
        rootCause: response.state.sections_covered?.root_cause ?? 0,
        userPerspective: response.state.sections_covered?.user_perspective ?? 0,
        engineeringFraming: response.state.sections_covered?.engineering_framing ?? 0,
        validationThinking: response.state.sections_covered?.validation_thinking ?? 0,
      },
      gaps: response.state.gaps || [],
      readyToSynthesize: response.state.ready_to_synthesize || false,
    },
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

function transformStateResponse(state: any): ConversationState {
  return {
    frameType: state.frame_type,
    sectionsCovered: {
      problemStatement: state.sections_covered?.problem_statement ?? 0,
      rootCause: state.sections_covered?.root_cause ?? 0,
      userPerspective: state.sections_covered?.user_perspective ?? 0,
      engineeringFraming: state.sections_covered?.engineering_framing ?? 0,
      validationThinking: state.sections_covered?.validation_thinking ?? 0,
    },
    gaps: state.gaps || [],
    readyToSynthesize: state.ready_to_synthesize || false,
  };
}

export const useConversationStore = create<ConversationStore>()((set, get) => ({
  activeConversation: null,
  conversations: [],
  relevantKnowledge: [],
  isTyping: false,
  isLoading: false,
  isPreviewing: false,
  previewContent: null,
  previewMessageCount: 0,
  error: null,

  setError: (error) => set({ error }),

  startConversation: async (owner, purpose?, frameId?) => {
    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const projectId = useProjectStore.getState().currentProjectId;
      const response = await api.startConversation(owner, purpose, frameId, projectId ?? undefined);
      const conv = transformConversationResponse(response);
      set({ activeConversation: conv, isLoading: false, relevantKnowledge: [] });
      return conv;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to start conversation',
        isLoading: false,
      });
      throw err;
    }
  },

  sendMessage: async (content, senderName?) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    const wasSynthesized = activeConversation.status === 'synthesized';

    // Optimistically add user message and reactivate if synthesized
    const userMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      senderName,
    };

    set((s) => ({
      activeConversation: s.activeConversation
        ? {
            ...s.activeConversation,
            status: wasSynthesized ? 'active' : s.activeConversation.status,
            messages: [...s.activeConversation.messages, userMsg],
          }
        : null,
      isTyping: true,
      error: null,
      // Invalidate preview cache since conversation changed
      previewContent: null,
      previewMessageCount: 0,
    }));

    try {
      const api = getAPIClient();
      const contentLanguage = useFrameStore.getState().contentLanguage;
      const response = await api.sendConversationMessage(
        activeConversation.id,
        content,
        senderName,
        contentLanguage !== 'en' ? contentLanguage : undefined
      );

      const aiMsg: ConversationMessage = {
        id: response.ai_response.id,
        role: 'assistant',
        content: response.ai_response.content,
        timestamp: response.ai_response.timestamp,
        metadata: response.ai_response.metadata,
      };

      const updatedState = transformStateResponse(response.state);

      set((s) => ({
        activeConversation: s.activeConversation
          ? {
              ...s.activeConversation,
              messages: [
                // Replace temp user msg with real one, add AI response
                ...s.activeConversation.messages.filter(
                  (m) => m.id !== userMsg.id
                ),
                {
                  id: response.message.id,
                  role: 'user',
                  content: response.message.content,
                  timestamp: response.message.timestamp,
                  metadata: response.message.metadata,
                  senderName: response.message.sender_name,
                },
                aiMsg,
              ],
              state: updatedState,
            }
          : null,
        relevantKnowledge: response.relevant_knowledge || [],
        isTyping: false,
      }));
    } catch (err) {
      // Mark the user message as failed so the user can retry
      set((s) => ({
        activeConversation: s.activeConversation
          ? {
              ...s.activeConversation,
              messages: s.activeConversation.messages.map((m) =>
                m.id === userMsg.id ? { ...m, status: 'failed' as const } : m
              ),
            }
          : null,
        error: err instanceof Error ? err.message : 'Failed to send message',
        isTyping: false,
      }));
    }
  },

  retryMessage: async (messageId) => {
    const { activeConversation } = get();
    if (!activeConversation) return;

    const failedMsg = activeConversation.messages.find(
      (m) => m.id === messageId && m.status === 'failed'
    );
    if (!failedMsg) return;

    // Remove the failed message and re-send
    set((s) => ({
      activeConversation: s.activeConversation
        ? {
            ...s.activeConversation,
            messages: s.activeConversation.messages.filter((m) => m.id !== messageId),
          }
        : null,
      error: null,
    }));

    // Re-send through the normal sendMessage path
    await get().sendMessage(failedMsg.content, failedMsg.senderName);
  },

  previewFrame: async () => {
    const { activeConversation, previewContent, previewMessageCount } = get();
    if (!activeConversation) return;

    const currentMsgCount = activeConversation.messages.length;

    // Reuse cached preview if no new messages since last preview
    if (previewContent && previewMessageCount === currentMsgCount) {
      return; // Modal will show from existing previewContent
    }

    set({ isPreviewing: true, error: null });
    try {
      const api = getAPIClient();
      const response = await api.previewFrame(activeConversation.id);
      set({
        previewContent: response.content,
        previewMessageCount: currentMsgCount,
        isPreviewing: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to preview frame',
        isPreviewing: false,
      });
    }
  },

  clearPreview: () => set({ previewContent: null }),

  synthesizeFrame: async () => {
    const { activeConversation, previewContent, previewMessageCount } = get();
    if (!activeConversation) return null;

    // Reuse cached preview content if still fresh (no new messages since preview)
    const currentMsgCount = activeConversation.messages.length;
    const cachedContent =
      previewContent && previewMessageCount === currentMsgCount
        ? previewContent
        : undefined;

    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const response = await api.synthesizeFrame(activeConversation.id, cachedContent);

      set((s) => ({
        activeConversation: s.activeConversation
          ? {
              ...s.activeConversation,
              status: 'synthesized',
              frameId: response.frame_id,
            }
          : null,
        isLoading: false,
        previewContent: null,
        previewMessageCount: 0,
      }));

      return response.frame_id;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to synthesize frame',
        isLoading: false,
      });
      return null;
    }
  },

  summarizeReview: async () => {
    const { activeConversation } = get();
    if (!activeConversation) return null;

    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      await api.summarizeReview(activeConversation.id);
      set({ isLoading: false });
      return activeConversation.frameId;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to summarize review',
        isLoading: false,
      });
      return null;
    }
  },

  loadConversation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const response = await api.getConversation(id);
      const conv = transformConversationResponse(response);
      set({ activeConversation: conv, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load conversation',
        isLoading: false,
      });
    }
  },

  loadConversations: async (owner?) => {
    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const projectId = useProjectStore.getState().currentProjectId;
      const filters: Record<string, string> = {};
      if (owner) filters.owner = owner;
      if (projectId) filters.project_id = projectId;
      const response = await api.listConversations(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      const conversations: ConversationListItem[] = response.map((item) => ({
        id: item.id,
        owner: item.owner,
        status: item.status as any,
        purpose: (item.purpose || 'authoring') as ConversationPurpose,
        frameId: item.frame_id,
        projectId: item.project_id,
        messageCount: item.message_count,
        updatedAt: item.updated_at,
      }));
      set({ conversations, isLoading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to load conversations',
        isLoading: false,
      });
    }
  },

  clearConversation: () =>
    set({ activeConversation: null, relevantKnowledge: [], previewContent: null, previewMessageCount: 0 }),
}));
