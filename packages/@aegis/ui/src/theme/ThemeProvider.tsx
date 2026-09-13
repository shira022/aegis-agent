import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  ThemeContext,
  type ThemeContextValue,
  type ThemeMode,
} from './useTheme';

export interface ThemeProviderProps {
  children: ReactNode;
  /** Test/embedding override; production reads `localStorage` (default dark). */
  initialMode?: ThemeMode;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

function getStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStoredMode(): ThemeMode {
  try {
    const stored = getStorage()?.getItem(THEME_STORAGE_KEY) ?? null;
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

function getMediaQuery(): MediaQueryList | null {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)');
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  const query = getMediaQuery();
  // If matchMedia is unavailable, fall back to dark (the app's default look).
  return query === null ? true : query.matches;
}

function resolveMode(mode: ThemeMode, prefersDark: boolean): 'dark' | 'light' {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }
  return mode;
}

export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => initialMode ?? readStoredMode(),
  );
  const [prefersDark, setPrefersDark] = useState<boolean>(() => systemPrefersDark());

  const resolved = resolveMode(mode, prefersDark);

  useEffect(() => {
    if (mode !== 'system') {
      return;
    }
    const query = getMediaQuery();
    if (query === null) {
      return;
    }
    setPrefersDark(query.matches);
    const handler = (event: MediaQueryListEvent): void => {
      setPrefersDark(event.matches);
    };
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler);
      return () => query.removeEventListener('change', handler);
    }
    query.addListener(handler);
    return () => query.removeListener(handler);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      getStorage()?.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — keep the in-memory selection.
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
