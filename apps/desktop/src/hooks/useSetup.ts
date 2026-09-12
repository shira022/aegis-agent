import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { SetupActions, SetupStoreState } from '../stores/setupStore';

export interface UseSetupResult {
  state: SetupStoreState;
  actions: SetupActions;
}

export function useSetup(): UseSetupResult {
  const { stores } = useDesktop();
  const state = useStore(stores.setup.state);
  return { state, actions: stores.setup.actions };
}
