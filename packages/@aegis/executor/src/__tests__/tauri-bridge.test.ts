import { describe, it, expect, afterEach } from 'vitest';
import { isTauriAvailable } from '../tauri-bridge';

describe('isTauriAvailable', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('is false when window.__TAURI__ is undefined', () => {
    (globalThis as any).window = {};
    expect(isTauriAvailable()).toBe(false);
  });

  it('is false when window is undefined', () => {
    delete (globalThis as any).window;
    expect(isTauriAvailable()).toBe(false);
  });

  it('is true when window.__TAURI__ is present', () => {
    (globalThis as any).window = { __TAURI__: { invoke: async () => null } };
    expect(isTauriAvailable()).toBe(true);
  });
});
