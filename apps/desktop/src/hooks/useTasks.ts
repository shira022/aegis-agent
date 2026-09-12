import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { TasksActions, TasksState } from '../stores/tasksStore';

export interface UseTasksResult {
  state: TasksState;
  actions: TasksActions;
}

export function useTasks(): UseTasksResult {
  const { stores } = useDesktop();
  const state = useStore(stores.tasks.state);
  return { state, actions: stores.tasks.actions };
}
