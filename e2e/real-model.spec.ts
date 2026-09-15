// ─── ADR-010 Real-Model E2E: One Ordered Spec ────────────────────────
//
// vitest runs spec FILES in parallel, so the generation (Group A) and
// execution (Group B) coverage that previously lived in two files is
// merged here into ONE file with a strictly sequential flow: Group A
// generates and validates the Python artifact exactly once, and Group B
// consumes that SAME in-run result through @aegis/executor. Group B
// never falls back to a bundled sample — no Group A code means Group B
// skips with a recorded reason.

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AiEngine, TextExtractionError, validateDeterministic } from '@aegis/ai-engine';
import type { AIConfig, CodeGenerationRequest, CodeGenerationResponse } from '@aegis/ai-engine';
import type { OperationLog } from '@aegis/shared';
import { ExecutionEngine } from '@aegis/executor';
import { isRuntimeReady, resolveE2ERuntime } from './env';
import { ARTIFACTS_DIR, rewriteArtifactRecord, writeArtifactRecord } from './artifacts';
import type { E2eArtifactRecord, E2eStubMode } from './artifacts';

/**
 * AI-NF01 (`docs/spec/ai-engine.md`): generation response time < 30 s.
 * Latency is recorded as an observed value compared against this budget,
 * never hard-asserted — it legitimately varies with the operator's
 * hardware (ADR-010).
 */
const AI_NF01_LATENCY_BUDGET_MS = 30000;

/** The permissive Python stub layer activated for Group B (see fixtures/stubs/README.md). */
const STUBS_DIR = fileURLToPath(new URL('./fixtures/stubs/', import.meta.url));

const STUB_MODULES_ENV = 'AEGIS_E2E_STUB_MODULES';
const DEFAULT_STUB_MODULES = 'selenium';

/**
 * Top-level Python modules the stub layer covers: `AEGIS_E2E_STUB_MODULES`
 * unset means the default `selenium`; an empty string disables stubbing
 * (the artifact then runs against the real Python environment, recorded
 * as stubMode `real`).
 */
function resolveStubModules(): string[] {
  const raw = process.env[STUB_MODULES_ENV];
  const value = raw === undefined ? DEFAULT_STUB_MODULES : raw;
  return value
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

const runtime = await resolveE2ERuntime();

if (!isRuntimeReady(runtime)) {
  // Absence of a model is not a repository defect (ADR-010): record the
  // skip for both groups so the run leaves evidence, and let
  // `describe.skipIf` keep the result green.
  for (const suite of ['generation', 'execution'] as const) {
    await writeArtifactRecord({
      suite,
      timestamp: new Date().toISOString(),
      provider: runtime.provider,
      baseUrl: runtime.baseUrl,
      model: null,
      finalState: 'skipped',
      skipReason: runtime.reason,
    });
  }
}

/** One fixed RPA-style operation log; the engine derives the prompt from it. */
const FIXED_OPERATION_LOG: OperationLog = {
  id: 'e2e-generation-log',
  taskId: 'e2e-generation-task',
  steps: [
    { type: 'click', target: { selector: '#submit' }, timestamp: '2026-01-01T00:00:00Z' },
    { type: 'type', target: { selector: '#search-box', text: 'aegis' }, timestamp: '2026-01-01T00:00:01Z' },
    { type: 'wait', target: {}, timestamp: '2026-01-01T00:00:02Z' },
  ],
  recordedAt: '2026-01-01T00:00:03Z',
  source: 'browser',
};

/** Scratch state for one generation attempt (with the thinking retry). */
interface GenerationProbe {
  response?: CodeGenerationResponse;
  latencyMs?: number;
  thinkingAutoDisabled: boolean;
}

/** Shared state published by Group A and consumed by Group B in the same run. */
interface GenerationOutcome {
  /** `validated` only when the generated code passed the full engine validation surface. */
  status: 'not-run' | 'validated' | 'failed';
  reason: string;
  code: string | null;
  latencyMs: number | null;
  thinkingAutoDisabled: boolean;
}

/**
 * Generate once, and when the engine reports a reasoning-only response
 * (ADR-009(d) typed error), retry the same request exactly once with
 * `disableThinking: true`. The decision is made from the observed
 * response shape, never from a model name.
 */
async function generateWithThinkingFallback(
  config: AIConfig,
  request: CodeGenerationRequest,
  probe: GenerationProbe,
): Promise<void> {
  const startedAt = Date.now();
  try {
    probe.response = await new AiEngine(config).generateCode(request);
  } catch (error) {
    if (!(error instanceof TextExtractionError) || error.kind !== 'reasoning-only') {
      throw error;
    }
    probe.thinkingAutoDisabled = true;
    probe.response = await new AiEngine({ ...config, disableThinking: true }).generateCode(request);
  } finally {
    probe.latencyMs = Date.now() - startedAt;
  }
}

describe.skipIf(!isRuntimeReady(runtime))('ADR-010 real-model E2E — ordered generation then execution', () => {
  const generation: GenerationOutcome = {
    status: 'not-run',
    reason: 'Group A has not produced an artifact yet',
    code: null,
    latencyMs: null,
    thinkingAutoDisabled: false,
  };

  describe('Group A — generation through validation (AI-NF02; latency recorded vs AI-NF01)', () => {
    it('generates Python code that passes the engine validation surface', async () => {
      if (!isRuntimeReady(runtime)) {
        throw new Error('unreachable: this suite is skipped when no model is reachable');
      }

      const config: AIConfig = {
        providerId: runtime.provider,
        apiKey: runtime.apiKey ?? '',
        model: runtime.model,
        baseUrl: runtime.apiBaseUrl,
        temperature: 0,
      };
      const validator = new AiEngine(config);
      const probe: GenerationProbe = { thinkingAutoDisabled: false };
      let recorded = false;

      try {
        await generateWithThinkingFallback(config, { operationLog: FIXED_OPERATION_LOG }, probe);
        const response = probe.response;
        if (!response) {
          throw new Error('unreachable: generation failed without throwing');
        }

        const validation = validator.validateCode(response.code);
        const safety = validator.validateSafety(response.code);
        const determinism = validateDeterministic(response.code);

        const latencyMs = probe.latencyMs ?? 0;
        const meetsLatencyBudget = latencyMs < AI_NF01_LATENCY_BUDGET_MS;
        console.info(
          `[e2e:real-model] generation latency ${latencyMs} ms vs AI-NF01 budget ${AI_NF01_LATENCY_BUDGET_MS} ms (meets budget: ${meetsLatencyBudget})`,
        );

        await writeArtifactRecord({
          suite: 'generation',
          timestamp: new Date().toISOString(),
          provider: runtime.provider,
          baseUrl: runtime.baseUrl,
          model: runtime.model,
          finalState: 'executed',
          latencyMs,
          latencyBudgetMs: AI_NF01_LATENCY_BUDGET_MS,
          meetsLatencyBudget,
          tokensUsed: response.metadata.tokensUsed,
          syntaxValid: validation.valid,
          validationErrors: validation.errors,
          dangerousPatternViolations: safety.filter((check) => !check.safe).map((check) => check.pattern),
          deterministic: determinism.deterministic,
          determinismIssues: determinism.issues,
          thinkingAutoDisabled: probe.thinkingAutoDisabled,
        });
        recorded = true;

        // AI-NF02 through the engine's existing validation surface: the
        // generated artifact is non-empty, syntactically valid and free of
        // dangerous-pattern violations.
        expect(response.code.trim().length).toBeGreaterThan(0);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toEqual([]);
        expect(safety.every((check) => check.safe)).toBe(true);

        // Only a fully validated artifact is published to Group B; unsafe
        // or invalid code must never reach the executor.
        generation.status = 'validated';
        generation.reason = 'generated code passed the engine validation surface';
        generation.code = response.code;
        generation.latencyMs = latencyMs;
        generation.thinkingAutoDisabled = probe.thinkingAutoDisabled;
      } catch (error) {
        generation.status = 'failed';
        generation.reason = `Group A produced no validated artifact: ${error instanceof Error ? error.message : String(error)}`;
        if (!recorded) {
          await writeArtifactRecord({
            suite: 'generation',
            timestamp: new Date().toISOString(),
            provider: runtime.provider,
            baseUrl: runtime.baseUrl,
            model: runtime.model,
            finalState: 'executed',
            latencyMs: probe.latencyMs,
            thinkingAutoDisabled: probe.thinkingAutoDisabled,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }
    });
  });

  describe('Group B — execution of the generated artifact (ADR-010)', () => {
    it('executes the Group A artifact through @aegis/executor with exit code 0', async (ctx) => {
      if (!isRuntimeReady(runtime)) {
        throw new Error('unreachable: this suite is skipped when no model is reachable');
      }

      const code = generation.code;
      if (generation.status !== 'validated' || code === null) {
        const reason = `${generation.reason}. Group B executes only the artifact Group A produced in this same run; there is no bundled fallback sample (ADR-010).`;
        await writeArtifactRecord({
          suite: 'execution',
          timestamp: new Date().toISOString(),
          provider: runtime.provider,
          baseUrl: runtime.baseUrl,
          model: runtime.model,
          finalState: 'skipped',
          skipReason: reason,
        });
        console.info(`[e2e:real-model] Group B skipped: ${reason}`);
        ctx.skip(reason);
        return;
      }

      const stubModules = resolveStubModules();
      const stubMode: E2eStubMode = stubModules.length > 0 ? 'stubbed' : 'real';
      const artifactScript = `${Date.now()}-artifact.py`;
      const scriptPath = join(ARTIFACTS_DIR, artifactScript);
      const artifactSha256 = createHash('sha256').update(code).digest('hex');

      let record: E2eArtifactRecord = {
        suite: 'execution',
        timestamp: new Date().toISOString(),
        provider: runtime.provider,
        baseUrl: runtime.baseUrl,
        model: runtime.model,
        finalState: 'executed',
        artifactScript,
        artifactSha256,
        usedStubs: stubModules,
        stubMode,
      };
      let recordPath: string | null = null;

      try {
        await mkdir(ARTIFACTS_DIR, { recursive: true });
        await writeFile(scriptPath, code, 'utf8');
        // The sha256 is recorded in the artifact BEFORE execution, then
        // re-verified immediately before the run: the executed bytes are
        // provably the validated bytes Group A produced.
        recordPath = await writeArtifactRecord(record);

        const onDisk = await readFile(scriptPath, 'utf8');
        if (createHash('sha256').update(onDisk).digest('hex') !== artifactSha256) {
          throw new Error(`artifact ${artifactScript} changed on disk after its sha256 was recorded`);
        }

        const executor = new ExecutionEngine();
        const result = await executor.execute({
          scriptPath,
          timeout: runtime.timeoutMs,
          // PYTHONPATH is injected through ExecutionConfig.env only —
          // process.env is never mutated. An empty stub list leaves the
          // child environment untouched (stubMode 'real').
          env: stubMode === 'stubbed' ? { PYTHONPATH: STUBS_DIR } : {},
        });

        record = {
          ...record,
          exitCode: result.exitCode,
          executionDurationMs: result.duration,
          executionTimedOut: result.timedOut,
        };
        await rewriteArtifactRecord(recordPath, record);

        // A stubbed run proves the generated control flow executes end to
        // end; it does NOT prove a real browser was driven (see
        // e2e/fixtures/stubs/README.md).
        expect(result.exitCode).toBe(0);
        expect(result.timedOut).toBe(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (recordPath) {
          await rewriteArtifactRecord(recordPath, { ...record, error: message });
        } else {
          await writeArtifactRecord({ ...record, error: message });
        }
        throw error;
      }
    });
  });
});
