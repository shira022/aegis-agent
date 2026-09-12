import type { ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
import { DesktopProvider } from '../../stores/DesktopContext';
import { useTasks } from '../useTasks';

function makeWrapper(api: DesktopApi) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DesktopProvider api={api}>{children}</DesktopProvider>;
  };
}

describe('useTasks', () => {
  it('populates tasks after the initial load', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper: makeWrapper(createMockAdapter()) });

    await waitFor(() => expect(result.current.state.tasks).toHaveLength(3));
    expect(result.current.state.loading).toBe(false);
  });

  it('creates and deletes tasks through the store', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper: makeWrapper(createMockAdapter()) });
    await waitFor(() => expect(result.current.state.tasks).toHaveLength(3));

    await act(async () => {
      await result.current.actions.create({ name: 'Hook Task' });
    });
    expect(result.current.state.tasks).toHaveLength(4);

    const created = result.current.state.tasks.find((task) => task.name === 'Hook Task');
    expect(created).toBeDefined();

    await act(async () => {
      await result.current.actions.remove(created!.id);
    });
    expect(result.current.state.tasks).toHaveLength(3);
  });
});
