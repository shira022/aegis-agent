import { describe, it, expect } from 'vitest';
import { createMockAdapter } from '../../ipc/mock-adapter';
import { createTasksStore } from '../tasksStore';

describe('tasksStore', () => {
  it('starts empty and loads tasks', async () => {
    const store = createTasksStore(createMockAdapter());
    expect(store.state.getState().tasks).toHaveLength(0);

    await store.actions.load();

    expect(store.state.getState().tasks).toHaveLength(3);
    expect(store.state.getState().loading).toBe(false);
    expect(store.state.getState().error).toBeNull();
  });

  it('creates a task and appends it to the list', async () => {
    const store = createTasksStore(createMockAdapter());
    await store.actions.load();

    const created = await store.actions.create({ name: 'Payslip Download' });

    expect(created?.name).toBe('Payslip Download');
    expect(store.state.getState().tasks).toHaveLength(4);
    expect(store.state.getState().tasks.map((task) => task.name)).toContain('Payslip Download');
  });

  it('removes a task from the list', async () => {
    const store = createTasksStore(createMockAdapter());
    await store.actions.load();
    const [first] = store.state.getState().tasks;

    await store.actions.remove(first.id);

    expect(store.state.getState().tasks).toHaveLength(2);
    expect(store.state.getState().tasks.map((task) => task.id)).not.toContain(first.id);
  });

  it('runs a task and marks it running', async () => {
    const store = createTasksStore(createMockAdapter());
    await store.actions.load();

    await store.actions.run('task-3');

    const task = store.state.getState().tasks.find((candidate) => candidate.id === 'task-3');
    expect(task?.status).toBe('running');
  });

  it('surfaces a load error', async () => {
    const adapter = createMockAdapter();
    const failing = {
      ...adapter,
      listTasks: () => Promise.reject(new Error('boom')),
    };
    const store = createTasksStore(failing);

    await store.actions.load();

    expect(store.state.getState().error).toBe('boom');
    expect(store.state.getState().loading).toBe(false);
  });
});
