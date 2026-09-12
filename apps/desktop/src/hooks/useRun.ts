import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { RunActions, RunState } from '../stores/runStore';

export interface UseRunResult {
  state: RunState;
  actions: RunActions;
}

export function useRun(): UseRunResult {
  const { stores } = useDesktop();
  const state = useStore(stores.run.state);
  return { state, actions: stores.run.actions };
}
