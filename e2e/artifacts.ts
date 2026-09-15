// ─── Run Artifacts (ADR-010) ─────────────────────────────────────────

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Python artifacts (`<timestamp>-artifact.py`) are written next to the JSON records. */
export const ARTIFACTS_DIR = fileURLToPath(new URL('./.artifacts/', import.meta.url));

export type E2eSuite = 'generation' | 'execution';
export type E2eFinalState = 'executed' | 'skipped';
/** How the Group B artifact was executed: against the permissive stub layer, or against the real Python environment. */
export type E2eStubMode = 'stubbed' | 'real';

/**
 * One JSON record per suite group per run. Credentials are deliberately
 * not representable here: the record carries observed values only, and
 * `AEGIS_E2E_API_KEY` must never appear in it or in the repository.
 */
export interface E2eArtifactRecord {
  suite: E2eSuite;
  timestamp: string;
  provider: string | null;
  baseUrl: string | null;
  model: string | null;
  finalState: E2eFinalState;
  skipReason?: string;
  /** Observed generation latency compared against AI-NF01 (not asserted). */
  latencyMs?: number;
  latencyBudgetMs?: number;
  meetsLatencyBudget?: boolean;
  tokensUsed?: number;
  syntaxValid?: boolean;
  validationErrors?: string[];
  dangerousPatternViolations?: string[];
  deterministic?: boolean;
  determinismIssues?: string[];
  /** The retry with `disableThinking` fired (ADR-009(d) auto-detection). */
  thinkingAutoDisabled?: boolean;
  /** File name of the Python artifact inside `e2e/.artifacts/` (Group B). */
  artifactScript?: string;
  /**
   * sha256 of the Python artifact, recorded before execution and
   * re-verified immediately before the run (Group B). The executed
   * bytes are therefore provably the bytes Group A produced.
   */
  artifactSha256?: string;
  /** Top-level Python modules the stub layer covered in this run (Group B). */
  usedStubs?: string[];
  /** `stubbed` when the artifact ran against the permissive stub layer; `real` when stubbing was disabled (Group B). */
  stubMode?: E2eStubMode;
  exitCode?: number;
  executionDurationMs?: number;
  executionTimedOut?: boolean;
  error?: string;
}

/**
 * Write one JSON record for this run to `e2e/.artifacts/`, creating the
 * directory if it is missing. The file name is the epoch-millisecond
 * timestamp plus the group slug, so the two groups can never overwrite
 * each other's record within the same millisecond.
 */
export async function writeArtifactRecord(record: E2eArtifactRecord): Promise<string> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const filePath = join(ARTIFACTS_DIR, `${Date.now()}-${record.suite}.json`);
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return filePath;
}

/**
 * Rewrite an existing record file in place. Group B records the Python
 * artifact's sha256 BEFORE execution, then rewrites the same file with
 * the observed exit code afterwards, so one complete record per group
 * per run is preserved.
 */
export async function rewriteArtifactRecord(filePath: string, record: E2eArtifactRecord): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}
