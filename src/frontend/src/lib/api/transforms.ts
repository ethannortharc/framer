/**
 * API Response Transformers
 *
 * Convert between backend (snake_case) and frontend (camelCase) formats.
 */

import type { Frame, FrameType, FrameStatus } from '@/types';
import type { FrameResponse, FrameListItem, AIEvaluateResponse } from './client';

/**
 * Normalize content that may be a JSON-stringified object into readable markdown.
 * Handles legacy frames where structured objects were stored as JSON strings.
 */
function normalizeContent(content: string): string {
  if (!content || content.trim() === '') return '';

  // Try to detect if it's a JSON object string
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return flattenObjectToMarkdown(parsed);
      }
    } catch {
      // Not valid JSON, return as-is
    }
  }

  return content;
}

/**
 * Convert a legacy structured object into readable markdown text.
 */
function flattenObjectToMarkdown(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    // Convert camelCase key to readable label
    const label = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();

    if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`**${label}:**`);
        for (const item of value) {
          lines.push(`- ${String(item)}`);
        }
        lines.push('');
      }
    } else if (typeof value === 'string' && value.trim()) {
      lines.push(`**${label}:** ${value}`);
      lines.push('');
    } else if (typeof value === 'boolean') {
      // skip booleans (confirmation fields)
    }
  }

  return lines.join('\n').trim();
}

/**
 * Transform backend FrameResponse to frontend Frame
 */
export function transformFrameResponse(response: FrameResponse): Frame {
  return {
    id: response.id,
    type: response.type as FrameType,
    status: response.status as FrameStatus,
    projectId: response.meta.project_id ?? undefined,
    problemStatement: response.content.problem_statement || '',
    userPerspective: normalizeContent(response.content.user_perspective),
    engineeringFraming: normalizeContent(response.content.engineering_framing),
    validationThinking: normalizeContent(response.content.validation_thinking),
    ownerId: response.owner,
    createdAt: new Date(response.meta.created_at),
    updatedAt: new Date(response.meta.updated_at),
    reviewer: response.meta.reviewer ?? undefined,
    approver: response.meta.approver ?? undefined,
    aiScore: response.meta.ai_score ?? undefined,
    aiScoreBreakdown: response.meta.ai_breakdown ?? undefined,
    aiFeedback: response.meta.ai_feedback ?? undefined,
    aiIssues: response.meta.ai_issues ?? undefined,
    reviewSummary: response.meta.review_summary ?? undefined,
    reviewComments: response.meta.review_comments ?? undefined,
    reviewRecommendation: response.meta.review_recommendation ?? undefined,
  };
}

/**
 * Transform frontend Frame to backend content format
 */
export function transformFrameToContent(frame: Frame): {
  problem_statement: string;
  user_perspective: string;
  engineering_framing: string;
  validation_thinking: string;
} {
  return {
    problem_statement: frame.problemStatement,
    user_perspective: frame.userPerspective,
    engineering_framing: frame.engineeringFraming,
    validation_thinking: frame.validationThinking,
  };
}

/**
 * Transform backend FrameListItem to minimal frame info
 */
export function transformFrameListItem(item: FrameListItem): {
  id: string;
  type: FrameType;
  status: FrameStatus;
  ownerId: string;
  projectId?: string;
  updatedAt: Date;
} {
  return {
    id: item.id,
    type: item.type as FrameType,
    status: item.status as FrameStatus,
    ownerId: item.owner,
    projectId: item.project_id ?? undefined,
    updatedAt: new Date(item.updated_at),
  };
}

/**
 * Transform backend AI evaluation response
 */
export function transformAIEvaluation(response: AIEvaluateResponse): {
  score: number;
  breakdown: Record<string, number>;
  issues: string[];
  feedback: string;
} {
  return {
    score: response.score,
    breakdown: response.breakdown,
    issues: response.issues,
    feedback: response.feedback,
  };
}
