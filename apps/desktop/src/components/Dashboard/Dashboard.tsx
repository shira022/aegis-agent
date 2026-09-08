import type { Task, OperationLog } from '@aegis/shared';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DashboardProps {
  tasks: Task[];
  recentActivity: OperationLog[];
  onNewTask: () => void;
  onRunAll: () => void;
}

export function Dashboard({ tasks, recentActivity, onNewTask, onRunAll }: DashboardProps) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const totalFinished = tasks.filter((t) => t.status === 'completed' || t.status === 'failed').length;
  const successRate = totalFinished > 0
    ? `${Math.round((completedCount / totalFinished) * 100)}%`
    : '—';
  const lastRun = tasks.length > 0
    ? new Date(Math.max(...tasks.map((t) => new Date(t.updatedAt).getTime())))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-100">ダッシュボード</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onNewTask}>
            + 新規タスク
          </Button>
          <Button variant="secondary" size="sm" onClick={onRunAll}>
            すべて実行
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-neutral-500 mb-1">タスク数</p>
          <p className="text-2xl font-bold text-neutral-100">{tasks.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">成功率</p>
          <p className="text-2xl font-bold text-neutral-100">{successRate}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">最終実行</p>
          <p className="text-sm text-neutral-200">
            {lastRun
              ? lastRun.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
        </Card>
      </div>

      {/* Running count */}
      {runningCount > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Badge variant="warning">実行中</Badge>
            <span className="text-2xl font-bold text-neutral-100">{runningCount}</span>
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-200 mb-3">最近のアクティビティ</h2>
        {recentActivity.length === 0 ? (
          <Card>
            <p className="text-sm text-neutral-400 text-center py-4">最近のアクティビティはありません</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <Card key={log.id}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{log.source}</Badge>
                    <span className="text-neutral-300">{log.steps.length} ステップ</span>
                  </div>
                  <time className="text-xs text-neutral-500">
                    {new Date(log.recordedAt).toLocaleString('ja-JP')}
                  </time>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
