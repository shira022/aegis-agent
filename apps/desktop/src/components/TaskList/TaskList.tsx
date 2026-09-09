import type { Task } from '@aegis/shared';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface TaskListProps {
  tasks: Task[];
  onRun: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const statusIcons: Record<string, string> = {
  idle: '⏸',
  running: '▶',
  completed: '✓',
  failed: '✗',
  paused: '⏸',
};

const statusVariant: Record<string, 'default' | 'success' | 'danger' | 'warning'> = {
  idle: 'default',
  running: 'warning',
  completed: 'success',
  failed: 'danger',
  paused: 'default',
};

const statusLabel: Record<string, string> = {
  idle: 'Idle',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  paused: 'Paused',
};

export function TaskList({ tasks, onRun, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-100">Task List</h2>
        <Card className="text-center py-8">
          <p className="text-neutral-400 mb-3">No tasks yet</p>
          <Button variant="primary" size="sm">Create first task</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-100">Task List</h2>
      {tasks.map((task) => (
        <Card key={task.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">{statusIcons[task.status]}</span>
              <div>
                <p className="text-sm font-medium text-neutral-200">{task.name}</p>
                <p className="text-xs text-neutral-500">
                  <Badge variant={statusVariant[task.status]}>{statusLabel[task.status]}</Badge>
                  {' · '}
                  <time>{new Date(task.updatedAt).toLocaleString('en-US')}</time>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => onRun(task.id)}>
                Run
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(task.id)}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(task.id)}>
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
