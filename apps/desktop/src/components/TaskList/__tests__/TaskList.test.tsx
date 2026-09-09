import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@aegis/shared';
import { TaskList } from '../TaskList';

const makeTask = (overrides: Partial<Task> & { id: string; name: string }): Task => ({
  status: 'idle',
  scriptPath: '',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('TaskList', () => {
  const defaultProps = {
    onRun: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────
  it('renders the section title', () => {
    render(<TaskList tasks={[]} {...defaultProps} />);
    expect(screen.getByText('Task List')).toBeInTheDocument();
  });

  it('renders task names', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', name: 'Login Automation' }),
      makeTask({ id: '2', name: 'Data Fetch' }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText('Login Automation')).toBeInTheDocument();
    expect(screen.getByText('Data Fetch')).toBeInTheDocument();
  });

  // ── Status icons ───────────────────────────────────────────────────
  it('shows ⏸ icon for idle tasks', () => {
    const tasks = [makeTask({ id: '1', name: 'Test', status: 'idle' })];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText('⏸')).toBeInTheDocument();
  });

  it('shows ▶ icon for running tasks', () => {
    const tasks = [makeTask({ id: '1', name: 'Test', status: 'running' })];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('shows ✓ icon for completed tasks', () => {
    const tasks = [makeTask({ id: '1', name: 'Test', status: 'completed' })];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows ✗ icon for failed tasks', () => {
    const tasks = [makeTask({ id: '1', name: 'Test', status: 'failed' })];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  // ── Action buttons ─────────────────────────────────────────────────
  it('shows run button for each task', () => {
    const tasks = [makeTask({ id: '1', name: 'Test' })];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Run/ })).toBeInTheDocument();
  });

  it('calls onRun with task id when run button clicked', () => {
    const onRun = vi.fn();
    const tasks = [makeTask({ id: '1', name: 'Test' })];
    render(<TaskList tasks={tasks} onRun={onRun} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Run/ }));
    expect(onRun).toHaveBeenCalledWith('1');
  });

  it('calls onEdit with task id when edit button clicked', () => {
    const onEdit = vi.fn();
    const tasks = [makeTask({ id: '1', name: 'Test' })];
    render(<TaskList tasks={tasks} onRun={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('calls onDelete with task id when delete button clicked', () => {
    const onDelete = vi.fn();
    const tasks = [makeTask({ id: '1', name: 'Test' })];
    render(<TaskList tasks={tasks} onRun={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  // ── Empty state ────────────────────────────────────────────────────
  it('shows empty state when no tasks', () => {
    render(<TaskList tasks={[]} {...defaultProps} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('shows CTA in empty state', () => {
    render(<TaskList tasks={[]} {...defaultProps} />);
    expect(screen.getByText('Create first task')).toBeInTheDocument();
  });

  // ── Last run time ──────────────────────────────────────────────────
  it('displays updatedAt for each task', () => {
    const tasks = [makeTask({ id: '1', name: 'Test', updatedAt: '2025-06-15T10:30:00Z' })];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  // ── Multiple tasks ─────────────────────────────────────────────────
  it('renders multiple task cards', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', name: 'Task A' }),
      makeTask({ id: '2', name: 'Task B' }),
      makeTask({ id: '3', name: 'Task C' }),
    ];
    render(<TaskList tasks={tasks} {...defaultProps} />);
    const runButtons = screen.getAllByRole('button', { name: /Run/ });
    expect(runButtons).toHaveLength(3);
  });
});
