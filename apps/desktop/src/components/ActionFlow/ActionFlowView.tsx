import type { OperationStep, OperationLog } from '@aegis/shared';
import { Button, Card, Timeline, useAppTranslation } from '@aegis/ui';

interface ActionFlowViewProps {
  steps: OperationStep[];
  mode: 'timeline' | 'flowchart';
  selectedLog: OperationLog | null;
  onToggleMode: () => void;
  onClearSelection: () => void;
  onRunIdleTasks: () => void;
  onGoToTasks: () => void;
}

export function ActionFlowView({
  steps,
  mode,
  selectedLog,
  onToggleMode,
  onClearSelection,
  onRunIdleTasks,
  onGoToTasks,
}: ActionFlowViewProps) {
  const { t } = useAppTranslation();

  if (steps.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-fg">{t('actionFlow.title')}</h2>
        <Card>
          <div className="space-y-4 py-4 text-center">
            <div className="space-y-1">
              <p className="text-sm text-fg">{t('actionFlow.emptyDescription')}</p>
              <p className="text-sm text-muted">{t('actionFlow.guidance')}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="primary" onClick={onRunIdleTasks}>
                {t('actionFlow.runIdle')}
              </Button>
              <Button variant="secondary" onClick={onGoToTasks}>
                {t('actionFlow.goToTasks')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedLog !== null && (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {t('actionFlow.viewing', {
                source: selectedLog.source,
                count: selectedLog.steps.length,
              })}
            </p>
            <Button variant="secondary" size="sm" onClick={onClearSelection}>
              {t('actionFlow.backToLive')}
            </Button>
          </div>
        </Card>
      )}
      <Timeline steps={steps} mode={mode} onToggleMode={onToggleMode} />
    </div>
  );
}
