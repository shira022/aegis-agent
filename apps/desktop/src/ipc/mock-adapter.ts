import type {
  Task,
  OperationStep,
  OperationLog,
  DependencyCheck,
} from '@aegis/shared';
import type { ApprovalRequest } from '@aegis/approval';
import type {
  DesktopApi,
  NewTaskInput,
  ProviderKeyInput,
  ApprovalDecisionInput,
  TaskRun,
  HealingEvent,
  RecorderSession,
  ScreenshotRef,
  SetupState,
} from './types';

type PendingApproval = ApprovalRequest & {
  decision?: 'approved' | 'rejected';
  reason?: string;
  decidedAt?: number;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedTasks(): Task[] {
  return [
    {
      id: 'task-1',
      name: 'Invoice Download',
      status: 'completed',
      scriptPath: '/scripts/invoice-download.ts',
      createdAt: '2025-06-10T09:00:00Z',
      updatedAt: '2025-06-15T10:30:00Z',
    },
    {
      id: 'task-2',
      name: 'CRM Contact Sync',
      status: 'running',
      scriptPath: '/scripts/crm-sync.ts',
      createdAt: '2025-06-12T08:15:00Z',
      updatedAt: '2025-06-15T11:00:00Z',
    },
    {
      id: 'task-3',
      name: 'Weekly Report Export',
      status: 'idle',
      scriptPath: '/scripts/weekly-report.ts',
      createdAt: '2025-06-13T14:45:00Z',
      updatedAt: '2025-06-14T09:20:00Z',
    },
  ];
}

function demoTimeline(): OperationStep[] {
  return [
    { type: 'navigate', timestamp: '2025-06-15T10:30:00Z', target: { selector: 'https://portal.example.com' } },
    { type: 'click', timestamp: '2025-06-15T10:30:04Z', target: { selector: '#reports', text: 'Reports' } },
    { type: 'type', timestamp: '2025-06-15T10:30:09Z', target: { selector: '#search', text: 'June' } },
    { type: 'click', timestamp: '2025-06-15T10:30:12Z', target: { selector: '#download', text: 'Download CSV' } },
    { type: 'wait', timestamp: '2025-06-15T10:30:15Z', target: {} },
    { type: 'screenshot', timestamp: '2025-06-15T10:30:18Z', target: {} },
  ];
}

function seedActivity(): OperationLog[] {
  return [
    {
      id: 'log-1',
      taskId: 'task-1',
      steps: demoTimeline(),
      recordedAt: '2025-06-15T10:30:18Z',
      source: 'browser',
    },
    {
      id: 'log-2',
      taskId: 'task-2',
      steps: [
        { type: 'navigate', timestamp: '2025-06-15T11:00:00Z', target: { selector: 'https://crm.example.com' } },
        { type: 'click', timestamp: '2025-06-15T11:00:05Z', target: { selector: '#contacts', text: 'Contacts' } },
      ],
      recordedAt: '2025-06-15T11:00:05Z',
      source: 'desktop',
    },
  ];
}

function seedApprovals(): PendingApproval[] {
  return [
    {
      id: 'req-1',
      taskId: 'task-1',
      code: [
        'def main():',
        '    page = open("https://portal.example.com")',
        '    page.click("#reports")',
        '    page.type("#search", "June")',
        '    return page.download("#download")',
      ].join('\n'),
      explanation: 'Download the monthly invoice report and store it locally.',
      exceptionHandlers: [
        { condition: 'ElementNotFound', action: 'Retry', code: 'retry(3)', riskLevel: 'low' },
      ],
      safetyChecks: [
        { id: 'check-1', name: 'Network Access', passed: true, message: 'Only portal.example.com is contacted' },
        { id: 'check-2', name: 'File Access', passed: true, message: 'Writes to the downloads folder' },
      ],
      createdAt: new Date('2025-06-15T10:31:00Z').getTime(),
      riskLevel: 'low',
      state: 'reviewing',
    },
  ];
}

function seedHealing(): HealingEvent[] {
  return [
    {
      id: 'heal-1',
      taskId: 'task-2',
      type: 'healing',
      message: 'Selector "#contacts" changed, attempting text-based fallback.',
      strategy: 'text-fallback',
      timestamp: new Date('2025-06-15T11:00:07Z').getTime(),
      resolved: false,
    },
    {
      id: 'heal-2',
      taskId: 'task-1',
      type: 'healed',
      message: 'Recovered from a slow page load after a retry.',
      strategy: 'retry',
      timestamp: new Date('2025-06-15T10:30:06Z').getTime(),
      resolved: true,
    },
  ];
}

function seedSetup(): SetupState {
  const dependencies: DependencyCheck[] = [
    { name: 'Node.js', installed: 'v20.11.0', version: '20.11.0', required: '>=18', status: 'ok' },
    { name: 'pnpm', installed: '9.1.0', version: '9.1.0', required: '>=8', status: 'ok' },
    { name: 'Rust', installed: '', version: '', required: '>=1.70', status: 'missing' },
  ];
  return { dependencies, completed: false };
}

function defaultRecorder(): RecorderSession {
  return { status: 'idle', actions: [], screenshots: [] };
}

export function createMockAdapter(options: { latencyMs?: number } = {}): DesktopApi {
  const latencyMs = options.latencyMs ?? 0;

  let tasks: Task[] = seedTasks();
  const activity: OperationLog[] = seedActivity();
  const approvals: PendingApproval[] = seedApprovals();
  const healing: HealingEvent[] = seedHealing();
  let recorder: RecorderSession = defaultRecorder();
  let activeRun: TaskRun | null = null;
  let setup: SetupState = seedSetup();

  const delay = (): Promise<void> =>
    latencyMs > 0
      ? new Promise((resolve) => setTimeout(resolve, latencyMs))
      : Promise.resolve();

  return {
    isTauri(): boolean {
      return false;
    },

    async listTasks(): Promise<Task[]> {
      await delay();
      return clone(tasks);
    },

    async createTask(input: NewTaskInput): Promise<Task> {
      await delay();
      const task: Task = {
        id: createId('task'),
        name: input.name,
        status: 'idle',
        scriptPath: `/scripts/${input.name.toLowerCase().replace(/\s+/g, '-')}.ts`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      tasks = [...tasks, task];
      return clone(task);
    },

    async deleteTask(taskId: string): Promise<void> {
      await delay();
      tasks = tasks.filter((task) => task.id !== taskId);
    },

    async runTask(taskId: string): Promise<TaskRun> {
      await delay();
      const task = tasks.find((candidate) => candidate.id === taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      const startedAt = Date.now();
      const steps: OperationStep[] = demoTimeline().map((step, index) => ({
        ...step,
        timestamp: new Date(startedAt + index * 1000).toISOString(),
      }));
      const run: TaskRun = {
        id: createId('run'),
        taskId,
        status: 'running',
        startedAt,
        steps,
      };
      activeRun = run;
      task.status = 'running';
      task.updatedAt = nowIso();
      return clone(run);
    },

    async getActiveRun(): Promise<TaskRun | null> {
      await delay();
      return activeRun ? clone(activeRun) : null;
    },

    async listActivity(): Promise<OperationLog[]> {
      await delay();
      return clone(activity);
    },

    async listApprovals(): Promise<ApprovalRequest[]> {
      await delay();
      return clone(approvals);
    },

    async decideApproval(input: ApprovalDecisionInput): Promise<ApprovalRequest> {
      await delay();
      const request = approvals.find((candidate) => candidate.id === input.requestId);
      if (!request) {
        throw new Error(`Approval request ${input.requestId} not found`);
      }
      if (request.state !== 'pending' && request.state !== 'reviewing') {
        throw new Error(
          `Approval request ${input.requestId} is already ${request.state} and cannot be decided`,
        );
      }
      request.state = input.decision;
      request.decision = input.decision;
      request.reason = input.reason;
      request.decidedAt = Date.now();
      return clone(request);
    },

    async listHealingEvents(): Promise<HealingEvent[]> {
      await delay();
      return clone(healing);
    },

    async getRecorder(): Promise<RecorderSession> {
      await delay();
      return clone(recorder);
    },

    async startRecording(): Promise<RecorderSession> {
      await delay();
      if (recorder.status !== 'idle' && recorder.status !== 'stopped') {
        throw new Error(`Cannot start recording from state "${recorder.status}"`);
      }
      recorder = {
        status: 'recording',
        startedAt: Date.now(),
        actions: [],
        screenshots: [],
      };
      return clone(recorder);
    },

    async pauseRecording(): Promise<RecorderSession> {
      await delay();
      if (recorder.status !== 'recording') {
        throw new Error(`Cannot pause recording from state "${recorder.status}"`);
      }
      recorder = { ...recorder, status: 'paused' };
      return clone(recorder);
    },

    async resumeRecording(): Promise<RecorderSession> {
      await delay();
      if (recorder.status !== 'paused') {
        throw new Error(`Cannot resume recording from state "${recorder.status}"`);
      }
      recorder = { ...recorder, status: 'recording' };
      return clone(recorder);
    },

    async stopRecording(): Promise<RecorderSession> {
      await delay();
      if (recorder.status !== 'recording' && recorder.status !== 'paused') {
        throw new Error(`Cannot stop recording from state "${recorder.status}"`);
      }
      const stopped: RecorderSession = { ...recorder, status: 'stopped', stoppedAt: Date.now() };
      recorder = stopped;
      return clone(stopped);
    },

    async takeScreenshot(label?: string): Promise<ScreenshotRef> {
      await delay();
      const screenshot: ScreenshotRef = {
        id: createId('shot'),
        label: label ?? `Screenshot ${recorder.screenshots.length + 1}`,
        capturedAt: Date.now(),
      };
      recorder = { ...recorder, screenshots: [...recorder.screenshots, screenshot] };
      return clone(screenshot);
    },

    async getSetup(): Promise<SetupState> {
      await delay();
      return clone(setup);
    },

    async saveProviderKey(input: ProviderKeyInput): Promise<void> {
      await delay();
      void input;
    },

    async completeSetup(): Promise<void> {
      await delay();
      setup = {
        dependencies: setup.dependencies.map((dep) => ({
          ...dep,
          installed: dep.installed || dep.required,
          version: dep.version || dep.required,
          status: 'ok',
        })),
        completed: true,
      };
    },
  };
}
