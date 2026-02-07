import { create } from 'zustand';
import { KnowledgeEntry, KnowledgeCategory, KnowledgeSearchResult } from '@/types';
import { getAPIClient } from '@/lib/api';

interface KnowledgeStore {
  entries: KnowledgeEntry[];
  searchResults: KnowledgeSearchResult[];
  selectedCategory: KnowledgeCategory | null;
  isLoading: boolean;
  error: string | null;

  loadEntries: (category?: KnowledgeCategory) => Promise<void>;
  createEntry: (data: {
    title: string;
    content: string;
    category: KnowledgeCategory;
    author: string;
    tags?: string[];
  }) => Promise<KnowledgeEntry>;
  updateEntry: (
    id: string,
    data: { title?: string; content?: string; category?: KnowledgeCategory; tags?: string[] }
  ) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  searchKnowledge: (query: string, category?: KnowledgeCategory) => Promise<void>;
  setSelectedCategory: (category: KnowledgeCategory | null) => void;
  setError: (error: string | null) => void;
}

function transformEntry(response: any): KnowledgeEntry {
  return {
    id: response.id,
    title: response.title,
    content: response.content,
    category: response.category,
    source: response.source,
    sourceId: response.source_id,
    teamId: response.team_id,
    author: response.author,
    tags: response.tags || [],
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

export const useKnowledgeStore = create<KnowledgeStore>()((set, get) => ({
  entries: [],
  searchResults: [],
  selectedCategory: null,
  isLoading: false,
  error: null,

  setError: (error) => set({ error }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  loadEntries: async (category?) => {
    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const response = await api.listKnowledgeEntries(
        category ? { category } : undefined
      );
      const entries = response.map(transformEntry);
      set({ entries, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load knowledge',
        isLoading: false,
      });
    }
  },

  createEntry: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const response = await api.createKnowledgeEntry({
        ...data,
        source: 'manual',
      });
      const entry = transformEntry(response);
      set((s) => ({
        entries: [entry, ...s.entries],
        isLoading: false,
      }));
      return entry;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create entry',
        isLoading: false,
      });
      throw err;
    }
  },

  updateEntry: async (id, data) => {
    try {
      const api = getAPIClient();
      const response = await api.updateKnowledgeEntry(id, data);
      const updated = transformEntry(response);
      set((s) => ({
        entries: s.entries.map((e) => (e.id === id ? updated : e)),
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update entry',
      });
    }
  },

  deleteEntry: async (id) => {
    try {
      const api = getAPIClient();
      await api.deleteKnowledgeEntry(id);
      set((s) => ({
        entries: s.entries.filter((e) => e.id !== id),
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete entry',
      });
    }
  },

  searchKnowledge: async (query, category?) => {
    set({ isLoading: true, error: null });
    try {
      const api = getAPIClient();
      const results = await api.searchKnowledge({
        query,
        category,
        limit: 10,
      });
      const searchResults: KnowledgeSearchResult[] = results.map((r) => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        distance: r.distance,
      }));
      set({ searchResults, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to search',
        isLoading: false,
      });
    }
  },
}));
