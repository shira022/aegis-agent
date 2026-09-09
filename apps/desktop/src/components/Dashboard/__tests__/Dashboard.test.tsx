import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@aegis/shared';
import { Dashboard } from '../Dashboard';

const makeTask = (overrides: Partial<Task> & { id: string; name: string }): Task => ({
  status: 'idle',
  scriptPath: '',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('Dashboard', () => {
  const defaultProps = {
    onNewTask: vi.fn(),
    onRunAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────
  it('renders the dashboard title', () => {
    render(<Dashboard tasks={[]} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  // ── Stats cards ────────────────────────────────────────────────────
  it('displays task count', () => {
    const tasks = [
      makeTask({ id: '1', name: 'A' }),
      makeTask({ id: '2', name: 'B' }),
    ];
    render(<Dashboard tasks={tasks} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays success rate', () => {
    const tasks = [
      makeTask({ id: '1', name: 'A', status: 'completed' }),
      makeTask({ id: '2', name: 'B', status: 'failed' }),
    ];
    render(<Dashboard tasks={tasks} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows 100% success rate when all completed', () => {
    const tasks = [
      makeTask({ id: '1', name: 'A', status: 'completed' }),
      makeTask({ id: '2', name: 'B', status: 'completed' }),
    ];
    render(<Dashboard tasks={tasks} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows 0% success rate when none completed', () => {
    const tasks = [makeTask({ id: '1', name: 'A', status: 'failed' })];
    render(<Dashboard tasks={tasks} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows "—" for success rate when no tasks', () => {
    render(<Dashboard tasks={[]} recentActivity={[]} {...defaultProps} />);
    const successRateLabel = screen.getByText('Success Rate');
    const card = successRateLabel.closest('div')!;
    expect(within(card).getByText('—')).toBeInTheDocument();
  });

  it('displays last run time', () => {
    const tasks = [makeTask({ id: '1', name: 'A', updatedAt: '2025-06-15T10:30:00Z' })];
    render(<Dashboard tasks={tasks} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('Last Run')).toBeInTheDocument();
  });

  // ── Quick action buttons ───────────────────────────────────────────
  it('shows new task button', () => {
    render(<Dashboard tasks={[]} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /New Task/ })).toBeInTheDocument();
  });

  it('shows run all button', () => {
    render(<Dashboard tasks={[]} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Run All/ })).toBeInTheDocument();
  });

  it('calls onNewTask when new task button clicked', () => {
    const onNewTask = vi.fn();
    render(<Dashboard tasks={[]} recentActivity={[]} onNewTask={onNewTask} onRunAll={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /New Task/ }));
    expect(onNewTask).toHaveBeenCalledTimes(1);
  });

  it('calls onRunAll when run all button clicked', () => {
    const onRunAll = vi.fn();
    render(<Dashboard tasks={[]} recentActivity={[]} onNewTask={vi.fn()} onRunAll={onRunAll} />);
    fireEvent.click(screen.getByRole('button', { name: /Run All/ }));
    expect(onRunAll).toHaveBeenCalledTimes(1);
  });

  // ── Recent activity ────────────────────────────────────────────────
  it('shows empty activity message when no recent activity', () => {
    render(<Dashboard tasks={[]} recentActivity={[]} {...defaultProps} />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });

  it('shows recent activity count', () => {
    render(
      <Dashboard
        tasks={[]}
        recentActivity={[
          { id: '1', taskId: 't1', steps: [], recordedAt: '2025-01-01T00:00:00Z', source: 'browser' },
          { id: '2', taskId: 't2', steps: [], recordedAt: '2025-01-01T00:00:01Z', source: 'desktop' },
        ]}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  // ── Stats with running tasks ───────────────────────────────────────
  it('shows running task count', () => {
    const tasks = [
      makeTask({ id: '1', name: 'A', status: 'running' }),
      makeTask({ id: '2', name: 'B', status: 'running' }),
    ];
    render(<Dashboard tasks={tasks} recentActivity={[]} {...defaultProps} />);
    const runningLabel = screen.getByText('Running');
    const container = runningLabel.parentElement!;
    expect(within(container).getByText('2')).toBeInTheDocument();
  });
});
