import { i18n, SUPPORTED_LOCALES, useAppTranslation } from './index';

export function LanguageSwitcher() {
  const { t, i18n: instance } = useAppTranslation();
  const active = (instance.resolvedLanguage ?? instance.language ?? 'en').split('-')[0];
  const value = SUPPORTED_LOCALES.some((locale) => locale.code === active)
    ? active
    : 'en';

  return (
    <select
      data-testid="language-switcher"
      aria-label={t('settings.language.label')}
      value={value}
      onChange={(event) => {
        void instance.changeLanguage(event.target.value);
      }}
      className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {SUPPORTED_LOCALES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** Convenience for imperative language changes from the app shell. */
export function setLanguage(code: string): Promise<unknown> {
  return i18n.changeLanguage(code);
}
