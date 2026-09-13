import { describe, it, expect } from 'vitest';

const rawSources = {
  ...import.meta.glob('../**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../packages/@aegis/ui/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
} as Record<string, string>;

const productionSources = Object.entries(rawSources).filter(
  ([path]) =>
    !path.includes('/__tests__/') &&
    !path.endsWith('.test.ts') &&
    !path.endsWith('.test.tsx'),
);

const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|\u{FE0F}/u;
const PALETTE = /(neutral-|zinc-|slate-|gray-|indigo-|amber-|red-|green-|blue-)/;
const RESTRICTED_PACKAGES = [
  'lucide-react',
  'i18next',
  'react-i18next',
  'i18next-browser-languagedetector',
];
const RESTRICTED_IMPORT = new RegExp(
  `['"](?:${RESTRICTED_PACKAGES.join('|')})['"]`,
);
const ALLOWED_PREFIXES = [
  '/packages/@aegis/ui/src/icons/',
  '/packages/@aegis/ui/src/i18n/',
];

function findViolations(pattern: RegExp, isAllowed?: (path: string) => boolean) {
  const violations: { path: string; line: string }[] = [];
  for (const [path, content] of productionSources) {
    if (isAllowed?.(path)) {
      continue;
    }
    for (const line of content.split('\n')) {
      if (pattern.test(line)) {
        violations.push({ path, line: line.trim() });
      }
    }
  }
  return violations;
}

describe('UI conventions', () => {
  it('found the source trees to scan', () => {
    expect(productionSources.length).toBeGreaterThan(10);
  });

  it('contains no emoji icons in production source', () => {
    const violations = findViolations(EMOJI);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('contains no Tailwind palette literals outside the token entry CSS', () => {
    const violations = findViolations(PALETTE);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('imports icon/i18n packages only through the allowed integration points', () => {
    const isAllowed = (path: string): boolean =>
      ALLOWED_PREFIXES.some((prefix) => path.includes(prefix));
    const violations = findViolations(RESTRICTED_IMPORT, isAllowed);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
