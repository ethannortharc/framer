/**
 * API Response Transformers
 *
 * Convert between backend (snake_case) and frontend (camelCase) formats.
 */

import type { Frame, FrameType, FrameStatus, AIScoreBreakdown, AIIssue } from '@/types';
import type { FrameResponse, FrameListItem, AIEvaluateResponse } from './client';

/**
 * Parse JSON content strings from backend
 */
function parseContentSection(content: string): unknown {
  if (!content || content.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    // If not valid JSON, return as string
    return content;
  }
}

/**
 * Transform backend FrameResponse to frontend Frame
 */
export function transformFrameResponse(response: FrameResponse): Frame {
  // Parse user perspective from JSON string
  const userPerspective = parseContentSection(response.content.user_perspective);
  const engineeringFraming = parseContentSection(response.content.engineering_framing);
  const validationThinking = parseContentSection(response.content.validation_thinking);

  return {
    id: response.id,
    type: response.type as FrameType,
    status: response.status as FrameStatus,
    problemStatement: response.content.problem_statement || '',
    userPerspective: userPerspective && typeof userPerspective === 'object'
      ? {
          user: (userPerspective as { user?: string }).user || '',
          context: (userPerspective as { context?: string }).context || '',
          journeySteps: (userPerspective as { journeySteps?: string[] }).journeySteps || [],
          painPoints: (userPerspective as { painPoints?: string[] }).painPoints || [],
        }
      : {
          user: '',
          context: typeof userPerspective === 'string' ? userPerspective : '',
          journeySteps: [],
          painPoints: [],
        },
    engineeringFraming: engineeringFraming && typeof engineeringFraming === 'object'
      ? {
          principles: (engineeringFraming as { principles?: string[] }).principles || [],
          nonGoals: (engineeringFraming as { nonGoals?: string[] }).nonGoals || [],
        }
      : {
          principles: [],
          nonGoals: [],
        },
    validationThinking: validationThinking && typeof validationThinking === 'object'
      ? {
          successSignals: (validationThinking as { successSignals?: string[] }).successSignals || [],
          disconfirmingEvidence: (validationThinking as { disconfirmingEvidence?: string[] }).disconfirmingEvidence || [],
        }
      : {
          successSignals: [],
          disconfirmingEvidence: [],
        },
    confirmation: {
      understandsUserPerspective: false,
      understandsTradeoffs: false,
      knowsValidation: false,
    },
    ownerId: response.owner,
    reviewerId: response.meta.reviewer ?? undefined,
    approverId: response.meta.approver ?? undefined,
    createdAt: new Date(response.meta.created_at),
    updatedAt: new Date(response.meta.updated_at),
    aiScore: response.meta.ai_score ?? undefined,
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
    user_perspective: JSON.stringify(frame.userPerspective),
    engineering_framing: JSON.stringify(frame.engineeringFraming),
    validation_thinking: JSON.stringify(frame.validationThinking),
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
  updatedAt: Date;
} {
  return {
    id: item.id,
    type: item.type as FrameType,
    status: item.status as FrameStatus,
    ownerId: item.owner,
    updatedAt: new Date(item.updated_at),
  };
}

/**
 * Transform backend AI evaluation response
 */
export function transformAIEvaluation(response: AIEvaluateResponse): {
  score: number;
  breakdown: AIScoreBreakdown;
  issues: AIIssue[];
  summary: string;
} {
  return {
    score: response.score,
    breakdown: {
      problemClarity: response.breakdown.problem_clarity,
      userPerspective: response.breakdown.user_perspective,
      engineeringFraming: response.breakdown.engineering_framing,
      validationThinking: response.breakdown.validation_thinking,
      internalConsistency: response.breakdown.internal_consistency,
    },
    issues: response.issues.map((issue, index) => ({
      id: `issue-${index}`,
      section: issue.section as AIIssue['section'],
      severity: issue.severity as AIIssue['severity'],
      message: issue.message,
    })),
    summary: response.summary,
  };
}
