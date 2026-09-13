import { describe, it, expect } from 'vitest';
import type { OperationLog } from '@aegis/shared';
import { createMockAdapter } from '../../ipc/mock-adapter';
import type { DesktopApi } from '../../ipc/types';
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

  it('selectLog selects a log and exposes its steps', async () => {
    const store = createRunStore(createMockAdapter());
    await store.actions.loadActivity();

    store.actions.selectLog('log-2');

    const state = store.state.getState();
    expect(state.selectedLogId).toBe('log-2');
    expect(state.steps).toHaveLength(2);
    expect(state.error).toBeNull();
  });

  it('selectLog with an unknown id sets an error and leaves the selection untouched', async () => {
    const store = createRunStore(createMockAdapter());
    await store.actions.loadActivity();
    store.actions.selectLog('log-1');
    const before = store.state.getState();

    store.actions.selectLog('missing-log');

    const after = store.state.getState();
    expect(after.error).toBe('Activity log missing-log not found');
    expect(after.selectedLogId).toBe(before.selectedLogId);
    expect(after.steps).toBe(before.steps);
  });

  it('clearSelection returns to the active run steps', async () => {
    const store = createRunStore(createMockAdapter());
    await store.actions.loadActivity();
    await store.actions.startRun('task-3');
    store.actions.selectLog('log-2');
    expect(store.state.getState().steps).toHaveLength(2);

    store.actions.clearSelection();

    const state = store.state.getState();
    expect(state.selectedLogId).toBeNull();
    expect(state.steps).toHaveLength(6);
  });

  it('clearSelection falls back to an empty list when there is no active run', async () => {
    const store = createRunStore(createMockAdapter());
    await store.actions.loadActivity();
    store.actions.selectLog('log-1');

    store.actions.clearSelection();

    const state = store.state.getState();
    expect(state.selectedLogId).toBeNull();
    expect(state.steps).toEqual([]);
  });

  it('refresh preserves an active selection', async () => {
    const store = createRunStore(createMockAdapter());
    await store.actions.loadActivity();
    store.actions.selectLog('log-2');

    await store.actions.refresh();

    const state = store.state.getState();
    expect(state.selectedLogId).toBe('log-2');
    expect(state.steps).toHaveLength(2);
  });

  it('startRun clears any selected log', async () => {
    const store = createRunStore(createMockAdapter());
    await store.actions.loadActivity();
    store.actions.selectLog('log-1');

    await store.actions.startRun('task-3');

    expect(store.state.getState().selectedLogId).toBeNull();
  });

  it('loadActivity re-syncs steps from a refreshed selected log', async () => {
    const base = createMockAdapter();
    let activity: OperationLog[] = await base.listActivity();
    const api: DesktopApi = { ...base, listActivity: async () => activity };
    const store = createRunStore(api);
    await store.actions.loadActivity();
    store.actions.selectLog('log-1');
    expect(store.state.getState().steps).toHaveLength(6);

    activity = activity.map((log) =>
      log.id === 'log-1' ? { ...log, steps: log.steps.slice(0, 1) } : log,
    );
    await store.actions.loadActivity();

    const state = store.state.getState();
    expect(state.selectedLogId).toBe('log-1');
    expect(state.steps).toHaveLength(1);
  });

  it('loadActivity clears a selection whose log disappeared', async () => {
    const base = createMockAdapter();
    let activity: OperationLog[] = await base.listActivity();
    const api: DesktopApi = { ...base, listActivity: async () => activity };
    const store = createRunStore(api);
    await store.actions.loadActivity();
    store.actions.selectLog('log-1');

    activity = activity.filter((log) => log.id !== 'log-1');
    await store.actions.loadActivity();

    const state = store.state.getState();
    expect(state.selectedLogId).toBeNull();
    expect(state.steps).toEqual([]);
  });
});
