import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useAiGeneration } from '../useAiGeneration';
import { useApprovals } from '../useApprovals';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

function renderStores(api: DesktopApi) {
  return renderHook(
    () => ({ generation: useAiGeneration(), approvals: useApprovals() }),
    { wrapper: makeWrapper(api) },
  );
}

describe('useAiGeneration', () => {
  it('exposes the idle state with the local provider as the default', async () => {
    const { result } = renderStores(createMockAdapter());

    await waitFor(() => expect(result.current.approvals.state.pending).toHaveLength(1));
    expect(result.current.generation.state.status).toBe('idle');
    expect(result.current.generation.state.error).toBeNull();
    expect(result.current.generation.state.lastResult).toBeNull();
    expect(result.current.generation.state.provider).toBe('ollama');
    expect(result.current.generation.state.model).toBe('');
  });

  it('updates the provider and model selections', async () => {
    const { result } = renderStores(createMockAdapter());
    await waitFor(() => expect(result.current.approvals.state.pending).toHaveLength(1));

    act(() => {
      result.current.generation.actions.setProvider('openai');
    });
    expect(result.current.generation.state.provider).toBe('openai');
    expect(result.current.generation.state.model).toBe('');

    act(() => {
      result.current.generation.actions.setModel('gpt-4o-mini');
    });
    expect(result.current.generation.state.model).toBe('gpt-4o-mini');
  });

  it('generates a script and promotes it to the pending approval', async () => {
    const { result } = renderStores(createMockAdapter());
    await waitFor(() => expect(result.current.approvals.state.pending).toHaveLength(1));

    let ok = false;
    await act(async () => {
      ok = await result.current.generation.actions.generate({
        description: 'Download the invoice',
        taskId: 'task-1',
      });
    });

    expect(ok).toBe(true);
    expect(result.current.generation.state.status).toBe('idle');
    expect(result.current.generation.state.lastResult?.language).toBe('python');
    expect(result.current.generation.state.lastResult?.script).toContain(
      'from selenium import webdriver',
    );

    // The approvals store the panel reads from was refreshed.
    const approvals = result.current.approvals.state;
    expect(approvals.requests).toHaveLength(2);
    expect(approvals.pending[0].taskId).toBe('task-1');
    expect(approvals.pending[0].code).toContain('from selenium import webdriver');
  });

  it('surfaces a failed generation as an error state', async () => {
    const base = createMockAdapter();
    const api: DesktopApi = {
      ...base,
      generateScript: () => Promise.reject(new Error('provider offline')),
    };
    const { result } = renderStores(api);
    await waitFor(() => expect(result.current.approvals.state.pending).toHaveLength(1));

    let ok = true;
    await act(async () => {
      ok = await result.current.generation.actions.generate({ description: 'Download' });
    });

    expect(ok).toBe(false);
    expect(result.current.generation.state.status).toBe('error');
    expect(result.current.generation.state.error).toBe('provider offline');
    expect(result.current.approvals.state.requests).toHaveLength(1);
  });
});
