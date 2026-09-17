// ─── E2E Environment Configuration (ADR-010) ────────────────────────

import { PROVIDER_REGISTRY } from '@aegis/shared';
import type { ProviderId } from '@aegis/shared';
import { discoverModel, isEndpointReachable } from './model-discovery';

const DEFAULT_PROVIDER_ID: ProviderId = 'openai-compatible';
const DEFAULT_TIMEOUT_MS = 120000;

/** Suite cannot run: no server or no resolvable model (ADR-010 skip path). */
export interface SkippedE2ERuntime {
  status: 'skipped';
  reason: string;
  provider: string | null;
  baseUrl: string | null;
}

/** Suite can run: a model was resolved from the environment or the server. */
export interface ReadyE2ERuntime {
  status: 'ready';
  provider: ProviderId;
  /** Server base URL exactly as configured (for the artifact record). */
  baseUrl: string;
  /** Versioned base URL consumed by the AI SDK (`.../v1`). */
  apiBaseUrl: string;
  model: string;
  apiKey: string | undefined;
  timeoutMs: number;
}

export type E2ERuntime = SkippedE2ERuntime | ReadyE2ERuntime;

/** Type guard used with `describe.skipIf` after the async resolution. */
export function isRuntimeReady(runtime: E2ERuntime): runtime is ReadyE2ERuntime {
  return runtime.status === 'ready';
}

/**
 * Resolve the suite configuration from `AEGIS_E2E_*` variables.
 *
 * Skips (never fails) when no server is configured, the endpoint is
 * unreachable, or no model can be resolved; a model id is taken from
 * `AEGIS_E2E_MODEL` when set and discovered from the server's model
 * list otherwise. Only an invalid `AEGIS_E2E_PROVIDER` value is an
 * error, because silently skipping a typo would hide the operator's
 * own configuration mistake.
 */
export async function resolveE2ERuntime(): Promise<E2ERuntime> {
  const provider = resolveProviderId(process.env.AEGIS_E2E_PROVIDER);
  const baseUrl = process.env.AEGIS_E2E_BASE_URL?.trim() ?? '';
  const timeoutMs = parseTimeoutMs(process.env.AEGIS_E2E_TIMEOUT_MS);

  if (!baseUrl) {
    return {
      status: 'skipped',
      reason: 'AEGIS_E2E_BASE_URL is not set; there is no model server to verify against',
      provider,
      baseUrl: null,
    };
  }

  const resolution = await resolveModel(baseUrl, timeoutMs);
  if ('skipReason' in resolution) {
    return {
      status: 'skipped',
      reason: resolution.skipReason,
      provider,
      baseUrl,
    };
  }

  return {
    status: 'ready',
    provider,
    baseUrl,
    apiBaseUrl: apiBaseUrl(baseUrl),
    model: resolution.model,
    apiKey: process.env.AEGIS_E2E_API_KEY,
    timeoutMs,
  };
}

/** Model id from the environment or the server; a skip reason when neither resolves. */
type ModelResolution = { model: string } | { skipReason: string };

async function resolveModel(baseUrl: string, timeoutMs: number): Promise<ModelResolution> {
  const explicitModel = process.env.AEGIS_E2E_MODEL?.trim() ?? '';
  if (explicitModel.length > 0) {
    // An explicit model id skips discovery, so the endpoint is probed
    // directly: an unreachable server must skip (ADR-010), not fail red.
    if (!(await isEndpointReachable(baseUrl, timeoutMs))) {
      return { skipReason: 'the configured base URL is unreachable; start the model server or check AEGIS_E2E_BASE_URL' };
    }
    return { model: explicitModel };
  }
  const discovered = await discoverModel(baseUrl, timeoutMs);
  if (!discovered) {
    return { skipReason: 'no model resolved at the configured base URL: set AEGIS_E2E_MODEL or check the server' };
  }
  return { model: discovered };
}

function resolveProviderId(raw: string | undefined): ProviderId {
  const provider = raw?.trim() || DEFAULT_PROVIDER_ID;
  if (!(provider in PROVIDER_REGISTRY)) {
    throw new Error(`AEGIS_E2E_PROVIDER "${provider}" is not a provider id known to the registry`);
  }
  return provider as ProviderId;
}

function parseTimeoutMs(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_TIMEOUT_MS;
}

function apiBaseUrl(baseUrl: string): string {
  const root = baseUrl.replace(/\/+$/, '');
  return root.endsWith('/v1') ? root : `${root}/v1`;
}
