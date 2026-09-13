import { describe, it, expect } from 'vitest';
import indexHtml from '../../index.html?raw';
import themeInit from '../../public/theme-init.js?raw';
import tauriConf from '../../src-tauri/tauri.conf.json?raw';

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
});
