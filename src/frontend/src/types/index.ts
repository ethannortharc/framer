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

// AI evaluation breakdown: dynamic keys mapping section name to score (0-25 each)
export type AIScoreBreakdown = Record<string, number>;

// AI issues are simple string descriptions
export type AIIssue = string;

export interface ReviewComment {
  id: string;
  section: FrameSection;
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
  projectId?: string;
  problemStatement: string;
  rootCause: string;
  userPerspective: string;
  engineeringFraming: string;
  validationThinking: string;
  ownerId: string;
  reviewer?: string;
  approver?: string;
  createdAt: Date;
  updatedAt: Date;
  aiScore?: number;
  aiScoreBreakdown?: AIScoreBreakdown;
  aiIssues?: AIIssue[];
  aiFeedback?: string;
  reviewSummary?: string;
  reviewComments?: Array<{ section: string; content: string; severity: string }>;
  reviewRecommendation?: string;
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
export type FrameSection = 'header' | 'root_cause' | 'user' | 'engineering' | 'validation';

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role?: string;
}

// Navigation spaces
export type AppSpace = 'working' | 'archive' | 'knowledge';

// Conversation types
export type ConversationStatus = 'active' | 'synthesized' | 'abandoned';
export type ConversationPurpose = 'authoring' | 'review';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  status?: 'sent' | 'failed';
  senderName?: string;
}

export interface ConversationState {
  frameType: string | null;
  sectionsCovered: {
    problemStatement: number;
    rootCause: number;
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
  purpose: ConversationPurpose;
  frameId: string | null;
  projectId?: string;
  messages: ConversationMessage[];
  state: ConversationState;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  owner: string;
  status: ConversationStatus;
  purpose: ConversationPurpose;
  frameId: string | null;
  projectId?: string;
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
  projectId?: string;
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
