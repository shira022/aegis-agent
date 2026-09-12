import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../mock-adapter';

describe('createMockAdapter', () => {
  it('seeds demo data', async () => {
    const api = createMockAdapter();
    const tasks = await api.listTasks();
    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.status)).toEqual(
      expect.arrayContaining(['completed', 'running', 'idle']),
    );

    const activity = await api.listActivity();
    expect(activity.length).toBeGreaterThan(0);
    expect(activity[0].steps.length).toBeGreaterThan(0);

    const approvals = await api.listApprovals();
    expect(approvals).toHaveLength(1);
    expect(approvals[0].state).toBe('reviewing');

    const healing = await api.listHealingEvents();
    expect(healing.some((event) => !event.resolved)).toBe(true);

    const recorder = await api.getRecorder();
    expect(recorder.status).toBe('idle');
    expect(recorder.screenshots).toHaveLength(0);
  });

  it('creates independent instances', async () => {
    const first = createMockAdapter();
    const second = createMockAdapter();
    await first.createTask({ name: 'Only In First' });
    expect(await first.listTasks()).toHaveLength(4);
    expect(await second.listTasks()).toHaveLength(3);
  });

  it('round-trips create then list', async () => {
    const api = createMockAdapter();
    const created = await api.createTask({ name: 'New Flow' });
    const tasks = await api.listTasks();
    expect(tasks).toHaveLength(4);
    expect(tasks.map((task) => task.id)).toContain(created.id);
    expect(tasks.find((task) => task.id === created.id)?.name).toBe('New Flow');
  });

  it('deletes a task', async () => {
    const api = createMockAdapter();
    const [first] = await api.listTasks();
    await api.deleteTask(first.id);
    const tasks = await api.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.id)).not.toContain(first.id);
  });

  it('runs a task and returns generated steps', async () => {
    const api = createMockAdapter();
    const run = await api.runTask('task-3');
    expect(run.taskId).toBe('task-3');
    expect(run.status).toBe('running');
    expect(run.steps.length).toBeGreaterThan(0);

    const active = await api.getActiveRun();
    expect(active?.id).toBe(run.id);

    const tasks = await api.listTasks();
    expect(tasks.find((task) => task.id === 'task-3')?.status).toBe('running');
  });

  it('throws when running an unknown task', async () => {
    const api = createMockAdapter();
    await expect(api.runTask('missing')).rejects.toThrow();
  });

  describe('approvals', () => {
    it('decides a reviewing request, then rejects a second decision', async () => {
      const api = createMockAdapter();
      const [request] = await api.listApprovals();

      const decided = await api.decideApproval({
        requestId: request.id,
        decision: 'approved',
        reason: 'looks safe',
      });
      expect(decided.state).toBe('approved');

      await expect(
        api.decideApproval({ requestId: request.id, decision: 'rejected' }),
      ).rejects.toThrow();

      const requests = await api.listApprovals();
      expect(requests[0].state).toBe('approved');
    });

    it('rejects a decision for an unknown request', async () => {
      const api = createMockAdapter();
      await expect(
        api.decideApproval({ requestId: 'nope', decision: 'approved' }),
      ).rejects.toThrow();
    });
  });

  describe('recorder', () => {
    it('follows the transition chain', async () => {
      const api = createMockAdapter();
      expect((await api.startRecording()).status).toBe('recording');
      expect((await api.pauseRecording()).status).toBe('paused');
      expect((await api.resumeRecording()).status).toBe('recording');
      expect((await api.stopRecording()).status).toBe('stopped');
      expect((await api.getRecorder()).status).toBe('stopped');
    });

    it('rejects pause from idle', async () => {
      const api = createMockAdapter();
      await expect(api.pauseRecording()).rejects.toThrow();
    });

    it('rejects resume when not paused', async () => {
      const api = createMockAdapter();
      await api.startRecording();
      await expect(api.resumeRecording()).rejects.toThrow();
    });

    it('rejects a second start while recording', async () => {
      const api = createMockAdapter();
      await api.startRecording();
      await expect(api.startRecording()).rejects.toThrow();
    });

    it('appends screenshots and returns the reference', async () => {
      const api = createMockAdapter();
      const shot = await api.takeScreenshot('home');
      expect(shot.label).toBe('home');
      const session = await api.getRecorder();
      expect(session.screenshots).toHaveLength(1);
      expect(session.screenshots[0].id).toBe(shot.id);
    });
  });

  it('completes setup', async () => {
    const api = createMockAdapter();
    const before = await api.getSetup();
    expect(before.completed).toBe(false);
    await api.completeSetup();
    const after = await api.getSetup();
    expect(after.completed).toBe(true);
    expect(after.dependencies.every((dep) => dep.status === 'ok')).toBe(true);
  });

  it('honours the artificial latency', async () => {
    const api = createMockAdapter({ latencyMs: 20 });
    const start = Date.now();
    await api.listTasks();
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('accepts and stores a provider key without throwing', async () => {
    const api = createMockAdapter();
    await expect(
      api.saveProviderKey({ providerId: 'openai', apiKey: 'sk-test', model: 'gpt-5' }),
    ).resolves.toBeUndefined();
  });
});
