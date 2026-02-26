/**
 * Framer API Client
 *
 * Type-safe HTTP client for the FastAPI backend.
 */

import type {
  Frame,
  FrameType,
  FrameStatus,
  FrameSection,
  ConversationMessage,
  ConversationState,
  ConversationListItem,
  KnowledgeEntry,
  KnowledgeCategory,
  KnowledgeSource,
  KnowledgeSearchResult,
} from '@/types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '120000');

// API Error class
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Request options type
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// API Response types (matching backend models)
export interface FrameResponse {
  id: string;
  type: string;
  status: string;
  owner: string;
  content: {
    problem_statement: string;
    root_cause?: string;
    user_perspective: string;
    engineering_framing: string;
    validation_thinking: string;
    problem_statement_en?: string;
    problem_statement_zh?: string;
    root_cause_en?: string;
    root_cause_zh?: string;
    user_perspective_en?: string;
    user_perspective_zh?: string;
    engineering_framing_en?: string;
    engineering_framing_zh?: string;
    validation_thinking_en?: string;
    validation_thinking_zh?: string;
  };
  meta: {
    created_at: string;
    updated_at: string;
    project_id: string | null;
    reviewer: string | null;
    approver: string | null;
    ai_score: number | null;
    ai_breakdown: Record<string, number> | null;
    ai_feedback: string | null;
    ai_issues: string[] | null;
    review_summary: string | null;
    review_comments: Array<{ section: string; content: string; severity: string }> | null;
    review_recommendation: string | null;
  };
}

export interface FrameListItem {
  id: string;
  type: string;
  status: string;
  owner: string;
  project_id?: string;
  updated_at: string;
}

export interface CommentResponse {
  id: string;
  section: string;
  author: string;
  content: string;
  created_at: string;
}

export interface AIEvaluateResponse {
  score: number;
  breakdown: Record<string, number>;
  feedback: string;
  issues: string[];
}

export interface AIGenerateResponse {
  content: string;
  section: string;
}

export interface AIChatResponse {
  message: string;
  suggestion?: string;
}

// Frame history types
export interface FrameHistoryEntry {
  hash: string;
  message: string;
  author_name: string;
  timestamp: string;
  diff?: string;
}

// Conversation API response types
export interface ConversationResponse {
  id: string;
  owner: string;
  status: string;
  purpose: string;
  frame_id: string | null;
  project_id?: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
    sender_name?: string;
    content_en?: string;
    content_zh?: string;
  }>;
  state: {
    frame_type: string | null;
    sections_covered: Record<string, number>;
    gaps: string[];
    ready_to_synthesize: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ConversationListItemResponse {
  id: string;
  owner: string;
  status: string;
  purpose: string;
  frame_id: string | null;
  project_id?: string;
  message_count: number;
  updated_at: string;
}

export interface SendMessageResponse {
  message: {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
    sender_name?: string;
    content_en?: string;
    content_zh?: string;
  };
  ai_response: {
    id: string;
    role: string;
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
    content_en?: string;
    content_zh?: string;
  };
  state: {
    frame_type: string | null;
    sections_covered: Record<string, number>;
    gaps: string[];
    ready_to_synthesize: boolean;
  };
  relevant_knowledge: Array<Record<string, unknown>>;
}

export interface PreviewResponse {
  content: Record<string, string>;
}

export interface SynthesizeResponse {
  frame_id: string;
  content: Record<string, string>;
}

// Knowledge API response types
export interface KnowledgeEntryResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  source_id?: string;
  project_id?: string;
  author: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSearchResultResponse {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  distance?: number;
}

/**
 * Framer API Client class
 */
export class FramerAPIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, signal } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (this.token) {
        requestHeaders['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const errorData = await response.json();
          detail = errorData.detail;
        } catch {
          // Ignore JSON parse errors
        }
        throw new APIError(
          `API request failed: ${response.statusText}`,
          response.status,
          detail
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof APIError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      throw new APIError('Network error', 0, String(error));
    }
  }

  // ==================== Frame Endpoints ====================

  /**
   * List all frames with optional filters
   */
  async listFrames(filters?: { status?: string; owner?: string; project_id?: string }): Promise<FrameListItem[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.owner) params.append('owner', filters.owner);
    if (filters?.project_id) params.append('project_id', filters.project_id);

    const query = params.toString();
    return this.request<FrameListItem[]>(`/api/frames${query ? `?${query}` : ''}`);
  }

  /**
   * Get a single frame by ID
   */
  async getFrame(id: string): Promise<FrameResponse> {
    return this.request<FrameResponse>(`/api/frames/${id}`);
  }

  /**
   * Create a new frame
   */
  async createFrame(data: {
    type: FrameType;
    owner: string;
    project_id?: string;
    content?: {
      problem_statement?: string;
      root_cause?: string;
      user_perspective?: string;
      engineering_framing?: string;
      validation_thinking?: string;
    };
  }): Promise<FrameResponse> {
    return this.request<FrameResponse>('/api/frames', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Update frame content
   */
  async updateFrame(id: string, content: {
    problem_statement?: string;
    root_cause?: string;
    user_perspective?: string;
    engineering_framing?: string;
    validation_thinking?: string;
  }): Promise<FrameResponse> {
    return this.request<FrameResponse>(`/api/frames/${id}`, {
      method: 'PUT',
      body: { content },
    });
  }

  /**
   * Update frame status
   */
  async updateFrameStatus(id: string, status: FrameStatus): Promise<FrameResponse> {
    return this.request<FrameResponse>(`/api/frames/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  /**
   * Delete a frame
   */
  async deleteFrame(id: string): Promise<void> {
    return this.request<void>(`/api/frames/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Feedback Endpoint ====================

  /**
   * Submit implementation feedback for a frame
   */
  async submitFeedback(frameId: string, data: {
    outcome: string;
    summary: string;
    lessons_learned: string[];
  }): Promise<FrameResponse> {
    return this.request<FrameResponse>(`/api/frames/${frameId}/feedback`, {
      method: 'POST',
      body: data,
    });
  }

  // ==================== User Endpoints ====================

  /**
   * List users from PocketBase
   */
  async listUsers(): Promise<Array<{ id: string; name: string; email: string }>> {
    return this.request<Array<{ id: string; name: string; email: string }>>('/api/users');
  }

  /**
   * Update frame metadata (reviewer, approver)
   */
  async updateFrameMeta(frameId: string, data: {
    reviewer?: string;
    approver?: string;
  }): Promise<FrameResponse> {
    return this.request<FrameResponse>(`/api/frames/${frameId}/meta`, {
      method: 'PATCH',
      body: data,
    });
  }

  // ==================== Comment Endpoints ====================

  /**
   * Add a comment to a frame
   */
  async addComment(frameId: string, data: {
    section: string;
    author: string;
    content: string;
  }): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/api/frames/${frameId}/comments`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Get comments for a frame
   */
  async getComments(frameId: string): Promise<CommentResponse[]> {
    return this.request<CommentResponse[]>(`/api/frames/${frameId}/comments`);
  }

  // ==================== Frame History ====================

  /**
   * Get version history for a frame
   */
  async getFrameHistory(frameId: string, limit?: number): Promise<FrameHistoryEntry[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    const query = params.toString();
    return this.request<FrameHistoryEntry[]>(
      `/api/frames/${frameId}/history${query ? `?${query}` : ''}`
    );
  }

  // ==================== AI Endpoints ====================

  /**
   * Evaluate a frame with AI
   */
  async evaluateFrame(frameId: string): Promise<AIEvaluateResponse> {
    return this.request<AIEvaluateResponse>(`/api/frames/${frameId}/ai/evaluate`, {
      method: 'POST',
    });
  }

  /**
   * Generate content for a frame section
   */
  async generateContent(data: {
    frame_id: string;
    section: string;
    answers: Record<string, string>;
  }): Promise<AIGenerateResponse> {
    return this.request<AIGenerateResponse>('/api/ai/generate', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Chat with AI for content refinement
   */
  async chat(data: {
    message: string;
    context?: {
      frame_id?: string;
      section?: string;
      content?: string;
    };
  }): Promise<AIChatResponse> {
    return this.request<AIChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: data,
    });
  }

  // ==================== Conversation Endpoints ====================

  /**
   * Start a new conversation
   */
  async startConversation(owner: string, purpose?: string, frameId?: string, projectId?: string): Promise<ConversationResponse> {
    const body: Record<string, string> = { owner };
    if (purpose) body.purpose = purpose;
    if (frameId) body.frame_id = frameId;
    if (projectId) body.project_id = projectId;
    return this.request<ConversationResponse>('/api/conversations', {
      method: 'POST',
      body,
    });
  }

  /**
   * List conversations
   */
  async listConversations(filters?: {
    owner?: string;
    status?: string;
    frame_id?: string;
    project_id?: string;
  }): Promise<ConversationListItemResponse[]> {
    const params = new URLSearchParams();
    if (filters?.owner) params.append('owner', filters.owner);
    if (filters?.status) params.append('conv_status', filters.status);
    if (filters?.frame_id) params.append('frame_id', filters.frame_id);
    if (filters?.project_id) params.append('project_id', filters.project_id);
    const query = params.toString();
    return this.request<ConversationListItemResponse[]>(
      `/api/conversations${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<ConversationResponse> {
    return this.request<ConversationResponse>(`/api/conversations/${id}`);
  }

  /**
   * Send a message in a conversation
   */
  async sendConversationMessage(
    convId: string,
    content: string,
    senderName?: string,
    language?: string
  ): Promise<SendMessageResponse> {
    const body: Record<string, string | undefined> = { content, sender_name: senderName };
    if (language) body.language = language;
    return this.request<SendMessageResponse>(
      `/api/conversations/${convId}/message`,
      {
        method: 'POST',
        body,
      }
    );
  }

  /**
   * Preview a synthesized frame without persisting
   */
  async previewFrame(convId: string): Promise<PreviewResponse> {
    return this.request<PreviewResponse>(
      `/api/conversations/${convId}/preview`,
      { method: 'POST' }
    );
  }

  /**
   * Synthesize a frame from a conversation
   */
  async synthesizeFrame(convId: string, content?: Record<string, string>): Promise<SynthesizeResponse> {
    return this.request<SynthesizeResponse>(
      `/api/conversations/${convId}/synthesize`,
      { method: 'POST', body: content ? { content } : {} }
    );
  }

  /**
   * Summarize a review conversation
   */
  async summarizeReview(convId: string): Promise<{ summary: string; comments: Array<{ section: string; content: string; severity: string }>; recommendation: string }> {
    return this.request(`/api/conversations/${convId}/summarize-review`, {
      method: 'POST',
    });
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    return this.request<void>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Knowledge Endpoints ====================

  /**
   * Create a knowledge entry
   */
  async createKnowledgeEntry(data: {
    title: string;
    content: string;
    category: string;
    source?: string;
    author: string;
    project_id?: string;
    tags?: string[];
  }): Promise<KnowledgeEntryResponse> {
    return this.request<KnowledgeEntryResponse>('/api/knowledge', {
      method: 'POST',
      body: { source: 'manual', tags: [], ...data },
    });
  }

  /**
   * List knowledge entries
   */
  async listKnowledgeEntries(filters?: {
    category?: string;
    project_id?: string;
    tags?: string;
  }): Promise<KnowledgeEntryResponse[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.project_id) params.append('project_id', filters.project_id);
    if (filters?.tags) params.append('tags', filters.tags);
    const query = params.toString();
    return this.request<KnowledgeEntryResponse[]>(
      `/api/knowledge${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get a knowledge entry by ID
   */
  async getKnowledgeEntry(id: string): Promise<KnowledgeEntryResponse> {
    return this.request<KnowledgeEntryResponse>(`/api/knowledge/${id}`);
  }

  /**
   * Update a knowledge entry
   */
  async updateKnowledgeEntry(
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<KnowledgeEntryResponse> {
    return this.request<KnowledgeEntryResponse>(`/api/knowledge/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete a knowledge entry
   */
  async deleteKnowledgeEntry(id: string): Promise<void> {
    return this.request<void>(`/api/knowledge/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Semantic search for knowledge
   */
  async searchKnowledge(data: {
    query: string;
    limit?: number;
    category?: string;
  }): Promise<KnowledgeSearchResultResponse[]> {
    return this.request<KnowledgeSearchResultResponse[]>(
      '/api/knowledge/search',
      {
        method: 'POST',
        body: data,
      }
    );
  }

  /**
   * Distill knowledge from feedback or conversation
   */
  async distillKnowledge(data: {
    frame_id?: string;
    conversation_id?: string;
    feedback?: string;
  }): Promise<KnowledgeEntryResponse[]> {
    return this.request<KnowledgeEntryResponse[]>('/api/knowledge/distill', {
      method: 'POST',
      body: data,
    });
  }

  // ==================== Team/Project Endpoints ====================

  async listTeams(): Promise<Array<{ id: string; name: string; description?: string }>> {
    return this.request<Array<{ id: string; name: string; description?: string }>>('/api/teams');
  }

  async createTeam(data: { name: string; description?: string }): Promise<{ id: string; name: string; description?: string }> {
    return this.request<{ id: string; name: string; description?: string }>('/api/teams', {
      method: 'POST',
      body: data,
    });
  }

  async listTeamMembers(teamId: string): Promise<Array<{ id: string; team: string; user: string; role?: string }>> {
    return this.request<Array<{ id: string; team: string; user: string; role?: string }>>(`/api/teams/${teamId}/members`);
  }

  async addTeamMember(teamId: string, userId: string, role?: string): Promise<{ id: string; team: string; user: string; role?: string }> {
    return this.request<{ id: string; team: string; user: string; role?: string }>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: { user_id: userId, role },
    });
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    return this.request<void>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  async getUserTeams(userId: string): Promise<Array<{ id: string; name: string; description?: string }>> {
    return this.request<Array<{ id: string; name: string; description?: string }>>(`/api/users/${userId}/teams`);
  }
}

// Singleton instance
let apiClient: FramerAPIClient | null = null;

/**
 * Get the API client singleton
 */
export function getAPIClient(): FramerAPIClient {
  if (!apiClient) {
    apiClient = new FramerAPIClient();
  }
  return apiClient;
}

/**
 * Reset the API client (useful for testing)
 */
export function resetAPIClient(): void {
  apiClient = null;
}
