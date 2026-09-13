import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  changeLanguage,
  i18n,
  initI18n,
  useAppTranslation,
} from '..';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { formatDate, formatNumber, localeFor } from '../format';
import { SUPPORTED_LOCALES } from '../locales';

function Greeting() {
  const { t } = useAppTranslation();
  return <span>{t('nav.dashboard')}</span>;
}

afterEach(async () => {
  await changeLanguage('en');
  window.localStorage.clear();
  document.documentElement.lang = 'en';
});

describe('i18n', () => {
  it('defaults to en and renders English copy', () => {
    initI18n({ lng: 'en' });
    expect(i18n.language).toBe('en');
    render(<Greeting />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('switches to Japanese, updates <html lang> and caches the choice', async () => {
    render(<Greeting />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    await changeLanguage('ja');

    await waitFor(() => {
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    });
    expect(i18n.language).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(window.localStorage.getItem('i18nextLng')).toBe('ja');
  });

  it('invokes the missing-key handler for unknown keys', () => {
    const onMissingKey = vi.fn();
    initI18n({ lng: 'en', onMissingKey });
    i18n.t('definitely.missing.key' as never);
    expect(onMissingKey).toHaveBeenCalledWith('definitely.missing.key');
  });

  it('formats dates per active locale', () => {
    const date = new Date('2025-06-15T10:30:00Z');
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    };
    const english = formatDate(date, 'en', options);
    const japanese = formatDate(date, 'ja', options);

    expect(english).toBe('June 15, 2025');
    expect(japanese).toBe('2025年6月15日');
    expect(english).not.toBe(japanese);
    expect(localeFor('ja-JP')).toBe('ja-JP');
    expect(localeFor('en')).toBe('en-US');
  });

  it('formats numbers per active locale', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'ja')).toBe('1,234,567');
  });
});

describe('LanguageSwitcher', () => {
  it('renders one option per supported locale and has an accessible name', () => {
    render(<LanguageSwitcher />);
    const select = screen.getByTestId('language-switcher') as HTMLSelectElement;
    expect(select.options).toHaveLength(SUPPORTED_LOCALES.length);
    expect(screen.getByLabelText('Language')).toBe(select);
  });

  it('changes the active language when an option is selected', async () => {
    render(<LanguageSwitcher />);
    fireEvent.change(screen.getByTestId('language-switcher'), {
      target: { value: 'ja' },
    });

    await waitFor(() => expect(i18n.language).toBe('ja'));
    expect(await screen.findByLabelText('言語')).toBeInTheDocument();
  });
});
