import type { OperationStep, OperationLog } from '@aegis/shared';
import type { DesktopApi, TaskRun } from '../ipc/types';
import { createStore, toErrorMessage, type Store } from './createStore';

export interface RunState {
  activeRun: TaskRun | null;
  steps: OperationStep[];
  activity: OperationLog[];
  loading: boolean;
  error: string | null;
}

export interface RunActions {
  loadActivity(): Promise<void>;
  startRun(taskId: string): Promise<TaskRun | null>;
  refresh(): Promise<void>;
}

export interface RunStore {
  state: Store<RunState>;
  actions: RunActions;
}

export function createRunStore(api: DesktopApi): RunStore {
  const state = createStore<RunState>({
    activeRun: null,
    steps: [],
    activity: [],
    loading: false,
    error: null,
  });

  const loadActivity = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const activity = await api.listActivity();
      state.setState((prev) => ({ ...prev, activity, loading: false, error: null }));
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  const refresh = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const activeRun = await api.getActiveRun();
      state.setState((prev) => ({
        ...prev,
        activeRun,
        steps: activeRun?.steps ?? [],
        loading: false,
        error: null,
      }));
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  const startRun = async (taskId: string): Promise<TaskRun | null> => {
    state.setState((prev) => ({ ...prev, error: null }));
    try {
      const activeRun = await api.runTask(taskId);
      state.setState((prev) => ({
        ...prev,
        activeRun,
        steps: activeRun.steps,
        error: null,
      }));
      return activeRun;
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
      return null;
    }
  };

  return { state, actions: { loadActivity, startRun, refresh } };
}
