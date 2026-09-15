import { invoke } from '@tauri-apps/api/core';
import type { Task, OperationLog } from '@aegis/shared';
import type { ApprovalRequest } from '@aegis/approval';
import type {
  DesktopApi,
  NewTaskInput,
  UpdateTaskInput,
  ProviderKeyInput,
  ApprovalDecisionInput,
  NewApprovalInput,
  AiGenerationInput,
  AiGenerationResult,
  AiProviderStatus,
  TaskRun,
  HealingEvent,
  RecorderSession,
  ScreenshotRef,
  SetupState,
} from './types';

export type InvokeFn = <T>(
  cmd: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export function createTauriAdapter(invokeFn: InvokeFn = invoke): DesktopApi {
  return {
    isTauri(): boolean {
      return true;
    },

    listTasks: () => invokeFn<Task[]>('list_tasks'),

    createTask: (input: NewTaskInput) => invokeFn<Task>('create_task', { input }),

    updateTask: (taskId: string, patch: UpdateTaskInput) =>
      invokeFn<Task>('update_task', { input: { taskId, name: patch.name } }),

    deleteTask: (taskId: string) => invokeFn<void>('delete_task', { taskId }),

    runTask: (taskId: string) => invokeFn<TaskRun>('run_task', { taskId }),

    getActiveRun: () => invokeFn<TaskRun | null>('get_active_run'),

    listActivity: () => invokeFn<OperationLog[]>('list_activity'),

    listApprovals: () => invokeFn<ApprovalRequest[]>('list_approvals'),

    decideApproval: (input: ApprovalDecisionInput) =>
      invokeFn<ApprovalRequest>('decide_approval', { input }),

    createApproval: (input: NewApprovalInput) =>
      invokeFn<ApprovalRequest>('create_approval', { input }),

    listHealingEvents: () => invokeFn<HealingEvent[]>('list_healing_events'),

    getRecorder: () => invokeFn<RecorderSession>('get_recorder'),

    // The recorder state machine exposes its transitions as separate commands
    // whose return shapes are owned by `@aegis/recorder`. The desktop contract
    // is the projected `RecorderSession`, so every mutation is followed by a
    // `get_recorder` read.
    startRecording: async () => {
      await invokeFn<unknown>('start_recording');
      return invokeFn<RecorderSession>('get_recorder');
    },

    pauseRecording: async () => {
      await invokeFn<unknown>('pause_recording');
      return invokeFn<RecorderSession>('get_recorder');
    },

    resumeRecording: async () => {
      await invokeFn<unknown>('resume_recording');
      return invokeFn<RecorderSession>('get_recorder');
    },

    stopRecording: async () => {
      await invokeFn<unknown>('stop_recording');
      return invokeFn<RecorderSession>('get_recorder');
    },

    takeScreenshot: async (label?: string): Promise<ScreenshotRef> => {
      await invokeFn<string>('take_screenshot', { label });
      const session = await invokeFn<RecorderSession>('get_recorder');
      const captured = session.screenshots[session.screenshots.length - 1];
      if (captured === undefined) {
        throw new Error('Screenshot was captured but not recorded in the session');
      }
      return captured;
    },

    getSetup: () => invokeFn<SetupState>('get_setup'),

    saveProviderKey: (input: ProviderKeyInput) =>
      invokeFn<void>('save_provider_key', { input }),

    generateScript: (input: AiGenerationInput) =>
      invokeFn<AiGenerationResult>('ai_generate_script', { request: input }),

    getAiProviderStatus: (provider?: string) =>
      invokeFn<AiProviderStatus>('ai_provider_status', { provider }),

    completeSetup: () => invokeFn<void>('complete_setup'),
  };
}
