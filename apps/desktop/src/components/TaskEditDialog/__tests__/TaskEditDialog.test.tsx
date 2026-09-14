import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Task } from '@aegis/shared';
import { TaskEditDialog, TASK_NAME_MAX_LENGTH } from '../TaskEditDialog';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  name: 'Invoice Download',
  status: 'idle',
  scriptPath: '/scripts/invoice-download.ts',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

function renderDialog(task: Task = makeTask(), onSave = vi.fn(), onClose = vi.fn()) {
  const utils = render(
    <TaskEditDialog task={task} open onSave={onSave} onClose={onClose} />,
  );
  return { ...utils, onSave, onClose };
}

describe('TaskEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens pre-filled with the task name', () => {
    renderDialog(makeTask({ name: 'CRM Contact Sync' }));

    expect(screen.getByTestId('task-name-input')).toHaveValue('CRM Contact Sync');
    expect(screen.getByRole('heading', { name: 'Edit Task' })).toBeInTheDocument();
  });

  it('exposes dialog semantics and focuses the name field on open', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Edit Task');
    expect(screen.getByTestId('task-name-input')).toHaveFocus();
  });

  it('blocks an empty name and shows an inline error', () => {
    renderDialog();
    const save = screen.getByRole('button', { name: 'Save' });

    fireEvent.change(screen.getByTestId('task-name-input'), { target: { value: '' } });
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('blocks a whitespace-only name', () => {
    renderDialog();
    const save = screen.getByRole('button', { name: 'Save' });

    fireEvent.change(screen.getByTestId('task-name-input'), { target: { value: '   ' } });
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('blocks a name over the maximum length', () => {
    renderDialog();
    const save = screen.getByRole('button', { name: 'Save' });

    fireEvent.change(screen.getByTestId('task-name-input'), {
      target: { value: 'a'.repeat(TASK_NAME_MAX_LENGTH + 1) },
    });

    expect(
      screen.getByText(`Name must be ${TASK_NAME_MAX_LENGTH} characters or fewer`),
    ).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it('saves the trimmed name through onSave', () => {
    const { onSave } = renderDialog(makeTask({ id: 'task-42' }));

    fireEvent.change(screen.getByTestId('task-name-input'), {
      target: { value: '  Invoice Archive  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('task-42', { name: 'Invoice Archive' });
  });

  it('discards the change on Cancel', () => {
    const { onSave, onClose } = renderDialog();

    fireEvent.change(screen.getByTestId('task-name-input'), {
      target: { value: 'Discarded' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('discards the change on Escape', () => {
    const { onSave, onClose } = renderDialog();

    fireEvent.change(screen.getByTestId('task-name-input'), {
      target: { value: 'Discarded' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('re-seeds the field from the task when reopened', () => {
    const task = makeTask({ name: 'Original' });
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <TaskEditDialog task={task} open onSave={onSave} onClose={onClose} />,
    );

    fireEvent.change(screen.getByTestId('task-name-input'), {
      target: { value: 'Edited but not saved' },
    });

    rerender(<TaskEditDialog task={task} open={false} onSave={onSave} onClose={onClose} />);
    rerender(<TaskEditDialog task={task} open onSave={onSave} onClose={onClose} />);

    expect(screen.getByTestId('task-name-input')).toHaveValue('Original');
  });
});
