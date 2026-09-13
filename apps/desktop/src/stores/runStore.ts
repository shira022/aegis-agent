import type { OperationStep, OperationLog } from '@aegis/shared';
import type { DesktopApi, TaskRun } from '../ipc/types';
import { createStore, toErrorMessage, type Store } from './createStore';

export interface RunState {
  activeRun: TaskRun | null;
  steps: OperationStep[];
  activity: OperationLog[];
  selectedLogId: string | null;
  loading: boolean;
  error: string | null;
}

export interface RunActions {
  loadActivity(): Promise<void>;
  startRun(taskId: string): Promise<TaskRun | null>;
  refresh(): Promise<void>;
  selectLog(logId: string): void;
  clearSelection(): void;
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
    selectedLogId: null,
    loading: false,
    error: null,
  });

  const loadActivity = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const activity = await api.listActivity();
      state.setState((prev) => {
        if (prev.selectedLogId === null) {
          return { ...prev, activity, loading: false, error: null };
        }
        const selectedLog = activity.find((log) => log.id === prev.selectedLogId) ?? null;
        if (selectedLog === null) {
          return {
            ...prev,
            activity,
            selectedLogId: null,
            steps: prev.activeRun?.steps ?? [],
            loading: false,
            error: null,
          };
        }
        return { ...prev, activity, steps: selectedLog.steps, loading: false, error: null };
      });
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  const refresh = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const activeRun = await api.getActiveRun();
      state.setState((prev) => {
        const selectedLog =
          prev.selectedLogId !== null
            ? prev.activity.find((log) => log.id === prev.selectedLogId) ?? null
            : null;
        return {
          ...prev,
          activeRun,
          steps: selectedLog !== null ? selectedLog.steps : activeRun?.steps ?? [],
          loading: false,
          error: null,
        };
      });
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
        selectedLogId: null,
        steps: activeRun.steps,
        error: null,
      }));
      return activeRun;
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
      return null;
    }
  };

  const selectLog = (logId: string): void => {
    state.setState((prev) => {
      const log = prev.activity.find((entry) => entry.id === logId);
      if (log === undefined) {
        return { ...prev, error: `Activity log ${logId} not found` };
      }
      return { ...prev, selectedLogId: logId, steps: log.steps, error: null };
    });
  };

  const clearSelection = (): void => {
    state.setState((prev) => ({
      ...prev,
      selectedLogId: null,
      steps: prev.activeRun?.steps ?? [],
      error: null,
    }));
  };

  return { state, actions: { loadActivity, startRun, refresh, selectLog, clearSelection } };
}
