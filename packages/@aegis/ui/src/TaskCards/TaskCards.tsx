import type { KeyboardEvent } from 'react';
import type { Task, TaskStatus } from '@aegis/shared';
import { Button } from '../Button';
import { Icon, taskStatusIcons } from '../icons';
import { useAppTranslation } from '../i18n';
import { formatDate } from '../i18n/format';

export interface TaskCardsProps {
  tasks: Task[];
  onRun?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onSelect?: (taskId: string) => void;
  selectedId?: string;
}

const STATUS_LABEL_KEYS = {
  idle: 'tasks.status.idle',
  running: 'tasks.status.running',
  completed: 'tasks.status.completed',
  failed: 'tasks.status.failed',
  paused: 'tasks.status.paused',
} as const;

const STATUS_CLASSES: Record<TaskStatus, string> = {
  idle: 'bg-surface-raised text-muted',
  running: 'bg-warning-surface text-warning-fg',
  completed: 'bg-success-surface text-success-fg',
  failed: 'bg-danger-surface text-danger-fg',
  paused: 'bg-surface-raised text-muted',
};

export function TaskCards({
  tasks,
  onRun,
  onDelete,
  onSelect,
  selectedId,
}: TaskCardsProps) {
  const { t, i18n } = useAppTranslation();

  if (tasks.length === 0) {
    return (
      <div
        data-testid="task-cards-empty"
        className="rounded-xl border border-border bg-surface p-8 text-center text-muted"
      >
        {t('tasks.empty')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => {
        const StatusIcon = taskStatusIcons[task.status];
        const interactive = typeof onSelect === 'function';
        const selected = selectedId === task.id;

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
          if (!interactive) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.(task.id);
          }
        };

        return (
          <div
            key={task.id}
            data-testid="task-card"
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? selected : undefined}
            onClick={interactive ? () => onSelect?.(task.id) : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
            className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 text-left transition-colors ${
              selected ? 'border-primary' : 'border-border'
            } ${interactive ? 'cursor-pointer hover:border-primary/50' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-fg">{task.name}</p>
              <Icon
                icon={StatusIcon}
                size={18}
                className={task.status === 'running' ? 'animate-spin' : undefined}
              />
            </div>

            <div className="flex items-center gap-2">
              <span
                data-testid="task-status"
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[task.status]}`}
              >
                {t(STATUS_LABEL_KEYS[task.status])}
              </span>
              <time className="text-xs text-muted" dateTime={task.updatedAt}>
                {formatDate(new Date(task.updatedAt), i18n.language)}
              </time>
            </div>

            {(onRun || onDelete) && (
              <div className="flex items-center gap-2">
                {onRun && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRun(task.id);
                    }}
                  >
                    {t('common.run')}
                  </Button>
                )}
                {onDelete && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
