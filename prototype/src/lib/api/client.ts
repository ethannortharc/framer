/**
 * Framer API Client
 *
 * Type-safe HTTP client for the FastAPI backend.
 */

import type { Frame, FrameType, FrameStatus, FrameSection } from '@/types';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');

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
    user_perspective: string;
    engineering_framing: string;
    validation_thinking: string;
  };
  meta: {
    created_at: string;
    updated_at: string;
    ai_score: number | null;
  };
}

export interface FrameListItem {
  id: string;
  type: string;
  status: string;
  owner: string;
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
  frame_id: string;
  score: number;
  breakdown: {
    problem_clarity: number;
    user_perspective: number;
    engineering_framing: number;
    validation_thinking: number;
    internal_consistency: number;
  };
  issues: Array<{
    section: string;
    severity: string;
    message: string;
  }>;
  summary: string;
}

export interface AIGenerateResponse {
  content: string;
  section: string;
}

export interface AIChatResponse {
  message: string;
  suggestion?: string;
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
  async listFrames(filters?: { status?: string; owner?: string }): Promise<FrameListItem[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.owner) params.append('owner', filters.owner);

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
    content?: {
      problem_statement?: string;
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

  // ==================== Template Endpoints ====================

  /**
   * List all templates
   */
  async listTemplates(): Promise<Array<{ id: string; name: string; description: string }>> {
    return this.request(`/api/templates`);
  }

  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<{
    id: string;
    name: string;
    description: string;
    sections: unknown[];
    questionnaire: unknown;
    prompt_templates: Record<string, string>;
  }> {
    return this.request(`/api/templates/${id}`);
  }

  // ==================== AI Endpoints ====================

  /**
   * Evaluate a frame with AI
   */
  async evaluateFrame(frameId: string): Promise<AIEvaluateResponse> {
    return this.request<AIEvaluateResponse>('/api/ai/evaluate', {
      method: 'POST',
      body: { frame_id: frameId },
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
