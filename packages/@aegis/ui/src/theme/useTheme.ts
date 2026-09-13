import { createContext, useContext } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

export const THEME_STORAGE_KEY = 'aegis-theme';
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export interface ThemeContextValue {
  /** What the user chose. */
  mode: ThemeMode;
  /** What is actually applied to the document. */
  resolved: 'dark' | 'light';
  setMode(mode: ThemeMode): void;
  /** Toggle between dark and light (sets an explicit mode). */
  toggle(): void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
