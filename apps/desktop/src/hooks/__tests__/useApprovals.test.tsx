import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useApprovals } from '../useApprovals';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

describe('useApprovals', () => {
  it('loads pending approvals', async () => {
    const { result } = renderHook(() => useApprovals(), {
      wrapper: makeWrapper(createMockAdapter()),
    });

    await waitFor(() => expect(result.current.state.pending).toHaveLength(1));
  });

  it('decides a request and surfaces an error on a repeated decision', async () => {
    const { result } = renderHook(() => useApprovals(), {
      wrapper: makeWrapper(createMockAdapter()),
    });
    await waitFor(() => expect(result.current.state.pending).toHaveLength(1));
    const id = result.current.state.pending[0].id;

    await act(async () => {
      await result.current.actions.decide(id, 'approved');
    });
    expect(result.current.state.pending).toHaveLength(0);
    expect(result.current.state.error).toBeNull();

    await act(async () => {
      await result.current.actions.decide(id, 'rejected');
    });
    expect(result.current.state.error).toBeTruthy();
  });
});
