// ─── Recording State ────────────────────────────────────────────────

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

// ─── Action Types ───────────────────────────────────────────────────

export type ActionType = 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'screenshot' | 'keypress' | 'select' | 'hover' | 'drag';

// ─── Element Selector ───────────────────────────────────────────────

export interface ElementSelector {
  text?: string;
  label?: string;
  placeholder?: string;
  xpath?: string;
  cssSelector?: string;
  role?: string;
  ariaLabel?: string;
  tagName?: string;
  className?: string;
  index?: number;
}

// ─── Action Metadata ────────────────────────────────────────────────

export interface ActionMetadata {
  url?: string;
  title?: string;
  value?: string;
  keyCode?: string;
  scrollDirection?: 'up' | 'down';
  scrollAmount?: number;
  duration?: number;
}

// ─── Recorded Action ────────────────────────────────────────────────

export interface RecordedAction {
  id: string;
  type: ActionType;
  timestamp: number;
  selector: ElementSelector;
  metadata: ActionMetadata;
  screenshot?: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
}

// ─── Session Metadata ───────────────────────────────────────────────

export interface SessionMetadata {
  platform: 'windows' | 'macos' | 'linux';
  browser?: string;
  screenSize?: {
    width: number;
    height: number;
  };
  userAgent: string;
}

// ─── Recording Session ──────────────────────────────────────────────

export interface RecordingSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  state: RecordingState;
  actions: RecordedAction[];
  metadata: SessionMetadata;
}

// ─── Bounding Box ───────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Screenshot Diff Result ─────────────────────────────────────────

export interface ScreenshotDiffResult {
  changed: boolean;
  regions: BoundingBox[];
}

// ─── Session Summary ────────────────────────────────────────────────

export interface SessionSummary {
  totalActions: number;
  actionTypes: Record<ActionType, number>;
  duration: number;
  urls: string[];
}
