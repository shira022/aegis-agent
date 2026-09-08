import type { OperationLog } from '@aegis/shared';

// ─── AI Provider ───────────────────────────────────────────────────

export type AIProvider = 'openai' | 'anthropic' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

// ─── Code Generation ───────────────────────────────────────────────

export interface CodeGenerationRequest {
  operationLog: OperationLog;
  context?: string;
  safetyRules?: string[];
  platform?: string;
}

export interface ExceptionHandler {
  condition: string;
  action: string;
  code: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GenerationMetadata {
  model: string;
  tokensUsed: number;
  generatedAt: number;
  latencyMs: number;
}

export interface CodeGenerationResponse {
  code: string;
  explanation: string;
  exceptionHandlers: ExceptionHandler[];
  warnings: string[];
  metadata: GenerationMetadata;
}

// ─── Safety ────────────────────────────────────────────────────────

export interface SafetyRule {
  id: string;
  description: string;
  validator: string; // regex pattern or function name
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SafetyCheck {
  pattern: string;
  safe: boolean;
  violation?: string;
}

// ─── Validators ────────────────────────────────────────────────────

export interface SyntaxCheck {
  valid: boolean;
  errors: string[];
}

export interface DangerCheck {
  safe: boolean;
  violations: string[];
}

export interface DeterminismCheck {
  deterministic: boolean;
  issues: string[];
}
