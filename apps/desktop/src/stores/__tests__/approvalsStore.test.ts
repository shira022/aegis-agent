import { describe, it, expect } from 'vitest';
import type { ApprovalRequest } from '@aegis/approval';
import { createMockAdapter } from '../../ipc/mock-adapter';
import { createApprovalsStore } from '../approvalsStore';

describe('approvalsStore', () => {
  it('loads requests and computes pending', async () => {
    const store = createApprovalsStore(createMockAdapter());
    expect(store.state.getState().pending).toHaveLength(0);

    await store.actions.load();

    expect(store.state.getState().requests).toHaveLength(1);
    expect(store.state.getState().pending).toHaveLength(1);
  });

  it('decides a pending request', async () => {
    const store = createApprovalsStore(createMockAdapter());
    await store.actions.load();
    const request = store.state.getState().pending[0];

    const decided = await store.actions.decide(request.id, 'approved', 'safe');

    expect(decided?.state).toBe('approved');
    expect(store.state.getState().pending).toHaveLength(0);
    expect(store.state.getState().error).toBeNull();
  });

  it('surfaces an error on a second decision without claiming success', async () => {
    const store = createApprovalsStore(createMockAdapter());
    await store.actions.load();
    const request = store.state.getState().pending[0];
    await store.actions.decide(request.id, 'approved');

    const second: ApprovalRequest | null = await store.actions.decide(request.id, 'rejected');

    expect(second).toBeNull();
    expect(store.state.getState().error).toBeTruthy();
    expect(store.state.getState().requests[0].state).toBe('approved');
  });
});
