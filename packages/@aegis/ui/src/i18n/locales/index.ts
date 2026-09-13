import en from './en.json';
import ja from './ja.json';

/**
 * Locale registry — the single place to register a language.
 *
 * To add a language:
 *   1. Drop a `<code>.json` file next to this one with the *same* key
 *      structure as `en.json` (the source of truth), including its
 *      `locale.self` endonym.
 *   2. Import it above and add **one** entry to `LOCALE_DEFINITIONS`.
 *
 * No other code change is required: the switcher, resources map and
 * `SUPPORTED_LOCALES` are all derived from this registry. The display
 * label is read from each resource's `locale.self` key so that this file
 * stays free of translated text.
 */
const LOCALE_DEFINITIONS = [
  { code: 'en', translation: en },
  { code: 'ja', translation: ja },
] as const;

export type SupportedLocaleCode = (typeof LOCALE_DEFINITIONS)[number]['code'];

export interface SupportedLocale {
  code: SupportedLocaleCode;
  label: string;
}

export const SUPPORTED_LOCALE_CODES: SupportedLocaleCode[] =
  LOCALE_DEFINITIONS.map((definition) => definition.code);

export const SUPPORTED_LOCALES: SupportedLocale[] = LOCALE_DEFINITIONS.map(
  ({ code, translation }) => ({ code, label: translation.locale.self }),
);

export const DEFAULT_LOCALE: SupportedLocaleCode = 'en';

export const resources = Object.fromEntries(
  LOCALE_DEFINITIONS.map(({ code, translation }) => [code, { translation }]),
) as Record<SupportedLocaleCode, { translation: typeof en }>;

export { en, ja };
