import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, ProjectMember } from '@/types';
import { getAPIClient } from '@/lib/api';

interface ProjectStore {
  projects: Project[];
  currentProjectId: string | null;
  members: ProjectMember[];
  isLoading: boolean;
  error: string | null;

  loadProjects: (userId: string) => Promise<void>;
  setCurrentProject: (projectId: string | null) => void;
  loadMembers: (projectId: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  addMember: (userId: string, role?: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      members: [],
      isLoading: false,
      error: null,

      setError: (error) => set({ error }),

      loadProjects: async (userId) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const teams = await api.getUserTeams(userId);
          const projects: Project[] = teams.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
          }));
          set((s) => ({
            projects,
            // Auto-select first project if none selected
            currentProjectId:
              s.currentProjectId && projects.some((p) => p.id === s.currentProjectId)
                ? s.currentProjectId
                : projects.length > 0
                  ? projects[0].id
                  : null,
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to load projects',
            isLoading: false,
          });
        }
      },

      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId, members: [] });
      },

      loadMembers: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const rawMembers = await api.listTeamMembers(projectId);
          const members: ProjectMember[] = rawMembers.map((m) => ({
            id: m.id,
            projectId: m.team,
            userId: m.user,
            role: m.role,
          }));
          set({ members, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to load members',
            isLoading: false,
          });
        }
      },

      createProject: async (name, description?) => {
        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const team = await api.createTeam({ name, description });
          const project: Project = {
            id: team.id,
            name: team.name,
            description: team.description,
          };
          set((s) => ({
            projects: [...s.projects, project],
            isLoading: false,
          }));
          return project;
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to create project',
            isLoading: false,
          });
          throw err;
        }
      },

      addMember: async (userId, role?) => {
        const { currentProjectId } = get();
        if (!currentProjectId) return;

        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          const raw = await api.addTeamMember(currentProjectId, userId, role);
          const member: ProjectMember = {
            id: raw.id,
            projectId: raw.team,
            userId: raw.user,
            role: raw.role,
          };
          set((s) => ({
            members: [...s.members, member],
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to add member',
            isLoading: false,
          });
        }
      },

      removeMember: async (memberId) => {
        const { currentProjectId } = get();
        if (!currentProjectId) return;

        set({ isLoading: true, error: null });
        try {
          const api = getAPIClient();
          await api.removeTeamMember(currentProjectId, memberId);
          set((s) => ({
            members: s.members.filter((m) => m.id !== memberId),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to remove member',
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'framer-project',
      partialize: (state) => ({
        currentProjectId: state.currentProjectId,
      }),
    }
  )
);
