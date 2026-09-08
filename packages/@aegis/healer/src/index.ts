// ─── Types ─────────────────────────────────────────────────────

export type {
  HealingState,
  ErrorType,
  ErrorSeverity,
  HealingStrategy,
  ErrorClassification,
  ExecutionError,
  HealingContext,
  HealingRequest,
  CodeChangeType,
  CodeChange,
  FallbackActionType,
  FallbackAction,
  HealingResult,
  HealingMetrics,
  SemanticMatch,
  HealingConfig,
  ClassificationRule,
} from './types';

export { CLASSIFICATION_RULES } from './types';

// ─── Error Classifier ──────────────────────────────────────────

export { classifyError } from './error-classifier';

// ─── Vision Analyzer ───────────────────────────────────────────

export { VisionAnalyzer } from './vision-analyzer';

// ─── Code Patcher ──────────────────────────────────────────────

export { CodePatcher } from './code-patcher';

// ─── Healing Engine ────────────────────────────────────────────

export { HealingEngine } from './healing-engine';
