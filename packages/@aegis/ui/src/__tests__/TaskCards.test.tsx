import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { Task, TaskStatus } from '@aegis/shared';
import { TaskCards } from '../TaskCards/TaskCards';

const makeTask = (
  overrides: Partial<Task> & { id: string; name: string },
): Task => ({
  status: 'idle',
  scriptPath: '',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-06-15T10:30:00Z',
  ...overrides,
});

describe('TaskCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one card per task', () => {
    const tasks = [
      makeTask({ id: '1', name: 'Login Automation' }),
      makeTask({ id: '2', name: 'Data Fetch' }),
      makeTask({ id: '3', name: 'Report Export' }),
    ];
    render(<TaskCards tasks={tasks} />);
    expect(screen.getAllByTestId('task-card')).toHaveLength(3);
    expect(screen.getByText('Login Automation')).toBeInTheDocument();
    expect(screen.getByText('Data Fetch')).toBeInTheDocument();
    expect(screen.getByText('Report Export')).toBeInTheDocument();
  });

  it('renders the matching status label for each task', () => {
    const statuses: TaskStatus[] = ['idle', 'running', 'completed', 'failed', 'paused'];
    const tasks = statuses.map((status, index) =>
      makeTask({ id: String(index), name: `Task ${index}`, status }),
    );
    render(<TaskCards tasks={tasks} />);

    for (const status of statuses) {
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders the updatedAt timestamp', () => {
    const tasks = [makeTask({ id: '1', name: 'Timestamped', updatedAt: '2025-06-15T10:30:00Z' })];
    render(<TaskCards tasks={tasks} />);
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it('renders the empty state when there are no tasks', () => {
    render(<TaskCards tasks={[]} />);
    expect(screen.getByTestId('task-cards-empty')).toHaveTextContent('No tasks yet');
    expect(screen.queryAllByTestId('task-card')).toHaveLength(0);
  });

  it('calls onSelect with the task id when a card is clicked', () => {
    const onSelect = vi.fn();
    const tasks = [makeTask({ id: 'task-7', name: 'Selectable' })];
    render(<TaskCards tasks={tasks} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('task-card'));
    expect(onSelect).toHaveBeenCalledWith('task-7');
  });

  it('exposes aria-pressed on the selected card only', () => {
    const tasks = [
      makeTask({ id: '1', name: 'First' }),
      makeTask({ id: '2', name: 'Second' }),
    ];
    render(<TaskCards tasks={tasks} onSelect={vi.fn()} selectedId="2" />);
    const cards = screen.getAllByTestId('task-card');
    expect(cards[0]).toHaveAttribute('aria-pressed', 'false');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onRun with the task id when Run is clicked', () => {
    const onRun = vi.fn();
    const onSelect = vi.fn();
    const tasks = [makeTask({ id: 'task-9', name: 'Runnable' })];
    render(<TaskCards tasks={tasks} onRun={onRun} onSelect={onSelect} />);
    const card = screen.getByTestId('task-card');
    fireEvent.click(within(card).getByRole('button', { name: 'Run' }));
    expect(onRun).toHaveBeenCalledWith('task-9');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onDelete with the task id when Delete is clicked', () => {
    const onDelete = vi.fn();
    const tasks = [makeTask({ id: 'task-4', name: 'Deletable' })];
    render(<TaskCards tasks={tasks} onDelete={onDelete} />);
    const card = screen.getByTestId('task-card');
    fireEvent.click(within(card).getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('task-4');
  });

  it('does not render Run/Delete when the handlers are omitted', () => {
    render(<TaskCards tasks={[makeTask({ id: '1', name: 'Plain' })]} />);
    expect(screen.queryByRole('button', { name: 'Run' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
