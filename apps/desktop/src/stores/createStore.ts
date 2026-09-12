export interface Store<T> {
  getState(): T;
  setState(updater: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState(): T {
      return state;
    },

    setState(updater: T | ((prev: T) => T)): void {
      const next =
        typeof updater === 'function' ? (updater as (prev: T) => T)(state) : updater;
      if (Object.is(next, state)) {
        return;
      }
      state = next;
      listeners.forEach((listener) => listener());
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
