import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Frame, FrameSection, AIConfig, FrameType, FrameStatus, ReviewComment, FrameFeedback, AppSpace } from '@/types';
import { getAPIClient, transformFrameResponse, transformFrameToContent, transformAIEvaluation } from '@/lib/api';
import { useProjectStore } from './projectStore';

interface FrameStore {
  // Data
  frames: Frame[];

  // UI State
  selectedFrameId: string | null;
  focusedSection: FrameSection | null;
  currentSpace: AppSpace;

  // Loading & Error State
  isLoading: boolean;
  error: string | null;

  // Track unsaved frames (frames created but not explicitly saved)
  unsavedFrameIds: Set<string>;

  // AI Config
  aiConfig: AIConfig | null;

  // Actions
  setSelectedFrame: (id: string | null) => void;
  setFocusedSection: (section: FrameSection | null) => void;
  setCurrentSpace: (space: AppSpace) => void;
  setAIConfig: (config: AIConfig | null) => void;
  setError: (error: string | null) => void;

  // Frame CRUD
  createFrame: (type: FrameType, ownerId: string) => Promise<Frame>;
  updateFrame: (id: string, updates: Partial<Frame>) => Promise<void>;
  deleteFrame: (id: string) => Promise<void>;
  saveFrame: (id: string) => Promise<void>;
  discardUnsavedFrame: (id: string) => void;
  isFrameSaved: (id: string) => boolean;
  loadFrames: () => Promise<void>;

  // Frame Status
  submitForReview: (id: string, reviewerId?: string) => Promise<void>;
  markAsReady: (id: string) => Promise<void>;
  startFeedback: (id: string) => Promise<void>;
  submitFeedback: (id: string, feedback: FrameFeedback) => Promise<void>;

  // AI Operations
  evaluateFrame: (id: string) => Promise<void>;

  // Comments
  addComment: (frameId: string, section: FrameSection, content: string, authorId: string) => Promise<void>;

  // Get helpers
  getFrame: (id: string) => Frame | undefined;
  getFramesByStatus: (status: FrameStatus) => Frame[];
  getWorkingFrames: () => Frame[];
  getArchivedFrames: () => Frame[];
}

export const useFrameStore = create<FrameStore>()(
  persist(
    (set, get) => ({
      // Initial data - empty, will be loaded from API
      frames: [],

      // UI State
      selectedFrameId: null,
      focusedSection: null,
      currentSpace: 'working',

      // Loading & Error State
      isLoading: false,
      error: null,

      // Track unsaved frames
      unsavedFrameIds: new Set(),

      // AI Config
      aiConfig: null,

      // Actions
      setSelectedFrame: (id) => set({ selectedFrameId: id }),
      setFocusedSection: (section) => set({ focusedSection: section }),
      setCurrentSpace: (space) => set({ currentSpace: space, selectedFrameId: null }),
      setAIConfig: (config) => set({ aiConfig: config }),
      setError: (error) => set({ error }),

      // Load frames from API
      loadFrames: async () => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const projectId = useProjectStore.getState().currentProjectId;
          const frameList = await api.listFrames(
            projectId ? { project_id: projectId } : undefined
          );

          // Load full details for each frame
          const frames: Frame[] = [];
          for (const item of frameList) {
            try {
              const response = await api.getFrame(item.id);
              frames.push(transformFrameResponse(response));
            } catch {
              // Skip frames that fail to load
              console.warn(`Failed to load frame ${item.id}`);
            }
          }

          set({ frames, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to load frames',
            isLoading: false,
          });
        }
      },

      // Frame CRUD
      createFrame: async (type, ownerId) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const projectId = useProjectStore.getState().currentProjectId;
          const response = await api.createFrame({
            type,
            owner: ownerId,
            project_id: projectId ?? undefined,
          });
          const newFrame = transformFrameResponse(response);

          set((s) => ({
            frames: [...s.frames, newFrame],
            selectedFrameId: newFrame.id,
            isLoading: false,
          }));

          return newFrame;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to create frame',
            isLoading: false,
          });
          throw err;
        }
      },

      updateFrame: async (id, updates) => {
        // Update local state first (optimistic update)
        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: new Date() }
              : f
          ),
        }));

        try {
          const frame = get().getFrame(id);
          if (!frame) return;

          const api = getAPIClient();
          await api.updateFrame(id, transformFrameToContent(frame));
        } catch (err) {
          // Revert on error
          set({ error: err instanceof Error ? err.message : 'Failed to update frame' });
        }
      },

      deleteFrame: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          await api.deleteFrame(id);
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to delete frame',
            isLoading: false,
          });
          return;
        }

        set((s) => {
          const newUnsaved = new Set(s.unsavedFrameIds);
          newUnsaved.delete(id);
          return {
            frames: s.frames.filter((f) => f.id !== id),
            selectedFrameId: s.selectedFrameId === id ? null : s.selectedFrameId,
            unsavedFrameIds: newUnsaved,
            isLoading: false,
          };
        });
      },

      saveFrame: async (id) => {
        const frame = get().getFrame(id);
        if (!frame) return;

        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          await api.updateFrame(id, transformFrameToContent(frame));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to save frame',
            isLoading: false,
          });
          return;
        }

        set((s) => {
          const newUnsaved = new Set(s.unsavedFrameIds);
          newUnsaved.delete(id);
          return {
            unsavedFrameIds: newUnsaved,
            isLoading: false,
          };
        });
      },

      discardUnsavedFrame: (id) => {
        const state = get();
        if (state.unsavedFrameIds.has(id)) {
          get().deleteFrame(id);
        }
      },

      isFrameSaved: (id) => {
        return !get().unsavedFrameIds.has(id);
      },

      // Frame Status
      submitForReview: async (id, reviewerId?) => {
        const frame = get().getFrame(id);
        if (!frame) return;

        // Mark as saved first
        await get().saveFrame(id);

        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();

          // Assign reviewer if provided
          if (reviewerId) {
            await api.updateFrameMeta(id, { reviewer: reviewerId });
          }

          // Update status via API
          await api.updateFrameStatus(id, 'in_review');

          // Evaluate frame with AI
          const evaluation = await api.evaluateFrame(id);
          const transformed = transformAIEvaluation(evaluation);

          set((s) => ({
            frames: s.frames.map((f) =>
              f.id === id
                ? {
                    ...f,
                    status: 'in_review' as FrameStatus,
                    aiScore: transformed.score,
                    aiScoreBreakdown: transformed.breakdown,
                    aiIssues: transformed.issues,
                    aiFeedback: transformed.feedback,
                    updatedAt: new Date(),
                  }
                : f
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to submit for review',
            isLoading: false,
          });
        }
      },

      markAsReady: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          await api.updateFrameStatus(id, 'ready');
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to mark as ready',
            isLoading: false,
          });
          return;
        }

        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? { ...f, status: 'ready' as FrameStatus, updatedAt: new Date() }
              : f
          ),
        }));
      },

      startFeedback: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          await api.updateFrameStatus(id, 'feedback');
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to start feedback',
            isLoading: false,
          });
          return;
        }

        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? { ...f, status: 'feedback' as FrameStatus, updatedAt: new Date() }
              : f
          ),
        }));
      },

      submitFeedback: async (id, feedback) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          await api.submitFeedback(id, {
            outcome: feedback.outcome,
            summary: feedback.summary,
            lessons_learned: feedback.lessonsLearned,
          });
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to submit feedback',
            isLoading: false,
          });
          return;
        }

        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'archived' as FrameStatus,
                  feedback,
                  updatedAt: new Date(),
                }
              : f
          ),
        }));
      },

      // AI Operations
      evaluateFrame: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const evaluation = await api.evaluateFrame(id);
          const transformed = transformAIEvaluation(evaluation);

          set((s) => ({
            frames: s.frames.map((f) =>
              f.id === id
                ? {
                    ...f,
                    aiScore: transformed.score,
                    aiScoreBreakdown: transformed.breakdown,
                    aiIssues: transformed.issues,
                    aiFeedback: transformed.feedback,
                    updatedAt: new Date(),
                  }
                : f
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to evaluate frame',
            isLoading: false,
          });
        }
      },

      // Comments
      addComment: async (frameId, section, content, authorId) => {
        const comment: ReviewComment = {
          id: `comment-${Date.now()}`,
          section,
          authorId,
          content,
          createdAt: new Date(),
        };

        try {
          const api = getAPIClient();
          await api.addComment(frameId, {
            section,
            author: authorId,
            content,
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to add comment' });
          return;
        }

        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === frameId
              ? {
                  ...f,
                  comments: [...(f.comments || []), comment],
                  updatedAt: new Date(),
                }
              : f
          ),
        }));
      },

      // Get helpers
      getFrame: (id) => get().frames.find((f) => f.id === id),
      getFramesByStatus: (status) => get().frames.filter((f) => f.status === status),
      getWorkingFrames: () => get().frames.filter((f) => f.status !== 'archived'),
      getArchivedFrames: () => get().frames.filter((f) => f.status === 'archived'),
    }),
    {
      name: 'framer-storage',
      version: 2,
      partialize: (state) => ({
        frames: state.frames,
        aiConfig: state.aiConfig,
      }),
    }
  )
);
