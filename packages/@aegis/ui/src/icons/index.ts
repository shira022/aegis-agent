import { createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { DependencyStatus, StepType, TaskStatus } from '@aegis/shared';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
  Copy,
  Globe,
  Info,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Monitor,
  Moon,
  MousePointer2,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Square,
  Sun,
  Timer,
  Trash2,
  Undo2,
  Workflow,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';

export type {
  LucideIcon,
} from 'lucide-react';
export {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  Globe,
  Info,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Monitor,
  Moon,
  MousePointer2,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Square,
  Sun,
  Timer,
  Trash2,
  Undo2,
  Workflow,
  Wrench,
  X,
  XCircle,
};

/** The main application views. Kept here so views never hardcode a glyph. */
export type AppView = 'dashboard' | 'tasks' | 'timeline' | 'review' | 'recorder';

export const navIcons: Record<AppView, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: ListChecks,
  timeline: Workflow,
  review: ScanSearch,
  recorder: CircleDot,
};

export const taskStatusIcons: Record<TaskStatus, LucideIcon> = {
  idle: Circle,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  paused: Pause,
};

export type ActionType = StepType;

export const actionIcons: Record<ActionType, LucideIcon> = {
  click: MousePointerClick,
  type: Keyboard,
  navigate: Globe,
  screenshot: Camera,
  wait: Timer,
};

export type ToastKind = 'success' | 'error' | 'info';

export const toastIcons: Record<ToastKind, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export type HealingEventKind = 'error' | 'healing' | 'healed' | 'failed' | 'fallback';

export const healingIcons: Record<HealingEventKind, LucideIcon> = {
  error: XCircle,
  healing: Wrench,
  healed: CheckCircle2,
  failed: XCircle,
  fallback: Undo2,
};

export const setupIcons: Record<DependencyStatus, LucideIcon> = {
  ok: CheckCircle2,
  missing: XCircle,
  outdated: AlertTriangle,
  error: AlertTriangle,
};

export const brandIcon: LucideIcon = ShieldCheck;

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  /** When provided the icon is exposed as an image with this accessible name. */
  label?: string;
  className?: string;
}

/**
 * Size/accessibility wrapper for lucide icons. Decorative by default; pass a
 * translated `label` when the icon is the only carrier of meaning.
 */
export function Icon({ icon, size = 16, label, className }: IconProps) {
  return createElement(icon, {
    size,
    className,
    'aria-hidden': label === undefined ? true : undefined,
    role: label === undefined ? undefined : 'img',
    'aria-label': label,
  });
}
