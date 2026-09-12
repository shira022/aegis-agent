import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useRun } from '../useRun';
import { useDesktopApi } from '../useDesktopApi';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

describe('useRun', () => {
  it('loads activity and starts a run', async () => {
    const { result } = renderHook(() => useRun(), {
      wrapper: makeWrapper(createMockAdapter()),
    });

    await waitFor(() => expect(result.current.state.activity).toHaveLength(2));

    await act(async () => {
      await result.current.actions.startRun('task-3');
    });

    expect(result.current.state.activeRun?.taskId).toBe('task-3');
    expect(result.current.state.steps.length).toBeGreaterThan(0);
  });
});

describe('useDesktopApi', () => {
  it('exposes the injected adapter', () => {
    const api = createMockAdapter();
    const { result } = renderHook(() => useDesktopApi(), { wrapper: makeWrapper(api) });
    expect(result.current).toBe(api);
  });
});
