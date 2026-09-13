import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, formatTime, localeFor } from '../format';
import { DEFAULT_LOCALE } from '../locales';

const dateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
};

describe('localeFor', () => {
  it('maps known base language codes to their Intl locale', () => {
    expect(localeFor('en')).toBe('en-US');
    expect(localeFor('ja')).toBe('ja-JP');
  });

  it('falls back to the default locale when the language is omitted', () => {
    expect(localeFor()).toBe('en-US');
    expect(localeFor()).toBe(localeFor(DEFAULT_LOCALE));
  });

  it('keeps region variants when the base language is unknown', () => {
    expect(localeFor('fr-CA')).toBe('fr');
    expect(localeFor('xx')).toBe('xx');
  });

  it('uses the mapped locale for region variants of known languages', () => {
    expect(localeFor('ja-JP')).toBe('ja-JP');
    expect(localeFor('en-GB')).toBe('en-US');
  });
});

describe('formatDate', () => {
  const iso = '2025-06-15T10:30:00Z';
  const date = new Date(iso);

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate(Number.NaN)).toBe('');
    expect(formatDate(new Date('nope'))).toBe('');
  });

  it('formats Date, epoch number and ISO string inputs identically', () => {
    const fromDate = formatDate(date, 'en', dateOptions);
    const fromNumber = formatDate(date.getTime(), 'en', dateOptions);
    const fromString = formatDate(iso, 'en', dateOptions);

    expect(fromDate).toBe('June 15, 2025');
    expect(fromNumber).toBe(fromDate);
    expect(fromString).toBe(fromDate);
  });

  it('uses the requested locale for the output', () => {
    const english = formatDate(date, 'en', dateOptions);
    const japanese = formatDate(date, 'ja', dateOptions);
    const expected = new Intl.DateTimeFormat('ja-JP', dateOptions).format(date);

    expect(japanese).toBe(expected);
    expect(japanese).not.toBe(english);
  });
});

describe('formatTime', () => {
  const date = new Date('2025-06-15T10:30:00Z');

  it('formats the time with the 12-hour en locale', () => {
    const expected = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    expect(formatTime(date, 'en')).toBe(expected);
  });

  it('formats the time with the 24-hour ja locale', () => {
    const expected = new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    expect(formatTime(date, 'ja')).toBe(expected);
  });

  it('produces different output for en and ja', () => {
    expect(formatTime(date, 'en')).not.toBe(formatTime(date, 'ja'));
  });
});

describe('formatNumber', () => {
  it('formats with the grouping of the requested locale', () => {
    expect(formatNumber(1234567, 'en')).toBe(new Intl.NumberFormat('en-US').format(1234567));
    expect(formatNumber(1234567, 'ja')).toBe(new Intl.NumberFormat('ja-JP').format(1234567));
  });

  it('passes formatting options through and reacts to the locale', () => {
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'JPY' };
    const japanese = formatNumber(1234567, 'ja', options);

    expect(japanese).toBe(new Intl.NumberFormat('ja-JP', options).format(1234567));
    expect(japanese).not.toBe(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(1234567),
    );
  });
});
