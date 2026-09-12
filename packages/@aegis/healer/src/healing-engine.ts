import { classifyError } from './error-classifier';
import { VisionAnalyzer } from './vision-analyzer';
import { CodePatcher } from './code-patcher';
import type {
  ExecutionError,
  HealingContext,
  HealingConfig,
  HealingRequest,
  HealingResult,
  HealingMetrics,
  ErrorClassification,
  CodeChange,
} from './types';

// ─── Healing Engine ─────────────────────────────────────────────
// Orchestrates the self-healing flow:
// error → classify → analyze → patch → validate → result

interface HealingAttempt {
  executionLogId: string;
  timestamp: number;
  duration: number;
  success: boolean;
}

export class HealingEngine {
  private config: HealingConfig;
  private visionAnalyzer: VisionAnalyzer;
  private codePatcher: CodePatcher;
  private healingHistory: Map<string, HealingRequest[]> = new Map();
  private healingAttempts: Map<string, number> = new Map();
  private attemptRecords: HealingAttempt[] = [];

  constructor(config: HealingConfig) {
    this.config = config;
    this.visionAnalyzer = new VisionAnalyzer();
    this.codePatcher = new CodePatcher();
  }

  /**
   * Handle an execution error and attempt self-healing.
   */
  async handleError(
    error: ExecutionError,
    context: HealingContext,
    screenshot?: string,
  ): Promise<HealingResult> {
    const startTime = Date.now();

    // Build a request from the error + context
    const request: HealingRequest = {
      id: `heal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      executionLogId: `exec-${context.timestamp}`,
      error,
      currentCode: '',
      failedAction: {
        id: error.actionId,
        type: 'click',
        timestamp: error.timestamp,
        selector: {},
        metadata: { url: context.url, title: context.pageTitle },
      },
      screenshot,
      context,
    };

    const result = await this.analyzeAndHeal(request);

    // Record timing
    const duration = Date.now() - startTime;
    this.attemptRecords.push({
      executionLogId: request.executionLogId,
      timestamp: startTime,
      duration,
      success: result.success,
    });

    return result;
  }

  /**
   * Analyze a healing request and attempt to repair the code.
   */
  async analyzeAndHeal(request: HealingRequest): Promise<HealingResult> {
    // Record in history
    const history = this.healingHistory.get(request.executionLogId) || [];
    history.push(request);
    this.healingHistory.set(request.executionLogId, history);

    // Check if we should escalate
    if (this.shouldEscalate(request)) {
      return {
        success: false,
        changes: [],
        explanation: 'Escalated to human: error type requires manual intervention or max attempts exceeded',
        confidence: 0,
        requiresApproval: true,
        fallbackAction: {
          type: 'pause_for_human',
          description: 'This error requires human intervention',
        },
      };
    }

    // Classify the error
    const classification = classifyError(request.error, request.context);

    // Increment attempt counter
    const attemptKey = request.executionLogId;
    const currentAttempts = this.healingAttempts.get(attemptKey) || 0;
    this.healingAttempts.set(attemptKey, currentAttempts + 1);

    // If not recoverable, return failure
    if (!classification.recoverable) {
      return this.buildUnrecoverableResult(classification);
    }

    // If not recoverable, escalate
    if (!classification.recoverable) {
      return {
        success: false,
        changes: [],
        explanation: `Error classified as ${classification.type} with ${classification.severity} severity — not recoverable automatically`,
        confidence: 0,
        requiresApproval: true,
      };
    }

    // Attempt healing based on strategy
    const result = await this.applyHealingStrategy(classification, request);

    // Check confidence threshold
    if (result.confidence < this.config.confidenceThreshold) {
      result.requiresApproval = true;
      result.fallbackAction = {
        type: 'pause_for_human',
        description: `Confidence ${result.confidence.toFixed(2)} below threshold ${this.config.confidenceThreshold}`,
      };
    }

    return result;
  }

  /**
   * Get healing metrics.
   */
  getMetrics(): HealingMetrics {
    const totalErrors = this.attemptRecords.length;
    const autoRepaired = this.attemptRecords.filter((r) => r.success).length;
    const escalated = this.attemptRecords.filter((r) => !r.success).length;
    const successRate = totalErrors > 0 ? autoRepaired / totalErrors : 0;
    const averageHealingTime =
      totalErrors > 0
        ? this.attemptRecords.reduce((sum, r) => sum + r.duration, 0) / totalErrors
        : 0;

    return {
      totalErrors,
      autoRepaired,
      escalated,
      successRate,
      averageHealingTime,
    };
  }

  /**
   * Get healing history for a specific execution log.
   */
  getHealingHistory(executionLogId: string): HealingRequest[] {
    return this.healingHistory.get(executionLogId) || [];
  }

  /**
   * Determine if a request should be escalated to human.
   */
  shouldEscalate(request: HealingRequest): boolean {
    const classification = classifyError(request.error, request.context);

    // Always escalate critical/non-recoverable errors
    if (!classification.recoverable) {
      return true;
    }

    // Check attempt count
    const attempts = this.healingAttempts.get(request.executionLogId) || 0;
    if (attempts >= this.config.escalateAfter) {
      return true;
    }

    return false;
  }

  // ─── Private Helpers ────────────────────────────────────────

  private buildUnrecoverableResult(
    classification: ErrorClassification,
  ): HealingResult {
    const fallbackType =
      classification.suggestedStrategy === 'pause_for_human'
        ? 'pause_for_human'
        : 'skip';

    return {
      success: false,
      changes: [],
      explanation: `Error type "${classification.type}" (severity: ${classification.severity}) is not automatically recoverable`,
      confidence: 0,
      requiresApproval: true,
      fallbackAction: {
        type: fallbackType as 'pause_for_human' | 'skip',
        description: `Strategy: ${classification.suggestedStrategy}`,
      },
    };
  }

  private async applyHealingStrategy(
    classification: ErrorClassification,
    request: HealingRequest,
  ): Promise<HealingResult> {
    const changes: CodeChange[] = [];
    let confidence = 0.5;
    let repairedCode = request.currentCode;

    switch (classification.suggestedStrategy) {
      case 'find_alternative': {
        // Try to find an alternative selector
        if (request.screenshot && request.failedAction.selector.cssSelector) {
          const altSelector = await this.visionAnalyzer.findAlternativeSelector(
            request.screenshot,
            request.failedAction.selector,
          );
          if (altSelector.cssSelector !== request.failedAction.selector.cssSelector) {
            repairedCode = this.codePatcher.patchSelector(
              request.currentCode,
              request.failedAction.selector,
              altSelector,
            );
            changes.push({
              type: 'selector_update',
              original: request.failedAction.selector.cssSelector || '',
              replacement: altSelector.cssSelector || '',
              reason: `Element "${request.failedAction.selector.cssSelector}" not found; using alternative`,
            });
            confidence = 0.7;
          }
        }
        // Fallback: add retry
        if (changes.length === 0) {
          repairedCode = this.codePatcher.addRetryLogic(request.currentCode, 0, 3);
          changes.push({
            type: 'retry_wrap',
            original: request.currentCode,
            replacement: repairedCode,
            reason: 'Adding retry logic for element lookup',
          });
          confidence = 0.5;
        }
        break;
      }

      case 'retry_with_wait': {
        repairedCode = this.codePatcher.addWaitCondition(request.currentCode, 0, 'element to be ready');
        changes.push({
          type: 'wait_add',
          original: request.currentCode,
          replacement: repairedCode,
          reason: 'Adding wait condition for timing-related error',
        });
        confidence = 0.6;
        break;
      }

      case 'retry_same': {
        repairedCode = this.codePatcher.addRetryLogic(request.currentCode, 0, 3);
        changes.push({
          type: 'retry_wrap',
          original: request.currentCode,
          replacement: repairedCode,
          reason: 'Retrying same operation',
        });
        confidence = 0.55;
        break;
      }

      case 'skip_and_continue': {
        changes.push({
          type: 'skip',
          original: request.currentCode,
          replacement: request.currentCode,
          reason: 'Skipping failed action and continuing',
        });
        confidence = 0.6;
        break;
      }

      default: {
        // pause_for_human / abort
        confidence = 0;
        break;
      }
    }

    const success = confidence >= this.config.confidenceThreshold;

    return {
      success,
      repairedCode: success ? repairedCode : undefined,
      changes,
      explanation: this.generateExplanation(classification, changes),
      confidence,
      requiresApproval: !success,
    };
  }

  private generateExplanation(
    classification: ErrorClassification,
    changes: CodeChange[],
  ): string {
    const parts = [
      `Error type: ${classification.type} (${classification.severity})`,
      `Strategy: ${classification.suggestedStrategy}`,
    ];

    if (changes.length > 0) {
      parts.push(`Applied ${changes.length} change(s):`);
      for (const change of changes) {
        parts.push(`  - ${change.type}: ${change.reason}`);
      }
    } else {
      parts.push('No changes applied — requires manual intervention');
    }

    return parts.join('\n');
  }
}
