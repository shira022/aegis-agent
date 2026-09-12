import type { DesktopApi } from './types';
import { createMockAdapter } from './mock-adapter';
import { createTauriAdapter } from './tauri-adapter';

export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
  );
}

export function createAdapter(): DesktopApi {
  return isTauri() ? createTauriAdapter() : createMockAdapter();
}

let adapter: DesktopApi | null = null;

export function getAdapter(): DesktopApi {
  if (adapter === null) {
    adapter = createAdapter();
  }
  return adapter;
}

export function setAdapter(next: DesktopApi | null): void {
  adapter = next;
}

export * from './types';
