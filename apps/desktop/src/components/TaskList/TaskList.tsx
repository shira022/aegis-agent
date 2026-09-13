import type { Task, TaskStatus } from '@aegis/shared';
import {
  Badge,
  Button,
  Card,
  Icon,
  formatDate,
  taskStatusIcons,
  useAppTranslation,
} from '@aegis/ui';

interface TaskListProps {
  tasks: Task[];
  onRun: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const statusVariant: Record<TaskStatus, 'default' | 'success' | 'danger' | 'warning'> = {
  idle: 'default',
  running: 'warning',
  completed: 'success',
  failed: 'danger',
  paused: 'default',
};

const STATUS_LABEL_KEYS = {
  idle: 'tasks.status.idle',
  running: 'tasks.status.running',
  completed: 'tasks.status.completed',
  failed: 'tasks.status.failed',
  paused: 'tasks.status.paused',
} as const;

export function TaskList({ tasks, onRun, onEdit, onDelete }: TaskListProps) {
  const { t, i18n } = useAppTranslation();

  if (tasks.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-fg">{t('tasks.title')}</h2>
        <Card className="text-center py-8">
          <p className="text-muted mb-3">{t('tasks.empty')}</p>
          <Button variant="primary" size="sm">
            {t('tasks.createFirst')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-fg">{t('tasks.title')}</h2>
      {tasks.map((task) => {
        const StatusIcon = taskStatusIcons[task.status];
        return (
          <Card key={task.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon
                  icon={StatusIcon}
                  size={18}
                  className={task.status === 'running' ? 'animate-spin text-warning' : 'text-muted'}
                />
                <div>
                  <p className="text-sm font-medium text-fg">{task.name}</p>
                  <p className="text-xs text-muted flex items-center gap-1">
                    <Badge variant={statusVariant[task.status]}>
                      {t(STATUS_LABEL_KEYS[task.status])}
                    </Badge>
                    {' · '}
                    <time>{formatDate(new Date(task.updatedAt), i18n.language)}</time>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => onRun(task.id)}>
                  {t('common.run')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(task.id)}>
                  {t('common.edit')}
                </Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(task.id)}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
