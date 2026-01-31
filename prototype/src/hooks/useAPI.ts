/**
 * React hooks for API integration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getAPIClient,
  getAuthService,
  APIError,
  AuthError,
  type FrameResponse,
  type FrameListItem,
  type AIEvaluateResponse,
  type AIChatResponse,
} from '@/lib/api';
import type { Frame, FrameType, FrameStatus, FrameSection } from '@/types';

// Generic API state hook
interface UseAPIState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseAPIResult<T> extends UseAPIState<T> {
  refetch: () => Promise<void>;
  reset: () => void;
}

/**
 * Generic hook for API calls with loading and error states
 */
export function useAPICall<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseAPIResult<T> {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof APIError ? err.detail || err.message : String(err);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: fetch, reset };
}

/**
 * Hook for frame list
 */
export function useFrames(filters?: { status?: string; owner?: string }) {
  const api = getAPIClient();
  return useAPICall(
    () => api.listFrames(filters),
    [filters?.status, filters?.owner]
  );
}

/**
 * Hook for single frame
 */
export function useFrame(id: string | null) {
  const api = getAPIClient();
  return useAPICall(
    () => (id ? api.getFrame(id) : Promise.resolve(null)),
    [id]
  );
}

/**
 * Hook for frame mutations (create, update, delete)
 */
export function useFrameMutations() {
  const api = getAPIClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFrame = useCallback(
    async (type: FrameType, owner: string): Promise<FrameResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.createFrame({ type, owner });
        setIsLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [api]
  );

  const updateFrame = useCallback(
    async (
      id: string,
      content: {
        problem_statement?: string;
        user_perspective?: string;
        engineering_framing?: string;
        validation_thinking?: string;
      }
    ): Promise<FrameResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.updateFrame(id, content);
        setIsLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [api]
  );

  const updateStatus = useCallback(
    async (id: string, status: FrameStatus): Promise<FrameResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.updateFrameStatus(id, status);
        setIsLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [api]
  );

  const deleteFrame = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await api.deleteFrame(id);
        setIsLoading(false);
        return true;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [api]
  );

  return {
    createFrame,
    updateFrame,
    updateStatus,
    deleteFrame,
    isLoading,
    error,
  };
}

/**
 * Hook for AI operations
 */
export function useAI() {
  const api = getAPIClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateFrame = useCallback(
    async (frameId: string): Promise<AIEvaluateResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.evaluateFrame(frameId);
        setIsLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [api]
  );

  const generateContent = useCallback(
    async (
      frameId: string,
      section: string,
      answers: Record<string, string>
    ): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.generateContent({
          frame_id: frameId,
          section,
          answers,
        });
        setIsLoading(false);
        return result.content;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [api]
  );

  const chat = useCallback(
    async (
      message: string,
      context?: {
        frameId?: string;
        section?: string;
        content?: string;
      }
    ): Promise<AIChatResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.chat({
          message,
          context: context
            ? {
                frame_id: context.frameId,
                section: context.section,
                content: context.content,
              }
            : undefined,
        });
        setIsLoading(false);
        return result;
      } catch (err) {
        const message = err instanceof APIError ? err.detail || err.message : String(err);
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [api]
  );

  return {
    evaluateFrame,
    generateContent,
    chat,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for authentication
 */
export function useAuth() {
  const auth = getAuthService();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState(auth.getUser());

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const loggedInUser = await auth.login(email, password);
        setUser(loggedInUser);
        setIsLoading(false);
        return true;
      } catch (err) {
        const message = err instanceof AuthError ? err.message : String(err);
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [auth]
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      passwordConfirm: string;
      name?: string;
    }): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const registeredUser = await auth.register(data);
        setUser(registeredUser);
        setIsLoading(false);
        return true;
      } catch (err) {
        const message = err instanceof AuthError ? err.message : String(err);
        setError(message);
        setIsLoading(false);
        return false;
      }
    },
    [auth]
  );

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, [auth]);

  const refresh = useCallback(async (): Promise<boolean> => {
    const success = await auth.refresh();
    if (success) {
      setUser(auth.getUser());
    } else {
      setUser(null);
    }
    return success;
  }, [auth]);

  return {
    user,
    isAuthenticated: auth.isAuthenticated(),
    isLoading,
    error,
    login,
    register,
    logout,
    refresh,
    clearError: () => setError(null),
  };
}
