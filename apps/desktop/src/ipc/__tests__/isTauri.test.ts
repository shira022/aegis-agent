import { describe, it, expect, afterEach } from 'vitest';
import { isTauri, createAdapter, getAdapter, setAdapter } from '../index';
import { createMockAdapter } from '../mock-adapter';

const tauriWindow = window as unknown as Record<string, unknown>;

afterEach(() => {
  delete tauriWindow.__TAURI__;
  delete tauriWindow.__TAURI_INTERNALS__;
  setAdapter(null);
});

describe('isTauri', () => {
  it('is false when no Tauri globals are present', () => {
    expect(isTauri()).toBe(false);
  });

  it('is true when window.__TAURI__ is set', () => {
    tauriWindow.__TAURI__ = {};
    expect(isTauri()).toBe(true);
  });

  it('is true when window.__TAURI_INTERNALS__ is set', () => {
    tauriWindow.__TAURI_INTERNALS__ = {};
    expect(isTauri()).toBe(true);
  });
});

describe('createAdapter', () => {
  it('returns the mock adapter in a browser environment', () => {
    const api = createAdapter();
    expect(api.isTauri()).toBe(false);
  });

  it('returns the Tauri adapter when Tauri is present', () => {
    tauriWindow.__TAURI__ = {};
    const api = createAdapter();
    expect(api.isTauri()).toBe(true);
  });
});

describe('getAdapter / setAdapter', () => {
  it('memoises the adapter instance', () => {
    const first = getAdapter();
    expect(getAdapter()).toBe(first);
  });

  it('allows overriding and resetting the singleton', () => {
    const custom = createMockAdapter({ latencyMs: 1 });
    setAdapter(custom);
    expect(getAdapter()).toBe(custom);

    setAdapter(null);
    expect(getAdapter()).not.toBe(custom);
  });
});
