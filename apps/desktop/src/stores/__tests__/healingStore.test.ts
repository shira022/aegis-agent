import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../../ipc/mock-adapter';
import { createHealingStore } from '../healingStore';

describe('healingStore', () => {
  it('loads events and counts unread', async () => {
    const store = createHealingStore(createMockAdapter());

    await store.actions.load();

    expect(store.state.getState().events.length).toBeGreaterThan(0);
    expect(store.state.getState().unread).toBeGreaterThan(0);
  });

  it('dismisses a single event', async () => {
    const store = createHealingStore(createMockAdapter());
    await store.actions.load();
    const unresolved = store.state.getState().events.find((event) => !event.resolved);
    expect(unresolved).toBeDefined();
    const before = store.state.getState().unread;

    store.actions.dismiss(unresolved!.id);

    expect(store.state.getState().unread).toBe(before - 1);
    const updated = store.state.getState().events.find((event) => event.id === unresolved!.id);
    expect(updated?.resolved).toBe(true);
  });

  it('dismisses all events', async () => {
    const store = createHealingStore(createMockAdapter());
    await store.actions.load();

    store.actions.dismissAll();

    expect(store.state.getState().unread).toBe(0);
    expect(store.state.getState().events.every((event) => event.resolved)).toBe(true);
  });
});
