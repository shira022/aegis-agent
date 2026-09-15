// ─── Runtime Model Discovery (ADR-010) ──────────────────────────────

/**
 * A model-list probe never needs the full generation budget; bounding it
 * keeps an unreachable server from stalling test collection for minutes.
 */
const DISCOVERY_TIMEOUT_CAP_MS = 5000;

/** First model id advertised by the server at `baseUrl`, or null. */
export async function discoverModel(baseUrl: string, timeoutMs: number): Promise<string | null> {
  const root = baseUrl.replace(/\/+$/, '');
  const timeout = Math.min(timeoutMs, DISCOVERY_TIMEOUT_CAP_MS);
  // A base URL that already carries the version prefix serves its model
  // list at `{base}/models`; a bare server root serves it at
  // `{root}/v1/models`, with Ollama's native `{root}/api/tags` as the
  // fallback.
  const candidates = [
    ...(root.endsWith('/v1') ? [`${root}/models`] : []),
    `${root}/v1/models`,
    `${root}/api/tags`,
  ];
  for (const url of candidates) {
    const modelId = await firstModelId(url, timeout);
    if (modelId) {
      return modelId;
    }
  }
  return null;
}

/**
 * Whether the server at `baseUrl` answers at all. Any HTTP response —
 * including a 404 — proves the endpoint is up; only connection errors,
 * DNS failures and timeouts count as unreachable. The root URL plus the
 * model-list paths are probed so servers that implement only part of
 * the API surface are still detected as reachable.
 */
export async function isEndpointReachable(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const root = baseUrl.replace(/\/+$/, '');
  const timeout = Math.min(timeoutMs, DISCOVERY_TIMEOUT_CAP_MS);
  const candidates = [root, `${root}/v1/models`, `${root}/api/tags`];
  for (const url of candidates) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(timeout) });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/** Fetch a model list and return its first entry; null on any failure. */
async function firstModelId(url: string, timeoutMs: number): Promise<string | null> {
  let body: unknown;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      return null;
    }
    body = await response.json();
  } catch {
    // Unreachable server, timeout, or malformed body — the caller decides
    // whether to skip; discovery itself never throws.
    return null;
  }
  return parseFirstModelId(body);
}

/**
 * Accept both the OpenAI-style `{ data: [{ id }] }` list and the
 * Ollama-style `{ models: [{ name }] }` list.
 */
function parseFirstModelId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const list = Array.isArray(record.data) ? record.data : Array.isArray(record.models) ? record.models : null;
  if (!list) {
    return null;
  }
  for (const entry of list) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const modelId = firstNonEmptyString(candidate.id) ?? firstNonEmptyString(candidate.name) ?? firstNonEmptyString(candidate.model);
    if (modelId) {
      return modelId;
    }
  }
  return null;
}

function firstNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
