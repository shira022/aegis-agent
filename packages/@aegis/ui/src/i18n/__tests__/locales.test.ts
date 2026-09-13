import { describe, it, expect } from 'vitest';
import { en, ja, SUPPORTED_LOCALES, resources } from '../locales';

type NestedRecord = Record<string, unknown>;

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

function flatten(value: NestedRecord, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (child !== null && typeof child === 'object') {
      for (const [nestedPath, nestedValue] of flatten(child as NestedRecord, path)) {
        entries.set(nestedPath, nestedValue);
      }
    } else {
      entries.set(path, String(child));
    }
  }
  return entries;
}

function baseKey(key: string): string {
  return key.replace(PLURAL_SUFFIX, '');
}

function placeholders(value: string): string[] {
  const found: string[] = [];
  for (const match of value.matchAll(PLACEHOLDER)) {
    found.push(match[1]);
  }
  return found.sort();
}

const enEntries = flatten(en as NestedRecord);
const jaEntries = flatten(ja as NestedRecord);

function baseKeySet(entries: Map<string, string>): Set<string> {
  return new Set([...entries.keys()].map(baseKey));
}

function placeholdersByBaseKey(entries: Map<string, string>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [key, value] of entries) {
    const base = baseKey(key);
    const set = out.get(base) ?? new Set<string>();
    for (const token of placeholders(value)) {
      set.add(token);
    }
    out.set(base, set);
  }
  return out;
}

describe('locale resources', () => {
  it('en and ja expose identical key sets (plural-suffix aware)', () => {
    const enKeys = baseKeySet(enEntries);
    const jaKeys = baseKeySet(jaEntries);

    const missingInJa = [...enKeys].filter((key) => !jaKeys.has(key));
    const missingInEn = [...jaKeys].filter((key) => !enKeys.has(key));

    expect(missingInJa, `keys missing from ja: ${missingInJa.join(', ')}`).toEqual([]);
    expect(missingInEn, `keys missing from en: ${missingInEn.join(', ')}`).toEqual([]);
  });

  it('has no empty or key-shaped values', () => {
    for (const [locale, entries] of [
      ['en', enEntries],
      ['ja', jaEntries],
    ] as const) {
      for (const [key, value] of entries) {
        expect(value.trim(), `${locale}.${key} is empty`).not.toBe('');
        expect(value, `${locale}.${key} still equals its key`).not.toBe(
          key.split('.').at(-1),
        );
      }
    }
  });

  it('keeps interpolation placeholders in sync between languages', () => {
    const enByBase = placeholdersByBaseKey(enEntries);
    const jaByBase = placeholdersByBaseKey(jaEntries);

    for (const [base, enTokens] of enByBase) {
      const jaTokens = jaByBase.get(base) ?? new Set<string>();
      expect(
        [...jaTokens].sort(),
        `placeholders differ for ${base}`,
      ).toEqual([...enTokens].sort());
    }
  });

  it('uses _other in ja wherever en uses a plural family', () => {
    const pluralBases = new Set(
      [...enEntries.keys()]
        .filter((key) => PLURAL_SUFFIX.test(key))
        .map(baseKey),
    );
    for (const base of pluralBases) {
      expect(jaEntries.has(`${base}_other`), `ja missing ${base}_other`).toBe(true);
    }
  });

  it('registers every json file in locales/ in SUPPORTED_LOCALES and resources', () => {
    const modules = import.meta.glob('../locales/*.json', { eager: true });
    const fileCodes = Object.keys(modules)
      .map((path) => path.split('/').at(-1)?.replace(/\.json$/, '') ?? '')
      .sort();

    expect(fileCodes).toEqual(SUPPORTED_LOCALES.map((locale) => locale.code).sort());
    expect(fileCodes).toEqual(Object.keys(resources).sort());
  });
});
