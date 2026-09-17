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

Shell controls live in the **left navigation sidebar**, not in a header: the
`LanguageSwitcher` (UI-10) and `ThemeToggle` (UI-11) are pinned to the bottom of
the `<nav>` element (`apps/desktop/src/App.tsx:325-328`, sidebar at `:298-329`).
There is no top header bar in the current shell.

Provider configuration (`ProviderSelector` + "Save key") is rendered **only**
inside the setup gate: when `setup.state.completed` is false the app returns the
setup screen instead of the shell (`App.tsx:277-285`, provider card at
`App.tsx:120-155`). After setup completes there is no route back to provider
settings, so a provider or model cannot currently be changed without clearing the
app state.

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `Dashboard` | ✅ Complete | Task status display; success-rate and last-run figures are placeholders (see below) |
| `TaskList` | ✅ Complete | Task list; create / run / delete wired, edit raises a toast |
| `CodeReviewPanel` | ✅ Complete | Renders an `ApprovalRequest`; no request is ever produced, so only the empty state is reachable |
| `ActionFlowView` | ✅ Complete | Operation flow display; renders an `OperationLog`, which the recorder never fills |
| `Recorder` / `ApprovalDialog` / `HealingNotifier` | ✅ Complete | Components exist; approvals and healing events are never generated, so those two render nothing |
| `SetupWizard` | ✅ Complete | Initial setup; dependency list is driven by `detect_dependencies` (Python only) |
| UI foundation components | ✅ Complete | Button, Card, Modal, Badge, Toast, TaskCards, Timeline, ProviderSelector |
| Icon library | ✅ Complete | lucide-react + semantic icon maps (ADR-008) |
| Localization | ✅ Complete | ja + en, registry-driven (ADR-008) |
| Theme switching | ✅ Complete | dark / light / system + no-flash bootstrap (ADR-008) |

### Per-screen and per-interaction status

What a user can actually accomplish in each screen today:

| Screen / interaction | Status | Actual behaviour |
|----------------------|--------|------------------|
| Setup wizard: dependency check | ⚠️ Partial | The list is driven by `detect_dependencies`, which reports only the Python runtime (`apps/desktop/src-tauri/src/tasks/state.rs:242-258`); Node, pnpm and Rust rows only appear in the mock adapter and tests |
| Setup wizard: install dependency | ⚠️ Partial | The action exists in the UI; no install command is registered in the Rust backend (`lib.rs:37-68` exposes no install command) |
| Setup wizard: provider + API key | ⚠️ Partial | Provider and model persist, but the key is reduced to a non-recoverable mask (`tasks/mod.rs:171-193`), so a key entered here cannot be used for generation after a restart (see `security.md`) |
| Setup wizard: model choice | ⚠️ Partial | Fixed `<select>` over `ProviderConfig.availableModels` (`packages/@aegis/ui/src/ProviderSelector/ProviderSelector.tsx:163-175`); arbitrary model IDs cannot be entered (ADR-009) |
| Reaching provider settings after setup | ❌ Not implemented | The provider card lives inside the setup gate (`App.tsx:277-285`); there is no settings route in the shell |
| Create task | ⚠️ Partial | The name is generated locally as `New Task <n>` (`App.tsx:198-199`); there is no AI-assisted naming or description input |
| Edit task | ❌ Not implemented | The edit action only shows the `toast.editUnavailable` message (`App.tsx:230-232`, `i18n/locales/en.json:198`) although the adapter can rename via `update_task` (`tauri-adapter.ts:33`) |
| Delete task | ✅ Implemented | `deleteTask` → `delete_task` (`tauri-adapter.ts:35`) |
| Run task | ⚠️ Partial | `run_task` records a run lifecycle only and explicitly does not execute the script (`tasks/mod.rs:17-33`) |
| Dashboard success rate | ❌ Not implemented | Computed from finished tasks, of which there are none, so the value is always `—` (`Dashboard.tsx:34-39`) |
| Review screen (approve / reject) | ❌ Not implemented | `pendingRequest` is always `null` (`App.tsx:288`), so the panel always renders "No pending approvals" |
| Recorder: start / pause / resume / stop | ✅ Implemented | Real state machine (`recorder/mod.rs`) |
| Recorder: take screenshot | ✅ Implemented | Real capture (`recorder/mod.rs:268-285`) |
| Recorder: recorded action list | ❌ Not implemented | The session reports `actions: Vec::new()` (`recorder/mod.rs:214`), so the flow view stays empty |
| Healing notification | ❌ Not implemented | `healingEvents` is always empty, so the notifier renders nothing (`App.tsx:261-267`) |
| Toast / modal feedback | ✅ Implemented | `Toast`, `Modal` (ADR-008) |

### Not Yet Implemented

- Real-time updates
- Drag-and-drop operations
- Locales beyond `en` / `ja` (structure ready — registry entry only)
- An in-app settings route for provider / model / API key changes after setup
- Surfacing execution results (stdout, stderr, duration, exit code) in the run view

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
