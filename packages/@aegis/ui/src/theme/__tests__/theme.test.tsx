import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';
import { DEFAULT_THEME_MODE, THEME_STORAGE_KEY, useTheme } from '../useTheme';

type Listener = (event: MediaQueryListEvent) => void;

interface MatchMediaOptions {
  legacy?: boolean;
}

function mockMatchMedia(initial: boolean, options: MatchMediaOptions = {}) {
  const listeners = new Set<Listener>();
  const addEventListener = (_type: string, listener: Listener) => listeners.add(listener);
  const removeEventListener = (_type: string, listener: Listener) => listeners.delete(listener);
  const base = {
    matches: initial,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    dispatchEvent: () => true,
  };
  const mql = options.legacy
    ? {
        ...base,
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
      }
    : { ...base, addEventListener, removeEventListener };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    listeners,
    setMatches(next: boolean) {
      act(() => {
        mql.matches = next;
        for (const listener of listeners) {
          listener({ matches: next } as MediaQueryListEvent);
        }
      });
    },
  };
}

function Harness() {
  const { mode, resolved, setMode, toggle } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolved}</span>
      <button type="button" onClick={() => setMode('system')}>
        system
      </button>
      <button type="button" onClick={() => setMode('light')}>
        light
      </button>
      <button type="button" onClick={toggle}>
        toggle
      </button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
  delete (window as { matchMedia?: unknown }).matchMedia;
  vi.restoreAllMocks();
});

describe('ThemeProvider', () => {
  it('defaults to dark and applies it to <html>', () => {
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('toggle() switches to light and persists the choice', () => {
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('setMode() persists the explicit choice and updates <html>', () => {
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'light' }));

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('reads a persisted mode from localStorage on mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');

    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('resolves system mode to dark when the media query matches', () => {
    mockMatchMedia(true);

    render(
      <ThemeProvider initialMode="system">
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('resolves system mode to light when the media query does not match', () => {
    mockMatchMedia(false);

    render(
      <ThemeProvider initialMode="system">
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('follows matchMedia when mode is system (prefers dark)', async () => {
    const media = mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'system' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));

    media.setMatches(false);
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));

    media.setMatches(true);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });

  it('follows matchMedia when mode is system (prefers light)', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'system' }));
    await waitFor(() => {
      expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    });
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('removes the matchMedia listener on unmount', () => {
    const media = mockMatchMedia(true);

    const { unmount } = render(
      <ThemeProvider initialMode="system">
        <Harness />
      </ThemeProvider>,
    );
    expect(media.listeners.size).toBe(1);

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('supports the legacy addListener/removeListener API and cleans it up', () => {
    const media = mockMatchMedia(true, { legacy: true });

    const { unmount } = render(
      <ThemeProvider initialMode="system">
        <Harness />
      </ThemeProvider>,
    );
    expect(media.listeners.size).toBe(1);

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it('does not crash on a corrupt stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'not-a-real-mode');
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent(DEFAULT_THEME_MODE);
    expect(document.documentElement).toHaveClass('dark');
  });

  it('falls back to the default mode when localStorage.getItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent(DEFAULT_THEME_MODE);
    expect(document.documentElement).toHaveClass('dark');
  });

  it('keeps the in-memory selection when localStorage.setItem throws', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});

describe('useTheme', () => {
  it('throws the documented error outside a ThemeProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within a ThemeProvider',
    );

    consoleError.mockRestore();
  });
});

describe('ThemeToggle', () => {
  it('cycles dark → light → system and exposes a translated aria-label', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const toggle = screen.getByTestId('theme-toggle');
    expect(toggle).toHaveAccessibleName('Switch theme (current: Dark)');

    fireEvent.click(toggle);
    expect(document.documentElement).not.toHaveClass('dark');
    await waitFor(() => {
      expect(toggle).toHaveAccessibleName('Switch theme (current: Light)');
    });

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAccessibleName('Switch theme (current: System)');
    });

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(toggle).toHaveAccessibleName('Switch theme (current: Dark)');
    });
    expect(document.documentElement).toHaveClass('dark');
  });
});
