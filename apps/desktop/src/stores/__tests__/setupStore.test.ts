import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../../ipc/mock-adapter';
import { createSetupStore } from '../setupStore';

describe('setupStore', () => {
  it('loads dependencies and completion state', async () => {
    const store = createSetupStore(createMockAdapter());

    await store.actions.load();

    expect(store.state.getState().dependencies).toHaveLength(3);
    expect(store.state.getState().completed).toBe(false);
  });

  it('optimistically installs a dependency', async () => {
    const store = createSetupStore(createMockAdapter());
    await store.actions.load();

    store.actions.installDependency('Rust');

    const rust = store.state.getState().dependencies.find((dep) => dep.name === 'Rust');
    expect(rust?.status).toBe('ok');
  });

  it('saves a provider key', async () => {
    const store = createSetupStore(createMockAdapter());

    await store.actions.saveProviderKey({ providerId: 'openai', apiKey: 'sk-test' });

    expect(store.state.getState().error).toBeNull();
  });

  it('completes setup', async () => {
    const store = createSetupStore(createMockAdapter());
    await store.actions.load();

    await store.actions.complete();

    expect(store.state.getState().completed).toBe(true);
    expect(store.state.getState().dependencies.every((dep) => dep.status === 'ok')).toBe(true);
  });
});
