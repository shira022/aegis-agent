/**
 * PII Validator — validates that text/logs are free of PII.
 */

import { type PIIDetection } from './pii-patterns';
import { maskText } from './masker';
import { LogSanitizer, type SanitizedLog } from './sanitizer';
import type { OperationLog } from '@aegis/shared';

export interface ValidationResult {
  clean: boolean;
  detections: PIIDetection[];
}

export interface LogValidationResult {
  safe: boolean;
  issues: string[];
  detections: PIIDetection[];
}

/**
 * Validate that text is free of PII.
 */
export function validateNoPII(text: string): ValidationResult {
  const result = maskText(text);
  return {
    clean: !result.wasModified,
    detections: result.detections,
  };
}

/**
 * Validate that an operation log is safe (no PII).
 */
export function validateLogSafe(log: OperationLog): LogValidationResult {
  const allDetections: PIIDetection[] = [];
  const issues: string[] = [];

  for (let i = 0; i < log.steps.length; i++) {
    const step = log.steps[i];
    if (step.target.text) {
      const result = maskText(step.target.text);
      for (const d of result.detections) {
        allDetections.push(d);
        issues.push(`Step ${i}: ${d.category} detected (${d.originalValue})`);
      }
    }
    if (step.target.selector) {
      const result = maskText(step.target.selector);
      for (const d of result.detections) {
        allDetections.push(d);
        issues.push(`Step ${i}: ${d.category} detected in selector (${d.originalValue})`);
      }
    }
  }

  return {
    safe: issues.length === 0,
    issues,
    detections: allDetections,
  };
}

/**
 * Create a sanitized log from an unsafe log using a LogSanitizer.
 */
export function createSafeLog(log: OperationLog, sanitizer: LogSanitizer): SanitizedLog {
  return sanitizer.sanitizeLog(log);
}
