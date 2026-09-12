import { invoke } from '@tauri-apps/api/core';
import type { Task, OperationLog } from '@aegis/shared';
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

    deleteTask: (taskId: string) => invokeFn<void>('delete_task', { taskId }),

    runTask: (taskId: string) => invokeFn<TaskRun>('run_task', { taskId }),

    getActiveRun: () => invokeFn<TaskRun | null>('get_active_run'),

    listActivity: () => invokeFn<OperationLog[]>('list_activity'),

    listApprovals: () => invokeFn<ApprovalRequest[]>('list_approvals'),

    decideApproval: (input: ApprovalDecisionInput) =>
      invokeFn<ApprovalRequest>('decide_approval', { input }),

    listHealingEvents: () => invokeFn<HealingEvent[]>('list_healing_events'),

    getRecorder: () => invokeFn<RecorderSession>('get_recorder'),

    startRecording: () => invokeFn<RecorderSession>('start_recording'),

    pauseRecording: () => invokeFn<RecorderSession>('pause_recording'),

    resumeRecording: () => invokeFn<RecorderSession>('resume_recording'),

    stopRecording: () => invokeFn<RecorderSession>('stop_recording'),

    takeScreenshot: (label?: string) => invokeFn<ScreenshotRef>('take_screenshot', { label }),

    getSetup: () => invokeFn<SetupState>('get_setup'),

    saveProviderKey: (input: ProviderKeyInput) =>
      invokeFn<void>('save_provider_key', { input }),

    completeSetup: () => invokeFn<void>('complete_setup'),
  };
}
