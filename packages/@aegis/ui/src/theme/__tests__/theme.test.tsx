import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../useTheme';
import { THEME_STORAGE_KEY } from '../useTheme';

type Listener = (event: MediaQueryListEvent) => void;

function mockMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    matches: initial,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
    addListener: (listener: Listener) => listeners.add(listener),
    removeListener: (listener: Listener) => listeners.delete(listener),
    dispatchEvent: () => true,
  };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    listeners,
    setMatches(next: boolean) {
      mql.matches = next;
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
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

  it('does not crash on a corrupt stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'not-a-real-mode');
    render(
      <ThemeProvider>
        <Harness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
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
