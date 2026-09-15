import { describe, it, expect, vi } from 'vitest';
import { createTauriAdapter, type InvokeFn } from '../tauri-adapter';

function setup() {
  const invokeFn = vi.fn();
  const api = createTauriAdapter(invokeFn as unknown as InvokeFn);
  return { invokeFn, api };
}

describe('createTauriAdapter', () => {
  it('reports isTauri as true', () => {
    const { api } = setup();
    expect(api.isTauri()).toBe(true);
  });

  it('listTasks invokes list_tasks', async () => {
    const { invokeFn, api } = setup();
    const sentinel = [{ id: 'task-1' }];
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.listTasks()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('list_tasks');
  });

  it('createTask invokes create_task with the input payload', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { id: 'task-new' };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.createTask({ name: 'New Flow' })).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('create_task', { input: { name: 'New Flow' } });
  });

  it('updateTask invokes update_task with the flattened input payload', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { id: 'task-1', name: 'Renamed' };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.updateTask('task-1', { name: 'Renamed' })).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('update_task', {
      input: { taskId: 'task-1', name: 'Renamed' },
    });
  });

  it('deleteTask invokes delete_task with taskId', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue(undefined);
    await expect(api.deleteTask('task-1')).resolves.toBeUndefined();
    expect(invokeFn).toHaveBeenCalledWith('delete_task', { taskId: 'task-1' });
  });

  it('runTask invokes run_task with taskId', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { id: 'run-1' };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.runTask('task-1')).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('run_task', { taskId: 'task-1' });
  });

  it('getActiveRun invokes get_active_run', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue(null);
    await expect(api.getActiveRun()).resolves.toBeNull();
    expect(invokeFn).toHaveBeenCalledWith('get_active_run');
  });

  it('listActivity invokes list_activity', async () => {
    const { invokeFn, api } = setup();
    const sentinel: unknown[] = [];
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.listActivity()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('list_activity');
  });

  it('listApprovals invokes list_approvals', async () => {
    const { invokeFn, api } = setup();
    const sentinel = [{ id: 'req-1' }];
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.listApprovals()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('list_approvals');
  });

  it('decideApproval invokes decide_approval with the input payload', async () => {
    const { invokeFn, api } = setup();
    const input = { requestId: 'req-1', decision: 'approved' as const, reason: 'ok' };
    const sentinel = { id: 'req-1' };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.decideApproval(input)).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('decide_approval', { input });
  });

  it('createApproval invokes create_approval with the input payload', async () => {
    const { invokeFn, api } = setup();
    const input = {
      taskId: 'task-1',
      code: 'print("hi")',
      explanation: 'demo',
      exceptionHandlers: [],
      safetyChecks: [],
      riskLevel: 'low' as const,
    };
    const sentinel = { id: 'req-1', state: 'pending' };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.createApproval(input)).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('create_approval', { input });
  });

  it('listHealingEvents invokes list_healing_events', async () => {
    const { invokeFn, api } = setup();
    const sentinel = [{ id: 'heal-1' }];
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.listHealingEvents()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('list_healing_events');
  });

  it('getRecorder invokes get_recorder', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { status: 'idle' };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.getRecorder()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('get_recorder');
  });

  it('startRecording invokes start_recording', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue({ status: 'recording' });
    await api.startRecording();
    expect(invokeFn).toHaveBeenCalledWith('start_recording');
  });

  it('pauseRecording invokes pause_recording', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue({ status: 'paused' });
    await api.pauseRecording();
    expect(invokeFn).toHaveBeenCalledWith('pause_recording');
  });

  it('resumeRecording invokes resume_recording', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue({ status: 'recording' });
    await api.resumeRecording();
    expect(invokeFn).toHaveBeenCalledWith('resume_recording');
  });

  it('stopRecording invokes stop_recording', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue({ status: 'stopped' });
    await api.stopRecording();
    expect(invokeFn).toHaveBeenCalledWith('stop_recording');
  });

  it('takeScreenshot captures then returns the recorded reference', async () => {
    const { invokeFn, api } = setup();
    const shot = { id: 'shot-1', label: 'home', capturedAt: 1 };
    invokeFn.mockImplementation((cmd: string) => {
      if (cmd === 'take_screenshot') {
        return Promise.resolve('base64-png');
      }
      if (cmd === 'get_recorder') {
        return Promise.resolve({ status: 'recording', screenshots: [shot] });
      }
      return Promise.resolve(undefined);
    });

    await expect(api.takeScreenshot('home')).resolves.toEqual(shot);
    expect(invokeFn).toHaveBeenCalledWith('take_screenshot', { label: 'home' });
    expect(invokeFn).toHaveBeenCalledWith('get_recorder');
  });

  it('getSetup invokes get_setup', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { dependencies: [], completed: false };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.getSetup()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('get_setup');
  });

  it('saveProviderKey invokes save_provider_key with the input payload', async () => {
    const { invokeFn, api } = setup();
    const input = { providerId: 'openai', apiKey: 'sk-test' };
    invokeFn.mockResolvedValue(undefined);
    await expect(api.saveProviderKey(input)).resolves.toBeUndefined();
    expect(invokeFn).toHaveBeenCalledWith('save_provider_key', { input });
  });

  it('generateScript invokes ai_generate_script with the request payload', async () => {
    const { invokeFn, api } = setup();
    const input = { prompt: 'Open the reports page', provider: 'ollama', model: 'llama3' };
    const sentinel = {
      script: 'print("hi")',
      language: 'python',
      mocked: false,
      model: 'llama3',
      promptHash: 'deadbeefdeadbeef',
    };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.generateScript(input)).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('ai_generate_script', { request: input });
  });

  it('getAiProviderStatus invokes ai_provider_status with the provider', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { provider: 'ollama', configured: true, mocked: false };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.getAiProviderStatus('ollama')).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('ai_provider_status', { provider: 'ollama' });
  });

  it('getAiProviderStatus omits the provider when none is given', async () => {
    const { invokeFn, api } = setup();
    const sentinel = { provider: 'openai', configured: false, mocked: false };
    invokeFn.mockResolvedValue(sentinel);
    await expect(api.getAiProviderStatus()).resolves.toBe(sentinel);
    expect(invokeFn).toHaveBeenCalledWith('ai_provider_status', { provider: undefined });
  });

  it('completeSetup invokes complete_setup', async () => {
    const { invokeFn, api } = setup();
    invokeFn.mockResolvedValue(undefined);
    await expect(api.completeSetup()).resolves.toBeUndefined();
    expect(invokeFn).toHaveBeenCalledWith('complete_setup');
  });
});
