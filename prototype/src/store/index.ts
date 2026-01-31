import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Frame, FrameSection, AIConfig, User, FrameType, FrameStatus, ReviewComment, FrameFeedback, AppSpace } from '@/types';
import { mockFrames, mockUsers, currentUser } from '@/data/mockData';

interface FrameStore {
  // Data
  frames: Frame[];
  users: User[];
  currentUser: User;

  // UI State
  selectedFrameId: string | null;
  focusedSection: FrameSection | null;
  currentSpace: AppSpace;

  // Track unsaved frames (frames created but not explicitly saved)
  unsavedFrameIds: Set<string>;

  // AI Config
  aiConfig: AIConfig | null;

  // Actions
  setSelectedFrame: (id: string | null) => void;
  setFocusedSection: (section: FrameSection | null) => void;
  setCurrentSpace: (space: AppSpace) => void;
  setAIConfig: (config: AIConfig | null) => void;

  // Frame CRUD
  createFrame: (type: FrameType) => Frame;
  updateFrame: (id: string, updates: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  saveFrame: (id: string) => void;
  discardUnsavedFrame: (id: string) => void;
  isFrameSaved: (id: string) => boolean;

  // Frame Status
  submitForReview: (id: string) => void;
  markAsReady: (id: string) => void;
  startFeedback: (id: string) => void;
  submitFeedback: (id: string, feedback: FrameFeedback) => void;

  // Comments
  addComment: (frameId: string, section: FrameSection, content: string) => void;

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
      frames: mockFrames,
      users: mockUsers,
      currentUser: currentUser,

      // UI State
      selectedFrameId: null,
      focusedSection: null,
      currentSpace: 'working',

      // Track unsaved frames
      unsavedFrameIds: new Set(),

      // AI Config
      aiConfig: null,

      // Actions
      setSelectedFrame: (id) => set({ selectedFrameId: id }),
      setFocusedSection: (section) => set({ focusedSection: section }),
      setCurrentSpace: (space) => set({ currentSpace: space, selectedFrameId: null }),
      setAIConfig: (config) => set({ aiConfig: config }),

      // Frame CRUD
      createFrame: (type) => {
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
          ownerId: get().currentUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => {
          const newUnsaved = new Set(state.unsavedFrameIds);
          newUnsaved.add(newFrame.id);
          return {
            frames: [...state.frames, newFrame],
            selectedFrameId: newFrame.id,
            unsavedFrameIds: newUnsaved,
          };
        });

        return newFrame;
      },

      updateFrame: (id, updates) => {
        set((state) => ({
          frames: state.frames.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: new Date() }
              : f
          ),
        }));
      },

      deleteFrame: (id) => {
        set((state) => {
          const newUnsaved = new Set(state.unsavedFrameIds);
          newUnsaved.delete(id);
          return {
            frames: state.frames.filter((f) => f.id !== id),
            selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId,
            unsavedFrameIds: newUnsaved,
          };
        });
      },

      saveFrame: (id) => {
        set((state) => {
          const newUnsaved = new Set(state.unsavedFrameIds);
          newUnsaved.delete(id);
          return {
            unsavedFrameIds: newUnsaved,
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
      submitForReview: (id) => {
        const frame = get().getFrame(id);
        if (!frame) return;

        // Mark as saved when submitting
        get().saveFrame(id);

        // Simulate AI scoring
        const score = frame.aiScore || Math.floor(Math.random() * 30) + 70;

        set((state) => ({
          frames: state.frames.map((f) =>
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

      markAsReady: (id) => {
        set((state) => ({
          frames: state.frames.map((f) =>
            f.id === id
              ? { ...f, status: 'ready' as FrameStatus, updatedAt: new Date() }
              : f
          ),
        }));
      },

      startFeedback: (id) => {
        set((state) => ({
          frames: state.frames.map((f) =>
            f.id === id
              ? { ...f, status: 'feedback' as FrameStatus, updatedAt: new Date() }
              : f
          ),
        }));
      },

      submitFeedback: (id, feedback) => {
        set((state) => ({
          frames: state.frames.map((f) =>
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

      // Comments
      addComment: (frameId, section, content) => {
        const comment: ReviewComment = {
          id: `comment-${Date.now()}`,
          section,
          authorId: get().currentUser.id,
          content,
          createdAt: new Date(),
        };

        set((state) => ({
          frames: state.frames.map((f) =>
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
      getUser: (id) => get().users.find((u) => u.id === id),
      getFramesByStatus: (status) => get().frames.filter((f) => f.status === status),
      getWorkingFrames: () => get().frames.filter((f) => f.status !== 'archived'),
      getArchivedFrames: () => get().frames.filter((f) => f.status === 'archived'),
    }),
    {
      name: 'framer-storage',
      partialize: (state) => ({
        frames: state.frames,
        aiConfig: state.aiConfig,
      }),
    }
  )
);
