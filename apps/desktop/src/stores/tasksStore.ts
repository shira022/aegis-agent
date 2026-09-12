import type { Task } from '@aegis/shared';
import type { DesktopApi, NewTaskInput } from '../ipc/types';
import { createStore, toErrorMessage, type Store } from './createStore';

export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

export interface TasksActions {
  load(): Promise<void>;
  create(input: NewTaskInput): Promise<Task | null>;
  remove(id: string): Promise<void>;
  run(id: string): Promise<void>;
}

export interface TasksStore {
  state: Store<TasksState>;
  actions: TasksActions;
}

export function createTasksStore(api: DesktopApi): TasksStore {
  const state = createStore<TasksState>({ tasks: [], loading: false, error: null });

  const load = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const tasks = await api.listTasks();
      state.setState({ tasks, loading: false, error: null });
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  const create = async (input: NewTaskInput): Promise<Task | null> => {
    try {
      const task = await api.createTask(input);
      state.setState((prev) => ({ ...prev, tasks: [...prev.tasks, task], error: null }));
      return task;
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
      return null;
    }
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await api.deleteTask(id);
      state.setState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((task) => task.id !== id),
        error: null,
      }));
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
    }
  };

  const run = async (id: string): Promise<void> => {
    try {
      await api.runTask(id);
      state.setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === id ? { ...task, status: 'running', updatedAt: new Date().toISOString() } : task,
        ),
        error: null,
      }));
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
    }
  };

  return { state, actions: { load, create, remove, run } };
}
