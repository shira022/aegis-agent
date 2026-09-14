import { useEffect, useId, useRef, useState } from 'react';
import type { Task } from '@aegis/shared';
import { Button, Modal, useAppTranslation } from '@aegis/ui';
import type { UpdateTaskInput } from '../../ipc/types';

export const TASK_NAME_MAX_LENGTH = 80;

export interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onSave: (taskId: string, patch: UpdateTaskInput) => void;
  onClose: () => void;
}

export function TaskEditDialog({ task, open, onSave, onClose }: TaskEditDialogProps) {
  const { t } = useAppTranslation();
  const inputId = useId();
  const errorId = useId();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(task?.name ?? '');
    }
  }, [open, task]);

  const trimmedName = name.trim();
  const isEmpty = trimmedName.length === 0;
  const isTooLong = trimmedName.length > TASK_NAME_MAX_LENGTH;
  const invalid = isEmpty || isTooLong;

  const errorMessage = isEmpty
    ? t('tasks.edit.nameRequired')
    : isTooLong
      ? t('tasks.edit.nameTooLong', { max: TASK_NAME_MAX_LENGTH })
      : null;

  const handleSubmit = (): void => {
    if (invalid || task === null) {
      return;
    }
    onSave(task.id, { name: trimmedName });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('tasks.edit.title')}
      initialFocusRef={nameInputRef}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className="space-y-1">
          <label htmlFor={inputId} className="block text-sm font-medium text-fg">
            {t('tasks.edit.name')}
          </label>
          <input
            id={inputId}
            ref={nameInputRef}
            data-testid="task-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={errorMessage ? errorId : undefined}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errorMessage ? (
            <p id={errorId} role="alert" className="text-xs text-danger">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={invalid || task === null}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
