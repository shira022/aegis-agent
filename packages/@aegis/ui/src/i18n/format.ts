import { DEFAULT_LOCALE } from './locales';

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ja: 'ja-JP',
};

/** Map an i18next language code (`ja`, `ja-JP`, …) to an `Intl` locale. */
export function localeFor(language?: string): string {
  const base = (language ?? DEFAULT_LOCALE).split('-')[0];
  return LOCALE_MAP[base] ?? base;
}

function toDate(value: Date | number | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: Date | number | string,
  language?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(localeFor(language), options).format(date);
}

export function formatTime(value: Date | number | string, language?: string): string {
  return formatDate(value, language, { hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(
  value: number,
  language?: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeFor(language), options).format(value);
}
