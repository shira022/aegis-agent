# UI/UX Category

> Package: `apps/desktop` (`@aegis/ui` not yet implemented)
> Core Flow: Cross-cutting (visualizes all flows)

## Overview

Defines the user interface of Aegis Agent, including UI components such as the dashboard, task list, code review, and operation flow view.

**Core idea**: Provides an intuitive interface that non-engineers can use easily, and "visualizes" AI decisions to ensure trustworthiness.

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

### Non-Functional Requirements

| ID | Requirement | Threshold |
|----|-------------|-----------|
| UI-NF01 | Initial render time | < 2 seconds |
| UI-NF02 | Responsive design | 1024×768 and above |
| UI-NF03 | Accessibility | WCAG 2.1 AA |
| UI-NF04 | Dark theme support | Required |

## API / Interfaces

### Implemented Components

| Component | Path | Status |
|-----------|------|--------|
| `Dashboard` | `components/Dashboard/` | ✅ |
| `TaskList` | `components/TaskList/` | ✅ |
| `CodeReviewPanel` | `components/CodeReviewPanel/` | ✅ |
| `TimelineView` | `components/TimelineView/` | ✅ |
| `SetupWizard` | `components/SetupWizard/` | ✅ |
| `Button` | `components/ui/Button.tsx` | ✅ |
| `Card` | `components/ui/Card.tsx` | ✅ |
| `Modal` | `components/ui/Modal.tsx` | ✅ |
| `Badge` | `components/ui/Badge.tsx` | ✅ |
| `Toast` | `components/ui/Toast.tsx` | ✅ |

### UI Flow

```
App launch → SetupWizard → Dashboard
                    ↓
            TaskList → CodeReviewPanel → TimelineView
                    ↓
            Approve / Reject → Execution result display
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| `Dashboard` | ✅ Complete | Task status display |
| `TaskList` | ✅ Complete | Task list |
| `CodeReviewPanel` | ✅ Complete | Code review |
| `TimelineView` | ✅ Complete | Operation flow display |
| `SetupWizard` | ✅ Complete | Initial setup |
| UI foundation components | ✅ Complete | Button, Card, Modal, Badge, Toast |

### Not Yet Implemented

- `@aegis/ui` package (shared component library)
- Real-time updates
- Drag-and-drop operations

## Test Coverage

| Test File | Target |
|-----------|--------|
| `components/Dashboard/__tests__/Dashboard.test.tsx` | Dashboard |
| `components/TaskList/__tests__/TaskList.test.tsx` | TaskList |
| `components/CodeReviewPanel/__tests__/CodeReviewPanel.test.tsx` | CodeReviewPanel |
| `components/TimelineView/__tests__/TimelineView.test.tsx` | TimelineView |
| `components/ui/__tests__/Button.test.tsx` | Button |
| `components/ui/__tests__/Card.test.tsx` | Card |
| `components/ui/__tests__/Modal.test.tsx` | Modal |
| `components/ui/__tests__/Badge.test.tsx` | Badge |
| `components/ui/__tests__/Toast.test.tsx` | Toast |
| `__tests__/SetupWizard.test.tsx` | SetupWizard |
