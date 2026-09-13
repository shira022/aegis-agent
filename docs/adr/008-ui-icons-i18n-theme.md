# ADR-008: Icon Library, Internationalization and Theme Switching

## Status

Accepted

## Context

The desktop UI grew without a shared visual language or a shared text layer:

- Icons were rendered as **emoji glyphs** inside JSX. Emoji pick up the
  platform font, cannot be recoloured or sized consistently, differ between
  Windows and macOS, and are read aloud unpredictably by screen readers.
- All user-visible copy was **hardcoded English** in components, so there was
  no way to ship a Japanese UI (UI-NF03 / the stated ja + en requirement).
- Only a dark palette existed. `apps/desktop/src/index.css` held a single set
  of colour values, with no mechanism to switch, and no way to keep a choice.

The UI package `@aegis/ui` became the shared component library for every
surface (ADR-005), so all three concerns need one foundation there rather than
per-component ad-hoc solutions.

## Decision

Introduce three foundations in `packages/@aegis/ui/src`, all re-exported from
the package entry point so consumers import from one place.

### 1. Icons — `lucide-react`

- Depend on `lucide-react` (verified: `1.45.0` resolved in the lockfile).
- `icons/index.ts` is the **only** module that imports glyphs. It defines
  semantic maps (`navIcons`, `taskStatusIcons`, `actionIcons`, `toastIcons`,
  `healingIcons`, `setupIcons`, `brandIcon`) keyed by the domain unions from
  `@aegis/shared`, so a component asks for *meaning* (`taskStatusIcons[status]`)
  instead of naming a pictogram.
- `Icon` is the single render wrapper: 16px default, `aria-hidden` unless a
  translated `label` is supplied (then `role="img"` + `aria-label`).
- No emoji glyphs remain in UI source; `apps/desktop/src/__tests__/ui-conventions.test.ts`
  fails the build if one reappears.

### 2. Internationalization — `i18next` + `react-i18next`

- Depend on `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
- **Locale registry** (`i18n/locales/index.ts`) is the single source of truth:
  `LOCALE_DEFINITIONS` pairs a code, a display label and the JSON bundle.
  `SUPPORTED_LOCALES`, `SUPPORTED_LOCALE_CODES`, `DEFAULT_LOCALE` and the
  i18next `resources` map are all *derived* from it. Adding a language is
  therefore: drop `<code>.json` (same key structure as `en.json`) + one array
  entry — no other code change.
- Initial support: **`en` (source of truth, fallback) and `ja`**.
- Detection order `localStorage` → `navigator`, cached under `i18nextLng`;
  `nonExplicitSupportedLngs` + `load: 'languageOnly'` so `en-GB`/`ja-JP`
  resolve to the base locale. `syncDocumentLanguage()` keeps
  `<html lang>` in step for assistive tech and hyphenation.
- A module-level singleton (`i18n`, `initI18n()`, `I18nProvider`,
  `useAppTranslation()`) keeps the API small and lets tests force a language
  and install a **throwing missing-key handler** so translation gaps fail
  tests instead of silently falling back.
- Locale-aware date/number/time helpers live in `i18n/format.ts`
  (`formatDate`, `formatNumber`, `formatTime`, `localeFor`) rather than being
  re-implemented per component.

### 3. Theme — class-based dark/light through CSS variables

- `ThemeMode = 'dark' | 'light' | 'system'`, default `dark` (the product's
  existing look), persisted in `localStorage['aegis-theme']`.
- `ThemeProvider` resolves the mode (honouring `prefers-color-scheme` and its
  `change` events while `system` is selected), toggles the `dark` class on
  `<html>` and sets `style.colorScheme` so native scrollbars/form controls
  follow.
- `apps/desktop/src/index.css` defines the light palette on `:root` and the
  dark overrides on `.dark`, exposed to Tailwind through `@theme inline`
  (`--color-canvas`, `--color-fg`, …) plus
  `@custom-variant dark (&:where(.dark, .dark *))`. Components use semantic
  tokens only — no raw hex values.
- **No-flash bootstrap**: `apps/desktop/public/theme-init.js` (external
  classic script, loaded synchronously from `<head>`) applies the stored mode
  before first paint. It must stay external: `apps/desktop/src-tauri/tauri.conf.json`
  sets `script-src 'self'`, which blocks inline scripts in the packaged app —
  an inline bootstrap would be refused and the app would flash.
- `ThemeToggle` and `LanguageSwitcher` live in the UI library so both the
  header and the setup wizard can render them.

## Consequences

### Positive

- One place to add a language, one place to change an icon, one set of colour
  tokens — component code stays free of glyphs, literals and hex values.
- Icons are currentColor-driven, so they inherit theme colours for free and
  render identically on Windows and macOS.
- Explicit `aria-hidden`/`label` handling makes icon semantics a deliberate
  decision instead of an accident of emoji pronunciation.
- Theme choice survives restarts and can follow the OS.

### Negative

- New runtime dependencies (lucide-react, i18next, react-i18next,
  i18next-browser-languagedetector) in the webview bundle.
- Every user-visible string must be added to **both** `en.json` and `ja.json`;
  a missing key is a silent English fallback in production (caught by tests).
- `ja.json` needs maintenance as features are added — translations can drift
  from the English source.
- The theme bootstrap is duplicated in spirit (a plain-JS copy of the
  resolution rule) because it must run before the bundle loads; the rule is
  small and covered by a regression test.

## Alternatives Considered

- **Keep emoji / inline SVG per component** — no dependency, but no
  consistent sizing, colour or accessible naming, and it does not scale.
- **`react-icons` / `heroicons` / `@radix-ui/react-icons`** — comparable, but
  lucide ships a tree-shakeable ES module set with a uniform stroke model that
  matches the existing UI's flat, technical look; heroicons lacks the
  coverage for the recorder/healing metaphors already in the spec.
- **`formatjs`/`react-intl`, `lingui`, or a hand-rolled `t()`** —
  `react-intl` needs a compile/message-extraction step this repo does not have;
  a hand-rolled map loses plural/format handling and the missing-key signal.
  i18next needs no build step and has a first-class language detector.
- **CSS-only theming via `prefers-color-scheme` only** — no manual override,
  which is the requirement.
- **`system` only (no explicit light/dark)** — rejected: the user asked for an
  explicit dark/white switch; `system` is kept as a third, additive option.
- **Inline `<script>` bootstrap (with a CSP hash/nonce)** — an inline script
  forced us to weaken `script-src 'self'`; externalising it keeps the Tauri CSP
  strict.
