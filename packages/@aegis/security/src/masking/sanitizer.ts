/**
 * Operation Log Sanitizer — applies PII masking across operation logs.
 */

import { PII_DETECTIONS, type PIICategory, type PIIDetection, type PIIPattern } from './pii-patterns';
import { maskText } from './masker';
import type { OperationLog, OperationStep } from '@aegis/shared';

export interface SanitizeOptions {
  categories?: PIICategory[];
  customPatterns?: PIIPattern[];
  aggressive?: boolean;
}

export interface SanitizeStats {
  totalDetections: number;
  byCategory: Record<string, number>;
  fieldsModified: number;
}

export interface SanitizedLog extends OperationLog {
  sanitized: true;
  detections: PIIDetection[];
  stats: SanitizeStats;
}

function createEmptyStats(): SanitizeStats {
  return {
    totalDetections: 0,
    byCategory: {},
    fieldsModified: 0,
  };
}

function mergeStats(target: SanitizeStats, detections: PIIDetection[], fieldsModified: number): void {
  target.totalDetections += detections.length;
  target.fieldsModified += fieldsModified;
  for (const d of detections) {
    target.byCategory[d.category] = (target.byCategory[d.category] || 0) + 1;
  }
}

export class LogSanitizer {
  private options: SanitizeOptions;
  private allPatterns: PIIPattern[];
  private allDetections: PIIDetection[] = [];
  private stats: SanitizeStats = createEmptyStats();

  constructor(options?: SanitizeOptions) {
    this.options = options || {};
    this.allPatterns = [...PII_DETECTIONS];
    if (this.options.customPatterns) {
      this.allPatterns.push(...this.options.customPatterns);
    }
  }

  private sanitizeStep(step: OperationStep): { step: OperationStep; detections: PIIDetection[]; fieldsModified: number } {
    const detections: PIIDetection[] = [];
    let fieldsModified = 0;
    const newTarget = { ...step.target };

    if (newTarget.text) {
      const result = maskText(newTarget.text, this.options.categories, this.allPatterns);
      if (result.wasModified) {
        newTarget.text = result.masked;
        detections.push(...result.detections);
        fieldsModified++;
      }
    }

    if (newTarget.selector) {
      const result = maskText(newTarget.selector, this.options.categories, this.allPatterns);
      if (result.wasModified) {
        newTarget.selector = result.masked;
        detections.push(...result.detections);
        fieldsModified++;
      }
    }

    return {
      step: { ...step, target: newTarget },
      detections,
      fieldsModified,
    };
  }

  sanitizeLog(log: OperationLog): SanitizedLog {
    this.allDetections = [];
    this.stats = createEmptyStats();

    const sanitizedSteps: OperationStep[] = [];
    let totalFieldsModified = 0;

    for (const step of log.steps) {
      const { step: sanitizedStep, detections, fieldsModified } = this.sanitizeStep(step);
      this.allDetections.push(...detections);
      totalFieldsModified += fieldsModified;
      sanitizedSteps.push(sanitizedStep);
    }

    mergeStats(this.stats, this.allDetections, totalFieldsModified);

    return {
      ...log,
      steps: sanitizedSteps,
      sanitized: true as const,
      detections: [...this.allDetections],
      stats: { ...this.stats },
    };
  }

  sanitizeAction(action: OperationStep): OperationStep {
    const { step } = this.sanitizeStep(action);
    return step;
  }

  sanitizeValue(value: string): string {
    const result = maskText(value, this.options.categories, this.allPatterns);
    this.allDetections.push(...result.detections);
    return result.masked;
  }

  getDetections(): PIIDetection[] {
    return [...this.allDetections];
  }

  getStats(): SanitizeStats {
    return { ...this.stats };
  }
}
