# UI/UX Category

> Packages: `apps/desktop` (app shell) + `packages/@aegis/ui` (shared component library, ADR-005)
> Core Flow: Cross-cutting (visualizes all flows)

## Overview

Defines the user interface of Aegis Agent, including UI components such as the dashboard, task list, code review, and operation flow view.

**Core idea**: Provides an intuitive interface that non-engineers can use easily, and "visualizes" AI decisions to ensure trustworthiness.

Shared UI (components, icons, translations, theme) lives in `packages/@aegis/ui`;
`apps/desktop` only wires routes, hooks and IPC. The three cross-cutting
foundations are decided in ADR-008.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-01 | Dashboard (task status overview) | Must |
| UI-02 | Task list (running/completed/error management) | Must |
| UI-03 | Code review UI (with syntax highlighting) | Must |
| UI-04 | Operation flow view (timeline of recorded operations) | Must |
| UI-05 | Approve / Reject buttons | Must |
| UI-06 | Setup wizard | Should |
| UI-07 | Toast notifications | Should |
| UI-08 | Modal dialogs | Should |
| UI-09 | Icon library (no emoji glyphs) | Must |
| UI-10 | Localization (ja / en) | Must |
| UI-11 | Dark / light theme switch | Must |

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| UI-NF01 | Initial render time | < 2 seconds |
| UI-NF02 | Responsive design | 1024×768 and above |
| UI-NF03 | Accessibility | WCAG 2.1 AA |
| UI-NF04 | Dark theme support | Required |
| UI-NF05 | Light (white) theme support | Required |
| UI-NF06 | Theme applied before first paint | No flash on launch |
| UI-NF07 | Language additions without code changes | Registry entry + JSON only |

## API / Interfaces

### Implemented Components

Shared library (`packages/@aegis/ui/src`):

| Component | Path | Status |
|-----------|------|--------|
| `Button` | `Button/Button.tsx` | ✅ |
| `Card` | `Card/Card.tsx` | ✅ |
| `Modal` | `Modal/Modal.tsx` | ✅ |
| `Badge` | `Badge/Badge.tsx` | ✅ |
| `Toast` | `Toast/Toast.tsx` | ✅ |
| `ProviderSelector` | `ProviderSelector/ProviderSelector.tsx` | ✅ |
| `SetupWizard` | `SetupWizard/SetupWizard.tsx` | ✅ |
| `TaskCards` | `TaskCards/TaskCards.tsx` | ✅ |
| `Timeline` | `Timeline/Timeline.tsx` | ✅ |
| `Icon` | `icons/index.ts` | ✅ |
| `ThemeProvider` / `ThemeToggle` | `theme/` | ✅ |
| `I18nProvider` / `LanguageSwitcher` | `i18n/` | ✅ |

App shell (`apps/desktop/src/components`):

| Component | Path | Status |
|-----------|------|--------|
| `Dashboard` | `Dashboard/Dashboard.tsx` | ✅ |
| `TaskList` | `TaskList/TaskList.tsx` | ✅ |
| `CodeReviewPanel` | `CodeReviewPanel/CodeReviewPanel.tsx` | ✅ |
| `ActionFlowView` | `ActionFlow/ActionFlowView.tsx` | ✅ |
| `Recorder` | `Recorder/Recorder.tsx` | ✅ |
| `ApprovalDialog` | `ApprovalDialog/ApprovalDialog.tsx` | ✅ |
| `HealingNotifier` | `HealingNotifier/HealingNotifier.tsx` | ✅ |

### Icons (UI-09)

- Library: `lucide-react`, imported **only** in `packages/@aegis/ui/src/icons/index.ts`.
- Components use semantic maps instead of pictograms:
  `navIcons` (app views), `taskStatusIcons`, `actionIcons`, `toastIcons`,
  `healingIcons`, `setupIcons`, `brandIcon`.
- Render through `Icon` (`icon`, `size = 16`, `label?`, `className?`).
  Decorative by default (`aria-hidden`); pass a translated `label` when the
  icon carries meaning (renders `role="img"` + `aria-label`).
- Emoji must not appear in UI source; enforced by
  `apps/desktop/src/__tests__/ui-conventions.test.ts`.

### Localization (UI-10)

- Stack: `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Public API (from `@aegis/ui`): `i18n`, `initI18n()`, `I18nProvider`,
  `useAppTranslation()` / re-exported `useTranslation`, `Trans`,
  `changeLanguage()`, `SUPPORTED_LOCALES`, `SUPPORTED_LOCALE_CODES`,
  `DEFAULT_LOCALE`, `LanguageSwitcher`, and the formatters `formatDate`,
  `formatTime`, `formatNumber`, `localeFor`.
- Locale files: `i18n/locales/<code>.json`; registry:
  `i18n/locales/index.ts` (`LOCALE_DEFINITIONS`).
- Supported: `en` (source of truth / fallback), `ja`.
- Detection order: `localStorage` → `navigator`; cached as `i18nextLng`.
  `en-GB` / `ja-JP` collapse to the base locale. `<html lang>` is kept in sync.
- **Adding a language**: copy `en.json`'s key structure into `<code>.json`,
  import it, add one `LOCALE_DEFINITIONS` entry. Switcher and resources follow
  automatically.

### Theming (UI-11, UI-NF04/05/06)

- Modes: `dark` | `light` | `system`; default `dark`; persisted in
  `localStorage['aegis-theme']`.
- `ThemeProvider` toggles the `dark` class on `<html>` and sets
  `style.colorScheme`; while `system` is selected it follows
  `prefers-color-scheme` change events. `useTheme()` exposes
  `{ mode, resolved, setMode, toggle }`.
- Tokens: light palette on `:root`, dark overrides on `.dark` in
  `apps/desktop/src/index.css`, surfaced to Tailwind via `@theme inline`
  (`--color-canvas`, `--color-surface`, `--color-border`, `--color-fg`,
  `--color-muted`, `--color-primary`, `--color-success`, `--color-warning`,
  `--color-danger`, `--color-info` + `-surface` / `-fg` variants) and the
  `dark` custom variant. Components must use tokens, never raw hex.
- No-flash: `apps/desktop/public/theme-init.js` is an **external classic
  script** loaded synchronously from `<head>`; it re-applies the stored mode
  before first paint. It must stay external — `tauri.conf.json` sets
  `script-src 'self'`, which refuses inline scripts in the packaged app.

### UI Flow

```
App launch → theme-init.js applies stored theme → ThemeProvider + I18nProvider
                    ↓
        SetupWizard → Dashboard
                    ↓
        TaskList → CodeReviewPanel → ActionFlowView
                    ↓
        Approve / Reject → Execution result display
```

Header controls: `LanguageSwitcher` (UI-10) and `ThemeToggle` (UI-11).

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `Dashboard` | ✅ Complete | Task status display |
| `TaskList` | ✅ Complete | Task list |
| `CodeReviewPanel` | ✅ Complete | Code review |
| `ActionFlowView` | ✅ Complete | Operation flow display |
| `Recorder` / `ApprovalDialog` / `HealingNotifier` | ✅ Complete | Recorder, approvals, healing |
| `SetupWizard` | ✅ Complete | Initial setup |
| UI foundation components | ✅ Complete | Button, Card, Modal, Badge, Toast, TaskCards, Timeline, ProviderSelector |
| Icon library | ✅ Complete | lucide-react + semantic icon maps (ADR-008) |
| Localization | ✅ Complete | ja + en, registry-driven (ADR-008) |
| Theme switching | ✅ Complete | dark / light / system + no-flash bootstrap (ADR-008) |

### Not Yet Implemented

- Real-time updates
- Drag-and-drop operations
- Locales beyond `en` / `ja` (structure ready — registry entry only)

## Test Coverage

Shared library (`packages/@aegis/ui/src/__tests__`, `i18n/__tests__`, `theme/__tests__`):

| Test File | Target |
|-----------|--------|
| `__tests__/Button.test.tsx` | Button |
| `__tests__/Card.test.tsx` | Card |
| `__tests__/Modal.test.tsx` | Modal |
| `__tests__/Badge.test.tsx` | Badge |
| `__tests__/Toast.test.tsx` | Toast |
| `__tests__/ProviderSelector.test.tsx` | ProviderSelector |
| `__tests__/SetupWizard.test.tsx` | SetupWizard |
| `__tests__/TaskCards.test.tsx` | TaskCards |
| `__tests__/Timeline.test.tsx` | Timeline |
| `i18n/__tests__/i18n.test.tsx` | Provider, switcher, missing-key handling |
| `i18n/__tests__/locales.test.ts` | en/ja key parity + registry invariants |
| `theme/__tests__/theme.test.tsx` | mode resolution, persistence, `system` |

App shell (`apps/desktop/src`):

| Test File | Target |
|-----------|--------|
| `__tests__/App.test.tsx` | App shell (providers, header, views) |
| `__tests__/ui-conventions.test.ts` | No emoji in UI source; tokens over raw hex |
| `__tests__/theme-bootstrap.test.ts` | `theme-init.js` is external; CSP has no `unsafe-inline` |
| `components/Dashboard/__tests__/Dashboard.test.tsx` | Dashboard |
| `components/TaskList/__tests__/TaskList.test.tsx` | TaskList |
| `components/CodeReviewPanel/__tests__/CodeReviewPanel.test.tsx` | CodeReviewPanel |
| `components/ActionFlow/__tests__/ActionFlowView.test.tsx` | ActionFlowView |
| `components/Recorder/__tests__/Recorder.test.tsx` | Recorder |
| `components/ApprovalDialog/__tests__/ApprovalDialog.test.tsx` | ApprovalDialog |
| `components/HealingNotifier/__tests__/HealingNotifier.test.tsx` | HealingNotifier |
| `hooks/__tests__/*.test.tsx` | IPC hooks |
| `stores/__tests__/*.test.ts` | Stores |
| `ipc/__tests__/*.test.ts` | IPC adapters |

## Related Decisions

- ADR-005: React + TypeScript frontend
- ADR-008: Icon library, internationalization and theme switching
