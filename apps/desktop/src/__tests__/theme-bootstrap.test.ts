import { describe, it, expect, afterEach, vi } from 'vitest';
import indexHtml from '../../index.html?raw';
import themeInit from '../../public/theme-init.js?raw';
import tauriConf from '../../src-tauri/tauri.conf.json?raw';

function runThemeInit(): void {
  window.eval(themeInit);
}

function matchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

function clearDocumentTheme(): void {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
}

afterEach(() => {
  window.localStorage.clear();
  clearDocumentTheme();
  delete (window as { matchMedia?: unknown }).matchMedia;
  vi.restoreAllMocks();
});

describe('theme bootstrap (CSP-safe)', () => {
  it('ships no inline executable <script> in index.html', () => {
    const scriptTags = indexHtml.match(/<script\b[^>]*>/gi) ?? [];
    expect(scriptTags.length).toBeGreaterThan(0);
    for (const tag of scriptTags) {
      expect(tag, `inline script tag: ${tag}`).toMatch(/\bsrc=/);
    }
  });

  it('loads the bootstrap from /theme-init.js', () => {
    expect(indexHtml).toContain('<script src="/theme-init.js"></script>');
  });

  it('does not allow unsafe-inline in the Tauri script-src CSP', () => {
    const conf = JSON.parse(tauriConf) as {
      app: { security: { csp: string } };
    };
    const scriptSrc = conf.app.security.csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src'));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  it('ships theme-init.js as a classic script (no module syntax)', () => {
    expect(themeInit).not.toMatch(/^\s*(?:import|export)\b/m);
  });

  it('keeps the expected theme bootstrap behaviours', () => {
    expect(themeInit).toContain('aegis-theme');
    expect(themeInit).toContain('prefers-color-scheme');
    expect(themeInit).toContain('classList');
    expect(themeInit).toContain('colorScheme');
  });

  it('applies the stored dark theme before React mounts', () => {
    window.localStorage.setItem('aegis-theme', 'dark');

    runThemeInit();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('applies the stored light theme before React mounts', () => {
    window.localStorage.setItem('aegis-theme', 'light');

    runThemeInit();

    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('resolves system mode to dark when the media query matches', () => {
    window.localStorage.setItem('aegis-theme', 'system');
    matchMedia(true);

    runThemeInit();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('resolves system mode to light when the media query does not match', () => {
    window.localStorage.setItem('aegis-theme', 'system');
    matchMedia(false);

    runThemeInit();

    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('defaults to dark when nothing is stored', () => {
    runThemeInit();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('falls back to dark for an invalid stored value', () => {
    window.localStorage.setItem('aegis-theme', 'not-a-real-mode');

    runThemeInit();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('falls back to dark when localStorage throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    runThemeInit();

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
