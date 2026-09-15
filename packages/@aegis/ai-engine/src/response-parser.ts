// ─── Fence-tolerant response parsing (ADR-010 E2E) ──────────────────

/**
 * A complete markdown code block: an opening fence with an optional
 * language tag (e.g. "```json"), inner content, and a closing fence.
 * The lazy inner capture anchored at `$` strips only the outermost
 * fence, so fences nested inside the content are left untouched.
 */
const FENCED_BLOCK_RE = /^```[^\r\n`]*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```[ \t]*$/;

function stripOuterFence(text: string): string | null {
  const match = text.match(FENCED_BLOCK_RE);
  return match === null ? null : match[1].trim();
}

function parsesAsJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract a JSON payload from a provider response.
 *
 * Real-model runs (ADR-010) showed chat models wrapping their whole
 * JSON reply in a markdown fence and sometimes adding prose around it.
 * This tolerates both without ever rewriting the JSON itself:
 *
 * 1. trim the input;
 * 2. strip the outer markdown fence when the reply is fully fenced;
 * 3. return the text when it parses as JSON, otherwise slice from the
 *    first `{` to the last `}` and retry (prose prefix/suffix);
 * 4. return `null` when nothing parses.
 */
export function extractJsonPayload(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const unfenced = stripOuterFence(trimmed) ?? trimmed;
  if (parsesAsJson(unfenced)) {
    return unfenced;
  }

  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const sliced = unfenced.slice(start, end + 1);
    if (parsesAsJson(sliced)) {
      return sliced;
    }
  }

  return null;
}

/**
 * Strip the outer markdown fence from a generated `code` value.
 *
 * Some models nest a fenced code block inside the JSON string value
 * ("```python ... ```"). Only the outer fence is removed; the code
 * itself is never rewritten. Unfenced values are returned unchanged.
 */
export function stripOuterCodeFence(code: string): string {
  const stripped = stripOuterFence(code.trim());
  return stripped ?? code;
}
