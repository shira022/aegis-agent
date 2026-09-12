import type {
  Task,
  OperationStep,
  OperationLog,
  DependencyCheck,
} from '@aegis/shared';
import type { ApprovalRequest } from '@aegis/approval';

// ─── Run ────────────────────────────────────────────────────────────

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface TaskRun {
  id: string;
  taskId: string;
  status: RunStatus;
  startedAt: number;
  finishedAt?: number;
  steps: OperationStep[];
}

// ─── Healing ────────────────────────────────────────────────────────

export type HealingEventType = 'error' | 'healing' | 'healed' | 'failed' | 'fallback';

export interface HealingEvent {
  id: string;
  taskId: string;
  type: HealingEventType;
  message: string;
  strategy?: string;
  timestamp: number;
  resolved: boolean;
}

// ─── Recorder ───────────────────────────────────────────────────────

export type RecorderStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export interface ScreenshotRef {
  id: string;
  label: string;
  capturedAt: number;
}

export interface RecorderSession {
  status: RecorderStatus;
  startedAt?: number;
  stoppedAt?: number;
  actions: OperationStep[];
  screenshots: ScreenshotRef[];
}

// ─── Setup ──────────────────────────────────────────────────────────

export interface SetupState {
  dependencies: DependencyCheck[];
  completed: boolean;
}

// ─── Inputs ─────────────────────────────────────────────────────────

export interface NewTaskInput {
  name: string;
}

export interface ProviderKeyInput {
  providerId: string;
  apiKey: string;
  model?: string;
}

export interface ApprovalDecisionInput {
  requestId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
}

// ─── Desktop API ────────────────────────────────────────────────────

export interface DesktopApi {
  isTauri(): boolean;
  listTasks(): Promise<Task[]>;
  createTask(input: NewTaskInput): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  runTask(taskId: string): Promise<TaskRun>;
  getActiveRun(): Promise<TaskRun | null>;
  listActivity(): Promise<OperationLog[]>;
  listApprovals(): Promise<ApprovalRequest[]>;
  decideApproval(input: ApprovalDecisionInput): Promise<ApprovalRequest>;
  listHealingEvents(): Promise<HealingEvent[]>;
  getRecorder(): Promise<RecorderSession>;
  startRecording(): Promise<RecorderSession>;
  pauseRecording(): Promise<RecorderSession>;
  resumeRecording(): Promise<RecorderSession>;
  stopRecording(): Promise<RecorderSession>;
  takeScreenshot(label?: string): Promise<ScreenshotRef>;
  getSetup(): Promise<SetupState>;
  saveProviderKey(input: ProviderKeyInput): Promise<void>;
  completeSetup(): Promise<void>;
}
