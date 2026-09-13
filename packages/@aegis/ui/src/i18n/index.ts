import { createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  useTranslation,
  Trans,
  I18nextProvider,
  initReactI18next,
} from 'react-i18next';
import type { TFunction } from 'i18next';
import { createElement } from 'react';
import type { ReactNode } from 'react';

import {
  resources,
  SUPPORTED_LOCALE_CODES,
  DEFAULT_LOCALE,
} from './locales';
import type { SupportedLocaleCode } from './locales';

export {
  SUPPORTED_LOCALES,
  SUPPORTED_LOCALE_CODES,
  DEFAULT_LOCALE,
} from './locales';
export type { SupportedLocale, SupportedLocaleCode } from './locales';
export { Trans };

export interface InitI18nOptions {
  /** Force a language (tests) instead of running detection. */
  lng?: SupportedLocaleCode;
  /**
   * Called for every missing translation key. Tests pass a throwing spy so
   * gaps fail loudly; production leaves it undefined (silent fallback).
   */
  onMissingKey?: (key: string) => void;
}

/** Module-level singleton — components can use `useAppTranslation()` without a provider. */
export const i18n = createInstance();

function applyMissingKeyHandler(options: InitI18nOptions): void {
  if (options.onMissingKey === undefined) {
    return;
  }
  const onMissingKey = options.onMissingKey;
  i18n.options.saveMissing = true;
  i18n.options.missingKeyHandler = (_lngs, _namespace, key) => {
    onMissingKey(key);
  };
}

function syncDocumentLanguage(language: string | undefined): void {
  if (typeof document === 'undefined' || language === undefined) {
    return;
  }
  document.documentElement.lang = language.split('-')[0];
}

/**
 * Initialise (or reconfigure) the singleton. Safe to call repeatedly: the
 * first call wires up the detector; later calls only change the language and
 * missing-key handling.
 */
export function initI18n(options: InitI18nOptions = {}): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        ...(options.lng !== undefined ? { lng: options.lng } : {}),
        supportedLngs: SUPPORTED_LOCALE_CODES,
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        fallbackLng: DEFAULT_LOCALE,
        interpolation: { escapeValue: false },
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
          lookupLocalStorage: 'i18nextLng',
        },
        returnNull: false,
        react: { useSuspense: false },
      });
    i18n.on('languageChanged', (language: string) => {
      syncDocumentLanguage(language);
    });
  } else if (options.lng !== undefined && i18n.language !== options.lng) {
    void i18n.changeLanguage(options.lng);
  }

  applyMissingKeyHandler(options);
  syncDocumentLanguage(i18n.language);
  return i18n;
}

export function changeLanguage(language: SupportedLocaleCode | string): Promise<TFunction> {
  return i18n.changeLanguage(language);
}

export function useAppTranslation(): ReturnType<typeof useTranslation> {
  return useTranslation();
}

export interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  return createElement(I18nextProvider, { i18n }, children);
}

initI18n();
