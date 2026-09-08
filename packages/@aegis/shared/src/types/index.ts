// ─── Task ───────────────────────────────────────────────────────────

export type TaskStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  scriptPath: string;
  createdAt: string;
  updatedAt: string;
}

// ─── OperationStep ──────────────────────────────────────────────────

export type StepType = 'click' | 'type' | 'navigate' | 'wait' | 'screenshot';

export interface StepTarget {
  selector?: string;
  text?: string;
  screenshot?: string;
}

export interface OperationStep {
  type: StepType;
  target: StepTarget;
  timestamp: string;
}

// ─── OperationLog ───────────────────────────────────────────────────

export type OperationSource = 'browser' | 'desktop';

export interface OperationLog {
  id: string;
  taskId: string;
  steps: OperationStep[];
  recordedAt: string;
  source: OperationSource;
}

// ─── ApprovalStatus ─────────────────────────────────────────────────

export type ApprovalStatusValue = 'pending' | 'approved' | 'rejected';

export interface ApprovalStatus {
  taskId: string;
  status: ApprovalStatusValue;
  scriptHash: string;
  reviewedAt: string;
}

// ─── DependencyCheck ────────────────────────────────────────────────

export type DependencyStatus = 'ok' | 'missing' | 'outdated' | 'error';

export interface DependencyCheck {
  name: string;
  installed: string;
  version: string;
  required: string;
  status: DependencyStatus;
}
