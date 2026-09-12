import type { DependencyCheck } from '@aegis/shared';
import type { DesktopApi, ProviderKeyInput } from '../ipc/types';
import { createStore, toErrorMessage, type Store } from './createStore';

export interface SetupStoreState {
  dependencies: DependencyCheck[];
  completed: boolean;
  loading: boolean;
  error: string | null;
}

export interface SetupActions {
  load(): Promise<void>;
  installDependency(name: string): void;
  saveProviderKey(input: ProviderKeyInput): Promise<void>;
  complete(): Promise<void>;
}

export interface SetupStore {
  state: Store<SetupStoreState>;
  actions: SetupActions;
}

export function createSetupStore(api: DesktopApi): SetupStore {
  const state = createStore<SetupStoreState>({
    dependencies: [],
    completed: false,
    loading: false,
    error: null,
  });

  const load = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const setup = await api.getSetup();
      state.setState({
        dependencies: setup.dependencies,
        completed: setup.completed,
        loading: false,
        error: null,
      });
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  const installDependency = (name: string): void => {
    state.setState((prev) => ({
      ...prev,
      dependencies: prev.dependencies.map((dependency) =>
        dependency.name === name
          ? {
              ...dependency,
              installed: dependency.installed || dependency.required,
              version: dependency.version || dependency.required,
              status: 'ok',
            }
          : dependency,
      ),
    }));
  };

  const saveProviderKey = async (input: ProviderKeyInput): Promise<void> => {
    try {
      await api.saveProviderKey(input);
      state.setState((prev) => ({ ...prev, error: null }));
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
    }
  };

  const complete = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await api.completeSetup();
      const setup = await api.getSetup();
      state.setState({
        dependencies: setup.dependencies,
        completed: setup.completed,
        loading: false,
        error: null,
      });
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  return { state, actions: { load, installDependency, saveProviderKey, complete } };
}
