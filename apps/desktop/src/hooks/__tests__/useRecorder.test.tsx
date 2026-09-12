import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useRecorder } from '../useRecorder';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

describe('useRecorder', () => {
  it('walks the recorder transition chain', async () => {
    const { result } = renderHook(() => useRecorder(), {
      wrapper: makeWrapper(createMockAdapter()),
    });
    await waitFor(() => expect(result.current.state.session.status).toBe('idle'));

    await act(async () => {
      await result.current.actions.start();
    });
    expect(result.current.state.session.status).toBe('recording');

    await act(async () => {
      await result.current.actions.pause();
    });
    expect(result.current.state.session.status).toBe('paused');

    await act(async () => {
      await result.current.actions.resume();
    });
    expect(result.current.state.session.status).toBe('recording');

    await act(async () => {
      await result.current.actions.stop();
    });
    expect(result.current.state.session.status).toBe('stopped');
  });

  it('captures a screenshot', async () => {
    const { result } = renderHook(() => useRecorder(), {
      wrapper: makeWrapper(createMockAdapter()),
    });
    await waitFor(() => expect(result.current.state.session.status).toBe('idle'));

    await act(async () => {
      await result.current.actions.start();
      await result.current.actions.screenshot('login');
    });

    expect(result.current.state.session.screenshots).toHaveLength(1);
    expect(result.current.state.session.screenshots[0].label).toBe('login');
  });
});
