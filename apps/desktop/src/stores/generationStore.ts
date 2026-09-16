// Imported from the analyzer module, not the package root: the root entry
// also re-exports approval-manager, which depends on node:crypto and cannot
// be bundled for the browser. The analyzer itself is pure.
import {
  analyzeCode,
  calculateRiskLevel,
  generateHumanReadableReport,
} from '@aegis/approval/src/safety-analyzer';
import type { ProviderId } from '@aegis/shared';
import type { AiGenerationResult, DesktopApi } from '../ipc/types';
import type { ApprovalsStore } from './approvalsStore';
import { createStore, toErrorMessage, type Store } from './createStore';

export type GenerationStatus = 'idle' | 'generating' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  error: string | null;
  lastResult: AiGenerationResult | null;
  elapsedMs: number;
  provider: ProviderId;
  model: string;
}

export interface GenerationInput {
  description: string;
  taskId?: string;
  context?: string;
}

export interface GenerationActions {
  generate(input: GenerationInput): Promise<boolean>;
  reset(): void;
  setProvider(provider: ProviderId): void;
  setModel(model: string): void;
}

export interface GenerationStore {
  state: Store<GenerationState>;
  actions: GenerationActions;
}

/** Local-first default: a local model needs no API key (ADR-012). */
const DEFAULT_PROVIDER: ProviderId = 'ollama';

/** Local models can take minutes; the elapsed counter keeps the UI honest. */
const ELAPSED_TICK_MS = 1000;

export function createGenerationStore(
  api: DesktopApi,
  approvals: ApprovalsStore,
): GenerationStore {
  const state = createStore<GenerationState>({
    status: 'idle',
    error: null,
    lastResult: null,
    elapsedMs: 0,
    provider: DEFAULT_PROVIDER,
    model: '',
  });

  /**
   * Bumped on every generate/reset call. A late response from an earlier run
   * carries a stale token and must not overwrite the state of a newer run.
   */
  let runToken = 0;

  const generate = async (input: GenerationInput): Promise<boolean> => {
    const runId = ++runToken;
    const { provider, model } = state.getState();
    const trimmedModel = model.trim();

    state.setState((prev) => ({
      ...prev,
      status: 'generating',
      error: null,
      lastResult: null,
      elapsedMs: 0,
    }));

    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (runToken !== runId) {
        clearInterval(timer);
        return;
      }
      state.setState((prev) => ({ ...prev, elapsedMs: Date.now() - startedAt }));
    }, ELAPSED_TICK_MS);

    try {
      const result = await api.generateScript({
        prompt: input.description,
        provider,
        model: trimmedModel.length > 0 ? trimmedModel : undefined,
        context: input.context,
      });
      if (runToken !== runId) {
        return false;
      }

      // Safety metadata is computed in the renderer by the existing analyzer
      // and submitted with the code (ADR-012). No helper produces exception
      // handlers, so none are proposed.
      const safetyChecks = analyzeCode(result.script);
      const riskLevel = calculateRiskLevel(safetyChecks);
      const explanation = generateHumanReadableReport(safetyChecks);

      await api.createApproval({
        taskId: input.taskId,
        code: result.script,
        explanation,
        exceptionHandlers: [],
        safetyChecks,
        riskLevel,
      });
      if (runToken !== runId) {
        return false;
      }

      state.setState((prev) => ({
        ...prev,
        status: 'idle',
        error: null,
        lastResult: result,
        elapsedMs: Date.now() - startedAt,
      }));
      await approvals.actions.load();
      return true;
    } catch (error) {
      if (runToken !== runId) {
        return false;
      }
      state.setState((prev) => ({
        ...prev,
        status: 'error',
        error: toErrorMessage(error),
        lastResult: null,
      }));
      return false;
    } finally {
      clearInterval(timer);
    }
  };

  const reset = (): void => {
    runToken += 1;
    state.setState((prev) => ({
      ...prev,
      status: 'idle',
      error: null,
      lastResult: null,
      elapsedMs: 0,
    }));
  };

  const setProvider = (provider: ProviderId): void => {
    state.setState((prev) =>
      prev.provider === provider ? prev : { ...prev, provider, model: '' },
    );
  };

  const setModel = (model: string): void => {
    state.setState((prev) => ({ ...prev, model }));
  };

  return {
    state,
    actions: { generate, reset, setProvider, setModel },
  };
}
