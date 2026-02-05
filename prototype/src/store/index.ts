import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Frame, FrameSection, AIConfig, User, FrameType, FrameStatus, ReviewComment, FrameFeedback, AppSpace, AIScoreBreakdown, AIIssue } from '@/types';
import { mockFrames, mockUsers, currentUser } from '@/data/mockData';
import { getAPIClient, transformFrameResponse, transformFrameToContent, transformAIEvaluation } from '@/lib/api';

// API mode toggle - set to true to use backend API instead of mock data
const USE_API = process.env.NEXT_PUBLIC_USE_API === 'true';

interface FrameStore {
  // Data
  frames: Frame[];
  users: User[];
  currentUser: User;

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

  // API Mode
  useAPI: boolean;

  // Users
  teamUsers: User[];
  loadUsers: () => Promise<void>;

  // Actions
  setSelectedFrame: (id: string | null) => void;
  setFocusedSection: (section: FrameSection | null) => void;
  setCurrentSpace: (space: AppSpace) => void;
  setAIConfig: (config: AIConfig | null) => void;
  setError: (error: string | null) => void;
  toggleAPIMode: () => void;

  // Frame CRUD
  createFrame: (type: FrameType) => Promise<Frame>;
  updateFrame: (id: string, updates: Partial<Frame>) => Promise<void>;
  deleteFrame: (id: string) => Promise<void>;
  saveFrame: (id: string) => Promise<void>;
  discardUnsavedFrame: (id: string) => void;
  isFrameSaved: (id: string) => boolean;
  loadFrames: () => Promise<void>;

  // Frame Status
  submitForReview: (id: string) => Promise<void>;
  markAsReady: (id: string) => Promise<void>;
  startFeedback: (id: string) => Promise<void>;
  submitFeedback: (id: string, feedback: FrameFeedback) => Promise<void>;

  // AI Operations
  evaluateFrame: (id: string) => Promise<void>;

  // Comments
  addComment: (frameId: string, section: FrameSection, content: string) => Promise<void>;

  // Get helpers
  getFrame: (id: string) => Frame | undefined;
  getUser: (id: string) => User | undefined;
  getFramesByStatus: (status: FrameStatus) => Frame[];
  getWorkingFrames: () => Frame[];
  getArchivedFrames: () => Frame[];
}

export const useFrameStore = create<FrameStore>()(
  persist(
    (set, get) => ({
      // Initial data
      frames: USE_API ? [] : mockFrames,
      users: mockUsers,
      currentUser: currentUser,

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

      // API Mode
      useAPI: USE_API,

      teamUsers: [],

      // Actions
      setSelectedFrame: (id) => set({ selectedFrameId: id }),
      setFocusedSection: (section) => set({ focusedSection: section }),
      setCurrentSpace: (space) => {
        set({ currentSpace: space, selectedFrameId: null });
        if (space === 'users') {
          get().loadUsers();
        }
      },
      setAIConfig: (config) => set({ aiConfig: config }),
      setError: (error) => set({ error }),
      loadUsers: async () => {
        if (!get().useAPI) return;
        try {
          const api = getAPIClient();
          const users = await api.listUsers();
          set({
            teamUsers: users.map((u) => ({
              id: u.id,
              name: u.name || u.email.split('@')[0],
              email: u.email,
              role: (u.role as User['role']) || 'engineer',
              avatar: u.avatar || undefined,
            })),
          });
        } catch (err) {
          console.warn('Failed to load users:', err);
        }
      },

      toggleAPIMode: () => {
        const newMode = !get().useAPI;
        set({
          useAPI: newMode,
          frames: newMode ? [] : mockFrames,
        });
        if (newMode) {
          get().loadFrames();
        }
      },

      // Load frames from API
      loadFrames: async () => {
        if (!get().useAPI) return;

        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const frameList = await api.listFrames();

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
      createFrame: async (type) => {
        const state = get();

        if (state.useAPI) {
          set({ isLoading: true, error: null });
          try {
            const api = getAPIClient();
            const response = await api.createFrame({
              type,
              owner: state.currentUser.id,
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
        }

        // Mock mode
        const newFrame: Frame = {
          id: `frame-${Date.now()}`,
          type,
          status: 'draft',
          problemStatement: '',
          userPerspective: {
            user: '',
            context: '',
            journeySteps: [],
            painPoints: [],
          },
          engineeringFraming: {
            principles: [],
            nonGoals: [],
          },
          validationThinking: {
            successSignals: [],
            disconfirmingEvidence: [],
          },
          confirmation: {
            understandsUserPerspective: false,
            understandsTradeoffs: false,
            knowsValidation: false,
          },
          ownerId: state.currentUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((s) => {
          const newUnsaved = new Set(s.unsavedFrameIds);
          newUnsaved.add(newFrame.id);
          return {
            frames: [...s.frames, newFrame],
            selectedFrameId: newFrame.id,
            unsavedFrameIds: newUnsaved,
          };
        });

        return newFrame;
      },

      updateFrame: async (id, updates) => {
        const state = get();

        // Update local state first (optimistic update)
        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: new Date() }
              : f
          ),
        }));

        if (state.useAPI) {
          try {
            const frame = get().getFrame(id);
            if (!frame) return;

            const api = getAPIClient();
            await api.updateFrame(id, transformFrameToContent(frame));
          } catch (err) {
            // Revert on error
            set({ error: err instanceof Error ? err.message : 'Failed to update frame' });
          }
        }
      },

      deleteFrame: async (id) => {
        const state = get();

        if (state.useAPI) {
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
        const state = get();

        if (state.useAPI) {
          const frame = state.getFrame(id);
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
      submitForReview: async (id) => {
        const state = get();
        const frame = state.getFrame(id);
        if (!frame) return;

        // Mark as saved
        await get().saveFrame(id);

        if (state.useAPI) {
          set({ isLoading: true, error: null });
          try {
            const api = getAPIClient();

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
                      aiSummary: transformed.summary,
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
          return;
        }

        // Mock mode - simulate AI scoring
        const score = frame.aiScore || Math.floor(Math.random() * 30) + 70;

        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: 'in_review' as FrameStatus,
                  aiScore: score,
                  updatedAt: new Date(),
                }
              : f
          ),
        }));
      },

      markAsReady: async (id) => {
        const state = get();

        if (state.useAPI) {
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
        const state = get();

        if (state.useAPI) {
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
        const state = get();

        if (state.useAPI) {
          set({ isLoading: true, error: null });
          try {
            const api = getAPIClient();
            await api.updateFrameStatus(id, 'archived');
            // Note: Backend doesn't store feedback yet - would need additional endpoint
            set({ isLoading: false });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to submit feedback',
              isLoading: false,
            });
            return;
          }
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
        const state = get();

        if (state.useAPI) {
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
                      aiSummary: transformed.summary,
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
          return;
        }

        // Mock mode - simulate AI scoring
        const frame = state.getFrame(id);
        if (!frame) return;

        const score = Math.floor(Math.random() * 30) + 70;
        const breakdown: AIScoreBreakdown = {
          problemClarity: Math.floor(Math.random() * 5) + 15,
          userPerspective: Math.floor(Math.random() * 5) + 15,
          engineeringFraming: Math.floor(Math.random() * 5) + 20,
          validationThinking: Math.floor(Math.random() * 5) + 15,
          internalConsistency: Math.floor(Math.random() * 5) + 10,
        };
        const issues: AIIssue[] = [];

        if (!frame.problemStatement) {
          issues.push({
            id: 'issue-1',
            section: 'header',
            severity: 'error',
            message: 'Problem statement is empty',
          });
        }

        set((s) => ({
          frames: s.frames.map((f) =>
            f.id === id
              ? {
                  ...f,
                  aiScore: score,
                  aiScoreBreakdown: breakdown,
                  aiIssues: issues,
                  updatedAt: new Date(),
                }
              : f
          ),
        }));
      },

      // Comments
      addComment: async (frameId, section, content) => {
        const state = get();

        const comment: ReviewComment = {
          id: `comment-${Date.now()}`,
          section,
          authorId: state.currentUser.id,
          content,
          createdAt: new Date(),
        };

        if (state.useAPI) {
          try {
            const api = getAPIClient();
            await api.addComment(frameId, {
              section,
              author: state.currentUser.id,
              content,
            });
          } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to add comment' });
            return;
          }
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
      getUser: (id) => get().users.find((u) => u.id === id) || get().teamUsers.find((u) => u.id === id),
      getFramesByStatus: (status) => get().frames.filter((f) => f.status === status),
      getWorkingFrames: () => get().frames.filter((f) => f.status !== 'archived'),
      getArchivedFrames: () => get().frames.filter((f) => f.status === 'archived'),
    }),
    {
      name: 'framer-storage',
      partialize: (state) => ({
        frames: state.frames,
        aiConfig: state.aiConfig,
        useAPI: state.useAPI,
      }),
    }
  )
);
