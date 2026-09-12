import type { RecordedAction, ElementSelector } from '@aegis/recorder';

// ─── Healing State ──────────────────────────────────────────────

export type HealingState =
  | 'monitoring'
  | 'error_detected'
  | 'analyzing'
  | 'healing'
  | 'repaired'
  | 'failed'
  | 'escalated';

// ─── Error Types ────────────────────────────────────────────────

export type ErrorType =
  | 'element_not_found'
  | 'stale_element'
  | 'navigation_failed'
  | 'timeout'
  | 'permission_denied'
  | 'data_mismatch'
  | 'popup_interference'
  | 'session_expired'
  | 'network_error'
  | 'unknown';

// ─── Healing Strategy ───────────────────────────────────────────

export type HealingStrategy =
  | 'retry_same'
  | 'retry_with_wait'
  | 'find_alternative'
  | 'skip_and_continue'
  | 'pause_for_human'
  | 'abort';

// ─── Error Severity ─────────────────────────────────────────────

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ─── Error Classification ───────────────────────────────────────

export interface ErrorClassification {
  type: ErrorType;
  severity: ErrorSeverity;
  recoverable: boolean;
  suggestedStrategy: HealingStrategy;
}

// ─── Execution Error ────────────────────────────────────────────

export interface ExecutionError {
  message: string;
  stack?: string;
  actionId: string;
  timestamp: number;
  code?: string;
}

// ─── Healing Context ────────────────────────────────────────────

export interface HealingContext {
  url: string;
  pageTitle: string;
  previousActions: RecordedAction[];
  timestamp: number;
}

// ─── Healing Request ────────────────────────────────────────────

export interface HealingRequest {
  id: string;
  executionLogId: string;
  error: ExecutionError;
  currentCode: string;
  failedAction: RecordedAction;
  screenshot?: string;
  context: HealingContext;
}

// ─── Code Change ────────────────────────────────────────────────

export type CodeChangeType =
  | 'selector_update'
  | 'wait_add'
  | 'retry_wrap'
  | 'alternative_path'
  | 'skip';

export interface CodeChange {
  type: CodeChangeType;
  original: string;
  replacement: string;
  reason: string;
}

// ─── Fallback Action ────────────────────────────────────────────

export type FallbackActionType =
  | 'skip'
  | 'wait_and_retry'
  | 'use_alternative'
  | 'pause_for_human';

export interface FallbackAction {
  type: FallbackActionType;
  description: string;
}

// ─── Healing Result ─────────────────────────────────────────────

export interface HealingResult {
  success: boolean;
  repairedCode?: string;
  changes: CodeChange[];
  explanation: string;
  confidence: number;
  requiresApproval: boolean;
  fallbackAction?: FallbackAction;
}

// ─── Healing Metrics ────────────────────────────────────────────

export interface HealingMetrics {
  totalErrors: number;
  autoRepaired: number;
  escalated: number;
  successRate: number;
  averageHealingTime: number;
}

// ─── Semantic Match ─────────────────────────────────────────────

export interface SemanticMatch {
  selector: ElementSelector;
  confidence: number;
  visualSimilarity: number;
  textMatch: boolean;
  contextMatch: boolean;
}

// ─── Healing Config ─────────────────────────────────────────────

export interface HealingConfig {
  maxAutoRepairs: number;
  confidenceThreshold: number;
  enableVision: boolean;
  maxHealingAttempts: number;
  escalateAfter: number;
}

// ─── Classification Rules ───────────────────────────────────────

export interface ClassificationRule {
  strategy: HealingStrategy;
  severity: ErrorSeverity;
  recoverable: boolean;
}

export const CLASSIFICATION_RULES: Record<ErrorType, ClassificationRule> = {
  element_not_found: {
    strategy: 'find_alternative',
    severity: 'medium',
    recoverable: true,
  },
  stale_element: {
    strategy: 'retry_with_wait',
    severity: 'low',
    recoverable: true,
  },
  navigation_failed: {
    strategy: 'retry_same',
    severity: 'high',
    recoverable: true,
  },
  timeout: {
    strategy: 'retry_with_wait',
    severity: 'medium',
    recoverable: true,
  },
  permission_denied: {
    strategy: 'pause_for_human',
    severity: 'high',
    recoverable: false,
  },
  data_mismatch: {
    strategy: 'skip_and_continue',
    severity: 'medium',
    recoverable: true,
  },
  popup_interference: {
    strategy: 'find_alternative',
    severity: 'low',
    recoverable: true,
  },
  session_expired: {
    strategy: 'pause_for_human',
    severity: 'critical',
    recoverable: false,
  },
  network_error: {
    strategy: 'retry_with_wait',
    severity: 'high',
    recoverable: true,
  },
  unknown: {
    strategy: 'pause_for_human',
    severity: 'medium',
    recoverable: false,
  },
};
