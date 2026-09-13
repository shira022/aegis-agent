import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  changeLanguage,
  i18n,
  initI18n,
  I18nProvider,
  useAppTranslation,
} from '..';
import { LanguageSwitcher, setLanguage } from '../LanguageSwitcher';
import { formatDate, formatNumber, localeFor } from '../format';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../locales';
import en from '../locales/en.json';
import ja from '../locales/ja.json';

function Greeting() {
  const { t } = useAppTranslation();
  return <span>{t('nav.dashboard')}</span>;
}

function translateMissingKey(options?: Record<string, unknown>): string {
  return (i18n.t as unknown as (key: string, values?: Record<string, unknown>) => string)(
    'definitely.missing.key',
    options,
  );
}

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => {
    await changeLanguage('en');
  });
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

    await act(async () => {
      await changeLanguage('ja');
    });

    await waitFor(() => {
      expect(screen.getByText(ja.nav.dashboard)).toBeInTheDocument();
    });
    expect(i18n.language).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(window.localStorage.getItem('i18nextLng')).toBe('ja');
  });

  it('renders children through the I18nProvider with the shared instance', () => {
    render(
      <I18nProvider>
        <Greeting />
      </I18nProvider>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('invokes the missing-key handler for unknown keys', () => {
    const onMissingKey = vi.fn();
    initI18n({ lng: 'en', onMissingKey });
    translateMissingKey();
    expect(onMissingKey).toHaveBeenCalledWith('definitely.missing.key');
  });

  it('returns the key for a missing translation but honours a defaultValue', () => {
    initI18n({ lng: 'en', onMissingKey: vi.fn() });

    expect(translateMissingKey()).toBe('definitely.missing.key');
    expect(translateMissingKey({ defaultValue: 'Fallback' })).toBe('Fallback');
  });

  it('falls back to the default locale for an unsupported language code', async () => {
    await act(async () => {
      await changeLanguage('xx');
    });

    expect(i18n.resolvedLanguage).toBe(DEFAULT_LOCALE);
    expect(i18n.language).toBe(DEFAULT_LOCALE);
    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
  });

  it('reconfigures an already initialised instance when lng changes', async () => {
    expect(i18n.language).toBe('en');

    await act(async () => {
      initI18n({ lng: 'ja' });
      await i18n.changeLanguage('ja');
    });

    expect(i18n.language).toBe('ja');
  });

  it('keeps <html lang> when a language change event carries no language', () => {
    initI18n({ lng: 'en' });
    document.documentElement.lang = 'en';

    act(() => {
      i18n.emit('languageChanged', undefined as unknown as string);
    });

    expect(document.documentElement.lang).toBe('en');
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
    expect(japanese).toBe(new Intl.DateTimeFormat('ja-JP', options).format(date));
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
  it('renders one option per supported locale labelled from the locale resources', () => {
    render(<LanguageSwitcher />);
    const select = screen.getByTestId('language-switcher') as HTMLSelectElement;

    expect(select.options).toHaveLength(SUPPORTED_LOCALES.length);
    SUPPORTED_LOCALES.forEach((locale, index) => {
      expect(select.options[index].value).toBe(locale.code);
      expect(select.options[index].textContent).toBe(locale.label);
    });
  });

  it('has an accessible name taken from the translation resources', () => {
    render(<LanguageSwitcher />);
    const select = screen.getByTestId('language-switcher');
    expect(screen.getByLabelText(en.settings.language.label)).toBe(select);
  });

  it('calls i18n.changeLanguage when an option is selected', async () => {
    const spy = vi.spyOn(i18n, 'changeLanguage');
    render(<LanguageSwitcher />);

    await act(async () => {
      fireEvent.change(screen.getByTestId('language-switcher'), {
        target: { value: 'ja' },
      });
    });

    expect(spy).toHaveBeenCalledWith('ja');
    expect(i18n.resolvedLanguage).toBe('ja');
  });

  it('re-renders the surrounding UI in the selected language', async () => {
    render(
      <>
        <Greeting />
        <LanguageSwitcher />
      </>,
    );

    await act(async () => {
      fireEvent.change(screen.getByTestId('language-switcher'), {
        target: { value: 'ja' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(ja.nav.dashboard)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(ja.settings.language.label)).toBeInTheDocument();
  });

  it('reflects a language change made outside the component', async () => {
    render(<LanguageSwitcher />);
    expect((screen.getByTestId('language-switcher') as HTMLSelectElement).value).toBe('en');

    await act(async () => {
      await changeLanguage('ja');
    });

    expect((screen.getByTestId('language-switcher') as HTMLSelectElement).value).toBe('ja');
  });

  it('falls back to the default selection for an unsupported active language', () => {
    vi.spyOn(i18n, 'resolvedLanguage', 'get').mockReturnValue('fr');

    render(<LanguageSwitcher />);

    expect((screen.getByTestId('language-switcher') as HTMLSelectElement).value).toBe('en');
  });

  it('changes the shared instance language through setLanguage', async () => {
    await act(async () => {
      await setLanguage('ja');
    });

    expect(i18n.language).toBe('ja');
  });
});
