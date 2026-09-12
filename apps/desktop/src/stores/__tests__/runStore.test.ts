import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../../ipc/mock-adapter';
import { createRunStore } from '../runStore';

describe('runStore', () => {
  it('loads activity', async () => {
    const store = createRunStore(createMockAdapter());

    await store.actions.loadActivity();

    expect(store.state.getState().activity).toHaveLength(2);
  });

  it('starts a run and exposes its steps', async () => {
    const store = createRunStore(createMockAdapter());

    const run = await store.actions.startRun('task-3');

    expect(run?.taskId).toBe('task-3');
    expect(store.state.getState().activeRun?.id).toBe(run?.id);
    expect(store.state.getState().steps.length).toBeGreaterThan(0);
  });

  it('refreshes the active run', async () => {
    const api = createMockAdapter();
    const store = createRunStore(api);
    await store.actions.startRun('task-3');

    await store.actions.refresh();

    expect(store.state.getState().activeRun?.taskId).toBe('task-3');
  });
});
