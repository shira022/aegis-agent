import type { ApprovalRequest } from '@aegis/approval';
import type { DesktopApi } from '../ipc/types';
import { createStore, toErrorMessage, type Store } from './createStore';

export interface ApprovalsState {
  requests: ApprovalRequest[];
  pending: ApprovalRequest[];
  loading: boolean;
  error: string | null;
}

export interface ApprovalsActions {
  load(): Promise<void>;
  decide(
    requestId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<ApprovalRequest | null>;
}

export interface ApprovalsStore {
  state: Store<ApprovalsState>;
  actions: ApprovalsActions;
}

function computePending(requests: ApprovalRequest[]): ApprovalRequest[] {
  return requests.filter(
    (request) => request.state === 'pending' || request.state === 'reviewing',
  );
}

export function createApprovalsStore(api: DesktopApi): ApprovalsStore {
  const state = createStore<ApprovalsState>({
    requests: [],
    pending: [],
    loading: false,
    error: null,
  });

  const load = async (): Promise<void> => {
    state.setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const requests = await api.listApprovals();
      state.setState({
        requests,
        pending: computePending(requests),
        loading: false,
        error: null,
      });
    } catch (error) {
      state.setState((prev) => ({ ...prev, loading: false, error: toErrorMessage(error) }));
    }
  };

  const decide = async (
    requestId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<ApprovalRequest | null> => {
    try {
      const updated = await api.decideApproval({ requestId, decision, reason });
      state.setState((prev) => {
        const requests = prev.requests.map((request) =>
          request.id === requestId ? updated : request,
        );
        return { ...prev, requests, pending: computePending(requests), error: null };
      });
      return updated;
    } catch (error) {
      state.setState((prev) => ({ ...prev, error: toErrorMessage(error) }));
      return null;
    }
  };

  return { state, actions: { load, decide } };
}
