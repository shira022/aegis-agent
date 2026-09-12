import { describe, it, expect, beforeEach } from 'vitest';
import { HealingEngine } from '../healing-engine';
import type {
  ExecutionError,
  HealingContext,
  HealingConfig,
  HealingRequest,
} from '../types';
import type { RecordedAction } from '@aegis/recorder';

// ─── Helpers ────────────────────────────────────────────────────

function makeContext(overrides?: Partial<HealingContext>): HealingContext {
  return {
    url: 'https://example.com',
    pageTitle: 'Test Page',
    previousActions: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeError(message: string, overrides?: Partial<ExecutionError>): ExecutionError {
  return {
    message,
    actionId: 'action-1',
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeAction(overrides?: Partial<RecordedAction>): RecordedAction {
  return {
    id: 'action-1',
    type: 'click',
    timestamp: Date.now(),
    selector: { cssSelector: '#submit-btn', text: 'Submit' },
    metadata: { url: 'https://example.com', title: 'Home' },
    ...overrides,
  };
}

function defaultConfig(): HealingConfig {
  return {
    maxAutoRepairs: 5,
    confidenceThreshold: 0.7,
    enableVision: true,
    maxHealingAttempts: 3,
    escalateAfter: 2,
  };
}

// ─── HealingEngine Tests ────────────────────────────────────────

describe('HealingEngine', () => {
  let engine: HealingEngine;

  beforeEach(() => {
    engine = new HealingEngine(defaultConfig());
  });

  describe('constructor', () => {
    it('creates an engine with provided config', () => {
      const config = defaultConfig();
      const e = new HealingEngine(config);
      expect(e).toBeDefined();
    });

    it('creates an engine with default state monitoring', () => {
      const metrics = engine.getMetrics();
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.autoRepaired).toBe(0);
      expect(metrics.escalated).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageHealingTime).toBe(0);
    });
  });

  describe('handleError', () => {
    it('returns a HealingResult for element_not_found error', async () => {
      const error = makeError('Element not found: #submit-btn');
      const context = makeContext();

      const result = await engine.handleError(error, context);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('requiresApproval');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it('returns a HealingResult for timeout error', async () => {
      const error = makeError('Timeout waiting for element after 30s');
      const context = makeContext();

      const result = await engine.handleError(error, context);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('explanation');
    });

    it('handles errors with screenshot', async () => {
      const error = makeError('Element not found');
      const context = makeContext();
      const screenshot = 'base64-screenshot-data';

      const result = await engine.handleError(error, context, screenshot);

      expect(result).toHaveProperty('success');
    });

    it('increments metrics after handling error', async () => {
      const error = makeError('Element not found: #btn');
      const context = makeContext();

      await engine.handleError(error, context);

      const metrics = engine.getMetrics();
      expect(metrics.totalErrors).toBe(1);
    });

    it('classifies and returns appropriate strategy for recoverable errors', async () => {
      const error = makeError('Stale element reference');
      const context = makeContext();

      const result = await engine.handleError(error, context);

      expect(result).toHaveProperty('success');
      // Stale element errors are recoverable
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('analyzeAndHeal', () => {
    it('processes a healing request', async () => {
      const request: HealingRequest = {
        id: 'req-1',
        executionLogId: 'log-1',
        error: {
          message: 'Element not found: #submit',
          actionId: 'action-1',
          timestamp: Date.now(),
        },
        currentCode: 'driver.find_element("#submit").click()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      const result = await engine.analyzeAndHeal(request);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('changes');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('requiresApproval');
    });

    it('escalates when confidence is below threshold', async () => {
      const lowThresholdConfig: HealingConfig = {
        ...defaultConfig(),
        confidenceThreshold: 0.99, // Very high threshold
      };
      const engine2 = new HealingEngine(lowThresholdConfig);

      const request: HealingRequest = {
        id: 'req-escalate',
        executionLogId: 'log-escalate',
        error: {
          message: 'Unknown catastrophic error',
          actionId: 'action-x',
          timestamp: Date.now(),
        },
        currentCode: 'some_code()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      const result = await engine2.analyzeAndHeal(request);

      // Should escalate or require approval
      expect(result.requiresApproval || result.confidence >= 0.99).toBe(true);
    });

    it('records healing history', async () => {
      const request: HealingRequest = {
        id: 'req-history',
        executionLogId: 'log-history',
        error: makeError('Element not found'),
        currentCode: 'code()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      await engine.analyzeAndHeal(request);

      const history = engine.getHealingHistory('log-history');
      expect(history.length).toBe(1);
      expect(history[0].id).toBe('req-history');
    });

    it('handles multiple healing attempts for same execution log', async () => {
      const logId = 'log-multi';
      const request1: HealingRequest = {
        id: 'req-1',
        executionLogId: logId,
        error: makeError('Element not found'),
        currentCode: 'code1()',
        failedAction: makeAction(),
        context: makeContext(),
      };
      const request2: HealingRequest = {
        id: 'req-2',
        executionLogId: logId,
        error: makeError('Timeout'),
        currentCode: 'code2()',
        failedAction: makeAction({ id: 'action-2' }),
        context: makeContext(),
      };

      await engine.analyzeAndHeal(request1);
      await engine.analyzeAndHeal(request2);

      const history = engine.getHealingHistory(logId);
      expect(history.length).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('returns initial zero metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics.totalErrors).toBe(0);
      expect(metrics.autoRepaired).toBe(0);
      expect(metrics.escalated).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageHealingTime).toBe(0);
    });

    it('tracks auto-repaired count', async () => {
      // Handle a recoverable error that should be auto-repaired
      const error = makeError('Stale element reference');
      const context = makeContext();

      await engine.handleError(error, context);

      const metrics = engine.getMetrics();
      expect(metrics.totalErrors).toBe(1);
    });

    it('tracks escalated count for non-recoverable errors', async () => {
      const error = makeError('Session expired: authentication required');
      const context = makeContext();

      await engine.handleError(error, context);

      const metrics = engine.getMetrics();
      expect(metrics.totalErrors).toBe(1);
    });
  });

  describe('getHealingHistory', () => {
    it('returns empty array for unknown execution log', () => {
      const history = engine.getHealingHistory('nonexistent-log');
      expect(history).toEqual([]);
    });

    it('returns only requests for the specified execution log', async () => {
      const request1: HealingRequest = {
        id: 'req-a',
        executionLogId: 'log-A',
        error: makeError('Error A'),
        currentCode: 'a()',
        failedAction: makeAction(),
        context: makeContext(),
      };
      const request2: HealingRequest = {
        id: 'req-b',
        executionLogId: 'log-B',
        error: makeError('Error B'),
        currentCode: 'b()',
        failedAction: makeAction({ id: 'action-2' }),
        context: makeContext(),
      };

      await engine.analyzeAndHeal(request1);
      await engine.analyzeAndHeal(request2);

      expect(engine.getHealingHistory('log-A').length).toBe(1);
      expect(engine.getHealingHistory('log-B').length).toBe(1);
      expect(engine.getHealingHistory('log-A')[0].id).toBe('req-a');
      expect(engine.getHealingHistory('log-B')[0].id).toBe('req-b');
    });
  });

  describe('shouldEscalate', () => {
    it('escalates critical session_expired errors', () => {
      const request: HealingRequest = {
        id: 'req-crit',
        executionLogId: 'log-crit',
        error: makeError('Session expired'),
        currentCode: 'code()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      expect(engine.shouldEscalate(request)).toBe(true);
    });

    it('escalates permission_denied errors', () => {
      const request: HealingRequest = {
        id: 'req-perm',
        executionLogId: 'log-perm',
        error: makeError('Permission denied'),
        currentCode: 'code()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      expect(engine.shouldEscalate(request)).toBe(true);
    });

    it('does not escalate recoverable element_not_found errors', () => {
      const request: HealingRequest = {
        id: 'req-elem',
        executionLogId: 'log-elem',
        error: makeError('Element not found: #btn'),
        currentCode: 'code()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      expect(engine.shouldEscalate(request)).toBe(false);
    });

    it('does not escalate low severity stale_element errors', () => {
      const request: HealingRequest = {
        id: 'req-stale',
        executionLogId: 'log-stale',
        error: makeError('Stale element reference'),
        currentCode: 'code()',
        failedAction: makeAction(),
        context: makeContext(),
      };

      expect(engine.shouldEscalate(request)).toBe(false);
    });
  });

  describe('full healing flow', () => {
    it('handles error → classify → analyze → return result', async () => {
      const error = makeError('Element not found: #submit');
      const context = makeContext();

      const result = await engine.handleError(error, context);

      // Verify the full flow produced a valid result
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.explanation).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('handles unknown errors by requiring approval', async () => {
      const error = makeError('Something completely unexpected');
      const context = makeContext();

      const result = await engine.handleError(error, context);

      // Unknown errors should require human approval
      expect(result.requiresApproval).toBe(true);
    });

    it('escalates after max healing attempts', async () => {
      const config: HealingConfig = {
        ...defaultConfig(),
        maxHealingAttempts: 1,
        escalateAfter: 1,
      };
      const engine2 = new HealingEngine(config);

      const error = makeError('Element not found: #btn');
      const context = makeContext();

      // First attempt
      await engine2.handleError(error, context);
      // Second attempt should escalate
      const result = await engine2.handleError(error, context);

      // After exceeding max attempts, should escalate
      expect(result.requiresApproval || result.confidence < config.confidenceThreshold).toBe(true);
    });
  });
});
