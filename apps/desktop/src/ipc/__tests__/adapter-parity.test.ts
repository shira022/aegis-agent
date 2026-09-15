import { describe, it, expect, vi } from 'vitest';
import type { DesktopApi } from '../types';
import { createMockAdapter } from '../mock-adapter';
import { createTauriAdapter, type InvokeFn } from '../tauri-adapter';

const AI_APPROVAL_METHODS = [
  'generateScript',
  'getAiProviderStatus',
  'createApproval',
] as const;

function adapters(): DesktopApi[] {
  return [
    createMockAdapter(),
    createTauriAdapter(vi.fn() as unknown as InvokeFn),
  ];
}

describe('adapter parity', () => {
  it('exposes the same DesktopApi surface on both adapters', () => {
    const [mock, tauri] = adapters();
    expect(Object.keys(mock).sort()).toEqual(Object.keys(tauri).sort());
  });

  it('exposes the AI generation and approval-creation methods', () => {
    for (const api of adapters()) {
      for (const method of AI_APPROVAL_METHODS) {
        expect(typeof api[method]).toBe('function');
      }
    }
  });
});
