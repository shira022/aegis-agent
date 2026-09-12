import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { HealingActions, HealingState } from '../stores/healingStore';

export interface UseHealingResult {
  state: HealingState;
  actions: HealingActions;
}

export function useHealing(): UseHealingResult {
  const { stores } = useDesktop();
  const state = useStore(stores.healing.state);
  return { state, actions: stores.healing.actions };
}
