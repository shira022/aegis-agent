import { describe, it, expect, vi } from 'vitest';
import {
  analyzeCode,
  calculateRiskLevel,
  generateHumanReadableReport,
} from '@aegis/approval/src/safety-analyzer';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { AiGenerationResult, DesktopApi } from '../../ipc/types';
import { createApprovalsStore } from '../approvalsStore';
import { createGenerationStore } from '../generationStore';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeResult(overrides: Partial<AiGenerationResult> = {}): AiGenerationResult {
  return {
    script: 'print("ok")',
    language: 'python',
    mocked: true,
    model: 'mock-model',
    promptHash: '0000000000000000',
    ...overrides,
  };
}

/** Adapter whose generateScript never settles until the test decides. */
function createDeferredApi(overrides: Partial<DesktopApi> = {}): {
  api: DesktopApi;
  calls: Deferred<AiGenerationResult>[];
} {
  const base = createMockAdapter();
  const calls: Deferred<AiGenerationResult>[] = [];
  const api: DesktopApi = {
    ...base,
    ...overrides,
    generateScript: () => {
      const deferred = createDeferred<AiGenerationResult>();
      calls.push(deferred);
      return deferred.promise;
    },
  };
  return { api, calls };
}

describe('generationStore', () => {
  it('generates, creates an approval with the analysed checks and refreshes the queue', async () => {
    const base = createMockAdapter();
    const generateScript = vi.fn(base.generateScript.bind(base));
    const createApproval = vi.fn(base.createApproval.bind(base));
    const api: DesktopApi = { ...base, generateScript, createApproval };
    const approvals = createApprovalsStore(api);
    const store = createGenerationStore(api, approvals);
    await approvals.actions.load();

    const ok = await store.actions.generate({
      description: 'Download the invoice report',
      taskId: 'task-1',
    });

    expect(ok).toBe(true);
    expect(generateScript).toHaveBeenCalledWith({
      prompt: 'Download the invoice report',
      provider: 'ollama',
      model: undefined,
      context: undefined,
    });
    expect(createApproval).toHaveBeenCalledTimes(1);

    // The mock adapter stores the createApproval input verbatim, so the queued
    // request proves the analysed checks were submitted with the code.
    const created = approvals.state.getState().pending[0];
    const safetyChecks = analyzeCode(created.code);
    expect(created.taskId).toBe('task-1');
    expect(created.state).toBe('pending');
    expect(created.safetyChecks).toEqual(safetyChecks);
    expect(created.riskLevel).toBe(calculateRiskLevel(safetyChecks));
    expect(created.explanation).toBe(generateHumanReadableReport(safetyChecks));
    expect(created.exceptionHandlers).toEqual([]);
    expect(createApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        code: created.code,
        explanation: generateHumanReadableReport(safetyChecks),
        exceptionHandlers: [],
        safetyChecks,
        riskLevel: calculateRiskLevel(safetyChecks),
      }),
    );

    const generationState = store.state.getState();
    expect(generationState.status).toBe('idle');
    expect(generationState.error).toBeNull();
    expect(generationState.lastResult?.script).toBe(created.code);
    expect(generationState.lastResult?.model).toBe('mock-model');

    // The approvals store was refreshed and the new request is reviewed first.
    const approvalsState = approvals.state.getState();
    expect(approvalsState.requests).toHaveLength(2);
    expect(approvalsState.pending).toHaveLength(2);
    expect(approvalsState.pending[0].id).toBe(created.id);
  });

  it('surfaces the error message and skips the approval when generation fails', async () => {
    const base = createMockAdapter();
    const createApproval = vi.fn(base.createApproval.bind(base));
    const api: DesktopApi = {
      ...base,
      createApproval,
      generateScript: vi.fn().mockRejectedValue(new Error('provider offline')),
    };
    const approvals = createApprovalsStore(api);
    const store = createGenerationStore(api, approvals);
    await approvals.actions.load();

    const ok = await store.actions.generate({ description: 'Download the invoice' });

    expect(ok).toBe(false);
    const state = store.state.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('provider offline');
    expect(state.lastResult).toBeNull();
    expect(createApproval).not.toHaveBeenCalled();
    expect(approvals.state.getState().requests).toHaveLength(1);
  });

  it('ignores a late success from an earlier run', async () => {
    const { api, calls } = createDeferredApi();
    const approvals = createApprovalsStore(api);
    const store = createGenerationStore(api, approvals);

    const first = store.actions.generate({ description: 'first request' });
    const second = store.actions.generate({ description: 'second request' });

    calls[1]!.resolve(makeResult({ script: 'print("second")' }));
    await expect(second).resolves.toBe(true);

    calls[0]!.resolve(makeResult({ script: 'print("first")' }));
    await expect(first).resolves.toBe(false);

    const state = store.state.getState();
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.lastResult?.script).toBe('print("second")');

    // The stale response must not have inserted an approval either.
    const requests = approvals.state.getState().requests;
    expect(requests.some((request) => request.code === 'print("first")')).toBe(false);
    expect(requests.some((request) => request.code === 'print("second")')).toBe(true);
  });

  it('ignores a late failure from an earlier run', async () => {
    const { api, calls } = createDeferredApi();
    const approvals = createApprovalsStore(api);
    const store = createGenerationStore(api, approvals);

    const first = store.actions.generate({ description: 'first request' });
    const second = store.actions.generate({ description: 'second request' });

    calls[1]!.resolve(makeResult({ script: 'print("second")' }));
    await expect(second).resolves.toBe(true);

    calls[0]!.reject(new Error('too late'));
    await expect(first).resolves.toBe(false);

    const state = store.state.getState();
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.lastResult?.script).toBe('print("second")');
  });

  it('reset clears the result but keeps the provider and model selection', async () => {
    const api = createMockAdapter();
    const store = createGenerationStore(api, createApprovalsStore(api));
    store.actions.setProvider('openai');
    store.actions.setModel('gpt-4o');
    await store.actions.generate({ description: 'Download the invoice' });

    store.actions.reset();

    const state = store.state.getState();
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.lastResult).toBeNull();
    expect(state.elapsedMs).toBe(0);
    expect(state.provider).toBe('openai');
    expect(state.model).toBe('gpt-4o');
  });

  it('reset during a run discards the late response', async () => {
    const { api, calls } = createDeferredApi();
    const store = createGenerationStore(api, createApprovalsStore(api));

    const first = store.actions.generate({ description: 'first request' });
    store.actions.reset();
    expect(store.state.getState().status).toBe('idle');

    calls[0]!.resolve(makeResult());
    await expect(first).resolves.toBe(false);
    expect(store.state.getState().lastResult).toBeNull();
  });

  it('passes the selected provider and model to generateScript', async () => {
    const base = createMockAdapter();
    const generateScript = vi.fn(base.generateScript.bind(base));
    const api: DesktopApi = { ...base, generateScript };
    const store = createGenerationStore(api, createApprovalsStore(api));

    await store.actions.generate({ description: 'default provider' });
    expect(generateScript).toHaveBeenNthCalledWith(1, {
      prompt: 'default provider',
      provider: 'ollama',
      model: undefined,
      context: undefined,
    });

    store.actions.setProvider('openai-compatible');
    store.actions.setModel('custom-x');
    await store.actions.generate({
      description: 'custom provider',
      taskId: 'task-2',
      context: 'extra notes',
    });
    expect(generateScript).toHaveBeenNthCalledWith(2, {
      prompt: 'custom provider',
      provider: 'openai-compatible',
      model: 'custom-x',
      context: 'extra notes',
    });
  });

  it('clears the model selection when the provider changes', () => {
    const api = createMockAdapter();
    const store = createGenerationStore(api, createApprovalsStore(api));

    store.actions.setModel('mistral');
    expect(store.state.getState().model).toBe('mistral');

    store.actions.setProvider('openai');
    const state = store.state.getState();
    expect(state.provider).toBe('openai');
    expect(state.model).toBe('');
  });

  it('tracks elapsed time while a slow generation runs', async () => {
    vi.useFakeTimers();
    try {
      const { api, calls } = createDeferredApi();
      const store = createGenerationStore(api, createApprovalsStore(api));

      const first = store.actions.generate({ description: 'first request' });
      await vi.advanceTimersByTimeAsync(1000);
      expect(store.state.getState().status).toBe('generating');
      expect(store.state.getState().elapsedMs).toBeGreaterThanOrEqual(1000);

      // Starting a newer run makes the earlier timer stop itself.
      const second = store.actions.generate({ description: 'second request' });
      await vi.advanceTimersByTimeAsync(2000);
      expect(store.state.getState().elapsedMs).toBeGreaterThanOrEqual(2000);

      calls[1]!.resolve(makeResult({ script: 'print("second")' }));
      await expect(second).resolves.toBe(true);

      calls[0]!.resolve(makeResult({ script: 'print("first")' }));
      await expect(first).resolves.toBe(false);
      expect(store.state.getState().status).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });
});
