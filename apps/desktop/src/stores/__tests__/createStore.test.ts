import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../createStore';

describe('createStore', () => {
  it('returns a stable snapshot between reads', () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toBe(store.getState());
  });

  it('updates with a value and an updater', () => {
    const store = createStore({ count: 0 });
    store.setState({ count: 1 });
    expect(store.getState().count).toBe(1);
    store.setState((prev) => ({ count: prev.count + 1 }));
    expect(store.getState().count).toBe(2);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when the state reference is unchanged', () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    const same = store.getState();
    store.setState(same);
    expect(listener).not.toHaveBeenCalled();
  });
});
