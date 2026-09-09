// ─── Types ─────────────────────────────────────────────────────────

export type {
  AIConfig,
  CodeGenerationRequest,
  CodeGenerationResponse,
  ExceptionHandler,
  GenerationMetadata,
  SafetyRule,
  ValidationResult,
  SafetyCheck,
  SyntaxCheck,
  DangerCheck,
  DeterminismCheck,
} from './types';

// ─── Validators ────────────────────────────────────────────────────

export {
  validateSyntax,
  validateNoDangerousOps,
  validateDeterministic,
  BLOCKED_PATTERNS,
} from './validators';

// ─── Prompt Builder ────────────────────────────────────────────────

export {
  buildCodeGenerationPrompt,
  buildExceptionPrompt,
  buildHealingPrompt,
  SAFETY_PROMPT,
} from './prompt-builder';

// ─── Provider Adapter ──────────────────────────────────────────────

export { createProviderModel, requiresApiKey } from './provider-adapter';
export type { ProviderCredentials } from './provider-adapter';

// ─── Generator ─────────────────────────────────────────────────────

export { AiEngine } from './generator';
