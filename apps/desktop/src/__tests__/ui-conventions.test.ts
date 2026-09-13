import { describe, it, expect } from 'vitest';

const rawSources = {
  ...import.meta.glob('../**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../packages/@aegis/ui/src/**/*.{ts,tsx}', {
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
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/;
const USER_FACING_ATTR = /\b(?:aria-label|placeholder|title|alt)\s*=\s*(?:"[^"]+"|'[^']+')/;
const JSX_TEXT = />[^<>{}]*[A-Za-z][^<>{}]*</;
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

const nonTsx = (path: string): boolean => !path.endsWith('.tsx');

describe('UI conventions', () => {
  it('found the source trees to scan', () => {
    expect(productionSources.length).toBeGreaterThan(10);
  });

  it('scans the new ui i18n, theme and icons sources', () => {
    const paths = productionSources.map(([path]) => path);
    expect(paths.some((path) => path.includes('/packages/@aegis/ui/src/i18n/'))).toBe(true);
    expect(paths.some((path) => path.includes('/packages/@aegis/ui/src/theme/'))).toBe(true);
    expect(paths.some((path) => path.includes('/packages/@aegis/ui/src/icons/'))).toBe(true);
  });

  it('contains no emoji icons in production source', () => {
    const violations = findViolations(EMOJI);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('contains no Tailwind palette literals outside the token entry CSS', () => {
    const violations = findViolations(PALETTE);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('contains no raw colour literals outside the token entry CSS', () => {
    const violations = findViolations(RAW_COLOUR);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  it('contains no hardcoded user-facing strings in JSX', () => {
    const attributeViolations = findViolations(USER_FACING_ATTR, nonTsx);
    expect(attributeViolations, JSON.stringify(attributeViolations, null, 2)).toEqual([]);

    const textViolations = findViolations(JSX_TEXT, nonTsx);
    expect(textViolations, JSON.stringify(textViolations, null, 2)).toEqual([]);
  });

  it('imports icon/i18n packages only through the allowed integration points', () => {
    const isAllowed = (path: string): boolean =>
      ALLOWED_PREFIXES.some((prefix) => path.includes(prefix));
    const violations = findViolations(RESTRICTED_IMPORT, isAllowed);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
