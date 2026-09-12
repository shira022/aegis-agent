import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useHealing } from '../useHealing';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

describe('useHealing', () => {
  it('loads events and dismisses them', async () => {
    const { result } = renderHook(() => useHealing(), {
      wrapper: makeWrapper(createMockAdapter()),
    });
    await waitFor(() => expect(result.current.state.events.length).toBeGreaterThan(0));
    expect(result.current.state.unread).toBeGreaterThan(0);

    act(() => {
      result.current.actions.dismissAll();
    });

    expect(result.current.state.unread).toBe(0);
  });
});
