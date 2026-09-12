import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useSetup } from '../useSetup';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

describe('useSetup', () => {
  it('loads dependencies and completes setup', async () => {
    const { result } = renderHook(() => useSetup(), {
      wrapper: makeWrapper(createMockAdapter()),
    });
    await waitFor(() => expect(result.current.state.dependencies).toHaveLength(3));
    expect(result.current.state.completed).toBe(false);

    await act(async () => {
      await result.current.actions.complete();
    });

    expect(result.current.state.completed).toBe(true);
  });

  it('optimistically installs a dependency', async () => {
    const { result } = renderHook(() => useSetup(), {
      wrapper: makeWrapper(createMockAdapter()),
    });
    await waitFor(() => expect(result.current.state.dependencies).toHaveLength(3));

    act(() => {
      result.current.actions.installDependency('Rust');
    });

    const rust = result.current.state.dependencies.find((dep) => dep.name === 'Rust');
    expect(rust?.status).toBe('ok');
  });
});
