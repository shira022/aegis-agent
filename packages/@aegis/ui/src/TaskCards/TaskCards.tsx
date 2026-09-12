import type { KeyboardEvent } from 'react';
import type { Task, TaskStatus } from '@aegis/shared';

export interface TaskCardsProps {
  tasks: Task[];
  onRun?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onSelect?: (taskId: string) => void;
  selectedId?: string;
}

interface StatusMeta {
  label: string;
  icon: string;
  className: string;
}

const statusMeta: Record<TaskStatus, StatusMeta> = {
  idle: { label: 'Idle', icon: '⏸', className: 'bg-neutral-700 text-neutral-200' },
  running: { label: 'Running', icon: '▶', className: 'bg-yellow-800 text-yellow-100' },
  completed: { label: 'Completed', icon: '✓', className: 'bg-green-800 text-green-100' },
  failed: { label: 'Failed', icon: '✗', className: 'bg-red-800 text-red-100' },
  paused: { label: 'Paused', icon: '⏸', className: 'bg-neutral-700 text-neutral-200' },
};

function statusFor(status: TaskStatus): StatusMeta {
  return statusMeta[status];
}

export function TaskCards({
  tasks,
  onRun,
  onDelete,
  onSelect,
  selectedId,
}: TaskCardsProps) {
  if (tasks.length === 0) {
    return (
      <div
        data-testid="task-cards-empty"
        className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400"
      >
        No tasks yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => {
        const status = statusFor(task.status);
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
            className={`flex flex-col gap-3 rounded-xl border bg-neutral-900 p-4 text-left transition-colors ${
              selected ? 'border-indigo-500' : 'border-neutral-800'
            } ${interactive ? 'cursor-pointer hover:border-neutral-600' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-neutral-100">{task.name}</p>
              <span className="text-lg" aria-hidden="true">
                {status.icon}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                data-testid="task-status"
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
              >
                {status.label}
              </span>
              <time className="text-xs text-neutral-500" dateTime={task.updatedAt}>
                {new Date(task.updatedAt).toLocaleString('en-US')}
              </time>
            </div>

            {(onRun || onDelete) && (
              <div className="flex items-center gap-2">
                {onRun && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRun(task.id);
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Run
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
