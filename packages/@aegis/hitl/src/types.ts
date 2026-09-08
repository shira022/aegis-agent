// ─── HITL State ──────────────────────────────────────────────────────

export type HitlState =
  | 'idle'
  | 'waiting_for_human'
  | 'demonstrating'
  | 'learning'
  | 'applying';

// ─── Intervention Types ──────────────────────────────────────────────

export type InterventionOptionType =
  | 'skip'
  | 'retry'
  | 'demonstrate'
  | 'fix_code'
  | 'abort';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface InterventionOption {
  id: string;
  type: InterventionOptionType;
  label: string;
  description: string;
  riskLevel: RiskLevel;
}

export interface InterventionRequest {
  id: string;
  executionLogId: string;
  error: Error;
  options: InterventionOption[];
  createdAt: Date;
  timeoutMs?: number;
}

export interface InterventionDecision {
  requestId: string;
  optionId: string;
  userInput?: string;
  decidedAt: Date;
  decidedBy: 'human';
}

// ─── Demonstration Types ─────────────────────────────────────────────

import type { RecordedAction } from '@aegis/recorder';

export interface Demonstration {
  id: string;
  requestId: string;
  actions: RecordedAction[];
  screenshot?: string;
  timestamp: Date;
  duration: number;
}

// ─── Diff Learning Types ─────────────────────────────────────────────

export interface CodeDiff {
  line: number;
  oldContent: string;
  newContent: string;
  reason: string;
}

export interface DiffLearning {
  id: string;
  demonstrationId: string;
  originalCode: string;
  correctedCode: string;
  changes: CodeDiff[];
  appliedAt: Date;
}

export interface LearningPattern {
  id: string;
  errorType: string;
  fixPattern: string;
  codeTemplate: string;
  confidence: number;
  usageCount: number;
}

// ─── Engine Result ───────────────────────────────────────────────────

export interface HitlResult {
  handled: boolean;
  action: string;
  learningApplied: boolean;
}

// ─── Context ─────────────────────────────────────────────────────────

export interface ErrorContext {
  errorType: string;
  error: Error;
  executionLogId: string;
  screenshot?: string;
  metadata?: Record<string, unknown>;
}
