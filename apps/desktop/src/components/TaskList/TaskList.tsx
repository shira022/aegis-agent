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
  idle: '待機中',
  running: '実行中',
  completed: '完了',
  failed: '失敗',
  paused: '一時停止',
};

export function TaskList({ tasks, onRun, onEdit, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-100">タスク一覧</h2>
        <Card className="text-center py-8">
          <p className="text-neutral-400 mb-3">タスクがありません</p>
          <Button variant="primary" size="sm">最初のタスクを作成</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-100">タスク一覧</h2>
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
                  <time>{new Date(task.updatedAt).toLocaleString('ja-JP')}</time>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => onRun(task.id)}>
                実行
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(task.id)}>
                編集
              </Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(task.id)}>
                削除
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
