// ─── Typed Text Extraction Failures (ADR-009(d)) ───────────────────

/**
 * Failure kinds when a provider response carries no generated text.
 * Mirrors the Rust `TextExtractionError` enum in
 * `apps/desktop/src-tauri/src/ai_client/providers.rs`.
 */
export type TextExtractionFailureKind = 'missing' | 'reasoning-only';

/**
 * Typed error thrown when a provider response contains no usable text.
 *
 * Reasoning ("thinking") output is never a source of generated code
 * (ADR-009(d)): a response that carries only reasoning text fails with
 * kind `'reasoning-only'` and preserves the reasoning for diagnostics,
 * so it can be surfaced as the model's explanation without ever being
 * parsed as a script or a plan.
 */
export class TextExtractionError extends Error {
  readonly kind: TextExtractionFailureKind;
  readonly reasoning?: string;

  constructor(kind: TextExtractionFailureKind, reasoning?: string) {
    super(
      kind === 'reasoning-only'
        ? 'provider returned reasoning only (no generated text); disable thinking mode for this model if it supports it'
        : 'provider response did not contain generated text',
    );
    this.name = 'TextExtractionError';
    this.kind = kind;
    if (kind === 'reasoning-only') {
      this.reasoning = reasoning;
    }
  }
}
