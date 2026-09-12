import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../../ipc/mock-adapter';
import { createRecorderStore } from '../recorderStore';

describe('recorderStore', () => {
  it('starts idle after load', async () => {
    const store = createRecorderStore(createMockAdapter());

    await store.actions.load();

    expect(store.state.getState().session.status).toBe('idle');
  });

  it('walks the full transition chain', async () => {
    const store = createRecorderStore(createMockAdapter());

    await store.actions.start();
    expect(store.state.getState().session.status).toBe('recording');

    await store.actions.pause();
    expect(store.state.getState().session.status).toBe('paused');

    await store.actions.resume();
    expect(store.state.getState().session.status).toBe('recording');

    await store.actions.stop();
    expect(store.state.getState().session.status).toBe('stopped');
    expect(store.state.getState().error).toBeNull();
  });

  it('surfaces an error on an invalid transition', async () => {
    const store = createRecorderStore(createMockAdapter());

    await store.actions.pause();

    expect(store.state.getState().session.status).toBe('idle');
    expect(store.state.getState().error).toContain('Cannot pause');
  });

  it('appends screenshots', async () => {
    const store = createRecorderStore(createMockAdapter());
    await store.actions.start();

    const reference = await store.actions.screenshot('checkout');

    expect(reference?.label).toBe('checkout');
    expect(store.state.getState().session.screenshots).toHaveLength(1);
  });
});
