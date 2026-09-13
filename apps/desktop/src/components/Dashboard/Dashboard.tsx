import type { Task, OperationLog } from '@aegis/shared';
import { Button, Card, Badge } from '@aegis/ui';

interface DashboardProps {
  tasks: Task[];
  recentActivity: OperationLog[];
  onNewTask: () => void;
  onRunAll: () => void;
  onSelectActivity: (logId: string) => void;
}

export function Dashboard({
  tasks,
  recentActivity,
  onNewTask,
  onRunAll,
  onSelectActivity,
}: DashboardProps) {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-100">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onNewTask}>
            + New Task
          </Button>
          <Button variant="secondary" size="sm" onClick={onRunAll}>
            Run All
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Tasks</p>
          <p className="text-2xl font-bold text-neutral-100">{tasks.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-neutral-100">{successRate}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500 mb-1">Last Run</p>
          <p className="text-sm text-neutral-200">
            {lastRun
              ? lastRun.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'}
          </p>
        </Card>
      </div>

      {/* Running count */}
      {runningCount > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Running</Badge>
            <span className="text-2xl font-bold text-neutral-100">{runningCount}</span>
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-200 mb-3">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <Card>
            <p className="text-sm text-neutral-400 text-center py-4">No recent activity</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <button
                key={log.id}
                type="button"
                aria-label={`View actions for ${log.source} run (${log.steps.length} steps)`}
                onClick={() => onSelectActivity(log.id)}
                className="block w-full text-left"
              >
                <Card className="transition-colors hover:border-indigo-500">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{log.source}</Badge>
                      <span className="text-neutral-300">{log.steps.length} step(s)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-indigo-400">View actions →</span>
                      <time className="text-xs text-neutral-500">
                        {new Date(log.recordedAt).toLocaleString('en-US')}
                      </time>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
