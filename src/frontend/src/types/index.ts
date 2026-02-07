// Frame Types
export type FrameType = 'bug' | 'feature' | 'exploration';
export type FrameStatus = 'draft' | 'in_review' | 'ready' | 'feedback' | 'archived';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'tech_lead' | 'senior_engineer' | 'engineer' | 'manager';
  avatar?: string;
}

export interface UserPerspective {
  user: string;
  context: string;
  journeySteps: string[];
  painPoints: string[];
}

export interface EngineeringFraming {
  principles: string[];
  nonGoals: string[];
}

export interface ValidationThinking {
  successSignals: string[];
  disconfirmingEvidence: string[];
}

export interface Confirmation {
  understandsUserPerspective: boolean;
  understandsTradeoffs: boolean;
  knowsValidation: boolean;
}

export interface AIScoreBreakdown {
  problemClarity: number; // out of 20
  userPerspective: number; // out of 20
  engineeringFraming: number; // out of 25
  validationThinking: number; // out of 20
  internalConsistency: number; // out of 15
}

export interface AIIssue {
  id: string;
  section: 'header' | 'user' | 'engineering' | 'validation';
  severity: 'warning' | 'error';
  message: string;
}

export interface ReviewComment {
  id: string;
  section: 'header' | 'user' | 'engineering' | 'validation';
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface ReviewDecision {
  decision: 'request_changes' | 'approve_anyway' | 'approve';
  justification?: string;
  reviewerId: string;
  reviewedAt: Date;
}

// Feedback after implementation
export interface FrameFeedback {
  outcome: 'success' | 'partial' | 'failed';
  summary: string;
  lessonsLearned: string[];
  assumptionResults: {
    assumption: string;
    wasCorrect: boolean;
    note?: string;
  }[];
  completedAt: Date;
}

export interface Frame {
  id: string;
  type: FrameType;
  status: FrameStatus;
  problemStatement: string;
  userPerspective: UserPerspective;
  engineeringFraming: EngineeringFraming;
  validationThinking: ValidationThinking;
  confirmation: Confirmation;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  aiScore?: number;
  aiScoreBreakdown?: AIScoreBreakdown;
  aiIssues?: AIIssue[];
  aiSummary?: string;
  comments?: ReviewComment[];
  reviewDecision?: ReviewDecision;
  feedback?: FrameFeedback;
}

// AI Configuration
export type AIProvider = 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  apiEndpoint: string;
  apiKey: string;
  model?: string;
}

// Chat/Refine Dialog
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestion?: string; // If AI proposes new content
}

// Section types for AI context
export type FrameSection = 'header' | 'user' | 'engineering' | 'validation';

// Navigation spaces
export type AppSpace = 'working' | 'templates' | 'archive' | 'knowledge';

// Conversation types
export type ConversationStatus = 'active' | 'synthesized' | 'abandoned';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationState {
  frameType: string | null;
  sectionsCovered: {
    problemStatement: number;
    userPerspective: number;
    engineeringFraming: number;
    validationThinking: number;
  };
  gaps: string[];
  readyToSynthesize: boolean;
}

export interface Conversation {
  id: string;
  owner: string;
  status: ConversationStatus;
  frameId: string | null;
  messages: ConversationMessage[];
  state: ConversationState;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  owner: string;
  status: ConversationStatus;
  frameId: string | null;
  messageCount: number;
  updatedAt: string;
}

// Knowledge types
export type KnowledgeCategory = 'pattern' | 'decision' | 'prediction' | 'context' | 'lesson';
export type KnowledgeSource = 'manual' | 'feedback' | 'conversation' | 'import';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  source: KnowledgeSource;
  sourceId?: string;
  teamId?: string;
  author: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  distance?: number;
}
