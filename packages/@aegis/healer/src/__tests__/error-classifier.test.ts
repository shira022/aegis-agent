import { describe, it, expect } from 'vitest';
import type { ExecutionError, HealingContext } from '../types';
import {
  classifyError,
  CLASSIFICATION_RULES,
} from '../error-classifier';

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

// ─── Error Classifier Tests ─────────────────────────────────────

describe('classifyError', () => {
  it('classifies element_not_found errors', () => {
    const error = makeError('Element not found: button#submit');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('element_not_found');
    expect(result.severity).toBe('medium');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('find_alternative');
  });

  it('classifies stale_element errors', () => {
    const error = makeError('Stale element reference: element is detached from DOM');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('stale_element');
    expect(result.severity).toBe('low');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('retry_with_wait');
  });

  it('classifies navigation_failed errors', () => {
    const error = makeError('Navigation failed: timeout navigating to URL');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('navigation_failed');
    expect(result.severity).toBe('high');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('retry_same');
  });

  it('classifies timeout errors', () => {
    const error = makeError('Timeout waiting for element to appear after 30000ms');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('timeout');
    expect(result.severity).toBe('medium');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('retry_with_wait');
  });

  it('classifies permission_denied errors', () => {
    const error = makeError('Permission denied: insufficient privileges');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('permission_denied');
    expect(result.severity).toBe('high');
    expect(result.recoverable).toBe(false);
    expect(result.suggestedStrategy).toBe('pause_for_human');
  });

  it('classifies data_mismatch errors', () => {
    const error = makeError('Data mismatch: expected "Hello" but got "World"');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('data_mismatch');
    expect(result.severity).toBe('medium');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('skip_and_continue');
  });

  it('classifies popup_interference errors', () => {
    const error = makeError('Popup interference: cookie consent dialog blocking interaction');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('popup_interference');
    expect(result.severity).toBe('low');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('find_alternative');
  });

  it('classifies session_expired errors', () => {
    const error = makeError('Session expired: please log in again');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('session_expired');
    expect(result.severity).toBe('critical');
    expect(result.recoverable).toBe(false);
    expect(result.suggestedStrategy).toBe('pause_for_human');
  });

  it('classifies network_error errors', () => {
    const error = makeError('Network error: fetch failed');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('network_error');
    expect(result.severity).toBe('high');
    expect(result.recoverable).toBe(true);
    expect(result.suggestedStrategy).toBe('retry_with_wait');
  });

  it('classifies unknown errors as unknown type', () => {
    const error = makeError('Something completely unexpected happened');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('unknown');
    expect(result.severity).toBe('medium');
    expect(result.recoverable).toBe(false);
    expect(result.suggestedStrategy).toBe('pause_for_human');
  });

  it('classifies errors with stack traces containing element_not_found', () => {
    const error = makeError('Runtime error', {
      stack: 'Error: Element not found\n  at line 5\n  at step3()',
    });
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('element_not_found');
  });

  it('classifies errors with stack traces containing timeout', () => {
    const error = makeError('Script failed', {
      stack: 'TimeoutError: operation timed out\n  at waitForElement()',
    });
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('timeout');
  });

  it('uses message text patterns to detect navigation_failed', () => {
    const error = makeError('Could not navigate to page');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('navigation_failed');
  });

  it('detects popup_interference from message keywords', () => {
    const error = makeError('Interaction blocked by modal popup overlay');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('popup_interference');
  });

  it('detects session_expired from message', () => {
    const error = makeError('Your session has expired, re-authentication required');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('session_expired');
  });

  it('detects stale_element from message text', () => {
    const error = makeError('Element reference is stale, page may have navigated');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('stale_element');
  });

  it('detects permission_denied from message', () => {
    const error = makeError('Access forbidden: permission denied by server');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('permission_denied');
  });

  it('detects data_mismatch from message', () => {
    const error = makeError('Assertion failed: data mismatch in field value');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('data_mismatch');
  });

  it('detects network_error from message', () => {
    const error = makeError('ECONNREFUSED: network error connecting to host');
    const context = makeContext();
    const result = classifyError(error, context);

    expect(result.type).toBe('network_error');
  });

  it('classifies all error types in CLASSIFICATION_RULES', () => {
    const allErrorTypes = [
      'element_not_found',
      'stale_element',
      'navigation_failed',
      'timeout',
      'permission_denied',
      'data_mismatch',
      'popup_interference',
      'session_expired',
      'network_error',
      'unknown',
    ] as const;

    for (const errorType of allErrorTypes) {
      expect(CLASSIFICATION_RULES).toHaveProperty(errorType);
      const rule = CLASSIFICATION_RULES[errorType];
      expect(rule).toHaveProperty('strategy');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('recoverable');
    }
  });
});
