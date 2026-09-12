import type {
  ExecutionError,
  HealingContext,
  ErrorType,
  ErrorClassification,
} from './types';
import { CLASSIFICATION_RULES } from './types';

// ─── Error Pattern Matching ─────────────────────────────────────

interface ErrorPattern {
  type: ErrorType;
  patterns: RegExp[];
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    type: 'element_not_found',
    patterns: [
      /element\s+not\s+found/i,
      /no\s+such\s+element/i,
      /unable\s+to\s+locate\s+element/i,
      /selector\s+not\s+found/i,
      /element\s+does\s+not\s+exist/i,
    ],
  },
  {
    type: 'stale_element',
    patterns: [
      /stale\s+element/i,
      /element\s+is\s+detached/i,
      /stale\s+element\s+reference/i,
      /element\s+not\s+attached/i,
      /element\s+reference\s+is\s+stale/i,
      /reference\s+is\s+stale/i,
    ],
  },
  {
    type: 'navigation_failed',
    patterns: [
      /navigation\s+failed/i,
      /could\s+not\s+navigate/i,
      /unable\s+to\s+navigate/i,
      /failed\s+to\s+navigate/i,
      /page\s+load\s+timeout/i,
      /navigate.*timeout/i,
    ],
  },
  {
    type: 'timeout',
    patterns: [
      /timeout/i,
      /timed?\s*out/i,
      /wait\s+for\s+element.*timeout/i,
    ],
  },
  {
    type: 'permission_denied',
    patterns: [
      /permission\s+denied/i,
      /access\s+forbidden/i,
      /insufficient\s+privilege/i,
      /unauthorized/i,
    ],
  },
  {
    type: 'data_mismatch',
    patterns: [
      /data\s+mismatch/i,
      /assertion\s+failed/i,
      /expected.*but\s+got/i,
      /value\s+mismatch/i,
      /text\s+mismatch/i,
    ],
  },
  {
    type: 'popup_interference',
    patterns: [
      /popup/i,
      /modal/i,
      /overlay/i,
      /cookie\s+consent/i,
      /dialog\s+blocking/i,
      /interference/i,
    ],
  },
  {
    type: 'session_expired',
    patterns: [
      /session\s+expired/i,
      /re-authentication/i,
      /please\s+log\s+in/i,
      /session\s+timeout/i,
    ],
  },
  {
    type: 'network_error',
    patterns: [
      /network\s+error/i,
      /econnrefused/i,
      /fetch\s+failed/i,
      /connection\s+refused/i,
      /dns\s+resolution/i,
    ],
  },
];

// ─── Classification Logic ───────────────────────────────────────

export function classifyError(
  error: ExecutionError,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- context is part of the public API and reserved for context-aware classification
  context: HealingContext,
): ErrorClassification {
  const searchText = [error.message, error.stack || '', error.code || ''].join(' ');

  // Try each pattern to classify the error type
  for (const { type, patterns } of ERROR_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(searchText)) {
        const rule = CLASSIFICATION_RULES[type];
        return {
          type,
          severity: rule.severity,
          recoverable: rule.recoverable,
          suggestedStrategy: rule.strategy,
        };
      }
    }
  }

  // Default to unknown
  const unknownRule = CLASSIFICATION_RULES.unknown;
  return {
    type: 'unknown',
    severity: unknownRule.severity,
    recoverable: unknownRule.recoverable,
    suggestedStrategy: unknownRule.strategy,
  };
}

// ─── Re-export CLASSIFICATION_RULES for tests ───────────────────
export { CLASSIFICATION_RULES };
