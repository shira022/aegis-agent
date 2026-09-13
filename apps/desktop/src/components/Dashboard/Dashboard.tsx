import type { Task, OperationLog } from '@aegis/shared';
import {
  Badge,
  Button,
  Card,
  ChevronRight,
  Icon,
  Plus,
  formatDate,
  useAppTranslation,
} from '@aegis/ui';

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
  const { t, i18n } = useAppTranslation();
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const runningCount = tasks.filter((task) => task.status === 'running').length;
  const totalFinished = tasks.filter(
    (task) => task.status === 'completed' || task.status === 'failed',
  ).length;
  const successRate =
    totalFinished > 0 ? `${Math.round((completedCount / totalFinished) * 100)}%` : '—';
  const lastRun =
    tasks.length > 0
      ? new Date(Math.max(...tasks.map((task) => new Date(task.updatedAt).getTime())))
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-fg">{t('dashboard.title')}</h2>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onNewTask}>
            <Icon icon={Plus} size={14} />
            {t('dashboard.newTask')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onRunAll}>
            {t('dashboard.runAll')}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-muted mb-1">{t('dashboard.stats.tasks')}</p>
          <p className="text-2xl font-bold text-fg">{tasks.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">{t('dashboard.stats.successRate')}</p>
          <p className="text-2xl font-bold text-fg">{successRate}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted mb-1">{t('dashboard.stats.lastRun')}</p>
          <p className="text-sm text-fg">
            {lastRun
              ? formatDate(lastRun, i18n.language, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </p>
        </Card>
      </div>

      {/* Running count */}
      {runningCount > 0 && (
        <Card>
          <div className="flex items-center gap-2">
            <Badge variant="warning">{t('dashboard.running')}</Badge>
            <span className="text-2xl font-bold text-fg">{runningCount}</span>
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-semibold text-fg mb-3">{t('dashboard.recentActivity')}</h2>
        {recentActivity.length === 0 ? (
          <Card>
            <p className="text-sm text-muted text-center py-4">
              {t('dashboard.noRecentActivity')}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <button
                key={log.id}
                type="button"
                aria-label={t('dashboard.viewActions', {
                  source: log.source,
                  count: log.steps.length,
                })}
                onClick={() => onSelectActivity(log.id)}
                className="block w-full text-left"
              >
                <Card className="transition-colors hover:border-primary">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{log.source}</Badge>
                      <span className="text-muted">
                        {t('dashboard.steps', { count: log.steps.length })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        {t('dashboard.viewActionsCta')}
                        <Icon icon={ChevronRight} size={14} />
                      </span>
                      <time className="text-xs text-muted">
                        {formatDate(new Date(log.recordedAt), i18n.language)}
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
