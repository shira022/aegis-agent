import { useDesktop } from '../stores/DesktopContext';
import { useStore } from './useStore';
import type { ApprovalsActions, ApprovalsState } from '../stores/approvalsStore';

export interface UseApprovalsResult {
  state: ApprovalsState;
  actions: ApprovalsActions;
}

export function useApprovals(): UseApprovalsResult {
  const { stores } = useDesktop();
  const state = useStore(stores.approvals.state);
  return { state, actions: stores.approvals.actions };
}
