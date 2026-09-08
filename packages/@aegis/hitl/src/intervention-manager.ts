import crypto from 'crypto';
import type {
  InterventionRequest,
  InterventionOption,
  InterventionDecision,
  ErrorContext,
  RiskLevel,
  InterventionOptionType,
} from './types';

// ─── Default Options by Error Type ───────────────────────────────────

const RECOVERABLE_ERROR_TYPES = new Set([
  'element_not_found',
  'stale_element',
  'navigation_failed',
  'timeout',
  'popup_interference',
  'network_error',
]);

function buildDefaultOptions(context: ErrorContext): InterventionOption[] {
  const options: InterventionOption[] = [
    {
      id: crypto.randomUUID(),
      type: 'skip',
      label: 'Skip',
      description: `Skip this step and continue execution`,
      riskLevel: 'low',
    },
    {
      id: crypto.randomUUID(),
      type: 'retry',
      label: 'Retry',
      description: 'Retry the failed operation',
      riskLevel: 'low',
    },
  ];

  if (RECOVERABLE_ERROR_TYPES.has(context.errorType)) {
    options.push({
      id: crypto.randomUUID(),
      type: 'demonstrate',
      label: 'Demonstrate',
      description: 'Show the correct behavior for the agent to learn',
      riskLevel: 'medium',
    });
    options.push({
      id: crypto.randomUUID(),
      type: 'fix_code',
      label: 'Fix Code',
      description: 'Provide a code-level fix for the error',
      riskLevel: 'high',
    });
  }

  options.push({
    id: crypto.randomUUID(),
    type: 'abort',
    label: 'Abort',
    description: 'Abort the entire execution',
    riskLevel: 'critical',
  });

  return options;
}

// ─── Formatted Option ────────────────────────────────────────────────

export interface FormattedOption {
  label: string;
  description: string;
  riskLevel: RiskLevel;
  type: InterventionOptionType;
}

export interface PresentedOptions {
  request: InterventionRequest;
  formattedOptions: FormattedOption[];
}

// ─── InterventionManager ─────────────────────────────────────────────

export class InterventionManager {
  private pending: Map<string, InterventionRequest> = new Map();

  async handleInterruption(context: ErrorContext): Promise<InterventionRequest> {
    const options = buildDefaultOptions(context);

    const request: InterventionRequest = {
      id: crypto.randomUUID(),
      executionLogId: context.executionLogId,
      error: context.error,
      options,
      createdAt: new Date(),
      timeoutMs: context.metadata?.timeoutMs as number | undefined,
    };

    this.pending.set(request.id, request);
    return request;
  }

  presentOptions(request: InterventionRequest): PresentedOptions {
    return {
      request,
      formattedOptions: request.options.map(opt => ({
        label: opt.label,
        description: opt.description,
        riskLevel: opt.riskLevel,
        type: opt.type,
      })),
    };
  }

  recordDecision(decision: InterventionDecision): boolean {
    if (!this.pending.has(decision.requestId)) {
      return false;
    }

    this.pending.delete(decision.requestId);
    return true;
  }

  getPendingInterventions(): InterventionRequest[] {
    return Array.from(this.pending.values());
  }
}
