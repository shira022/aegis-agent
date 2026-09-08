// ─── Execution State ─────────────────────────────────────────────────

export type ExecutionState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'killed';

// ─── Execution Config ────────────────────────────────────────────────

export interface ExecutionConfig {
  scriptPath: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  workingDir?: string;
  pythonPath?: string;
  maxRetries?: number;
  retryDelay?: number;
}

// ─── Output Line ─────────────────────────────────────────────────────

export interface OutputLine {
  timestamp: number;
  stream: 'stdout' | 'stderr';
  content: string;
}

// ─── Execution Error ─────────────────────────────────────────────────

export interface ExecutionError {
  code: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  suggestedFix?: string;
}

// ─── Execution Result ────────────────────────────────────────────────

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  timedOut: boolean;
  memoryUsage?: number;
  outputLines: OutputLine[];
}

// ─── Execution Log ───────────────────────────────────────────────────

export interface ExecutionLog {
  id: string;
  taskId: string;
  config: ExecutionConfig;
  startTime: number;
  endTime?: number;
  state: ExecutionState;
  result?: ExecutionResult;
  retryCount: number;
  error?: ExecutionError;
}

// ─── Execution Metrics ───────────────────────────────────────────────

export interface ExecutionMetrics {
  totalRuns: number;
  successRate: number;
  averageDuration: number;
  totalRetries: number;
  lastError?: ExecutionError;
}

// ─── Engine Config ───────────────────────────────────────────────────

export interface EngineConfig {
  defaultTimeout: number;
  maxConcurrent: number;
  logDir: string;
  pythonPath: string;
}

// ─── Collected Logs ──────────────────────────────────────────────────

export interface CollectedLogs {
  stdout: string[];
  stderr: string[];
  timestamps: number[];
  errors: ExecutionError[];
}

// ─── Error Pattern ───────────────────────────────────────────────────

export interface ErrorPattern {
  pattern: RegExp;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// ─── Performance Metrics ─────────────────────────────────────────────

export interface PerformanceMetrics {
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  p95Duration: number;
}

// ─── Log Analysis ────────────────────────────────────────────────────

export interface LogAnalysis {
  errorPatterns: ErrorPattern[];
  performanceMetrics: PerformanceMetrics;
  suggestions: string[];
}

// ─── Approved Program (for script generator) ─────────────────────────

export interface ApprovedProgram {
  name: string;
  code: string;
  features: string[];
  dependencies?: string[];
}
