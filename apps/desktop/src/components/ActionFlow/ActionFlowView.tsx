import type { OperationStep, OperationLog } from '@aegis/shared';
import { Button, Card, Timeline } from '@aegis/ui';

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
  if (steps.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-100">Action Flow</h2>
        <Card>
          <div className="space-y-4 py-4 text-center">
            <div className="space-y-1">
              <p className="text-sm text-neutral-200">No actions recorded yet.</p>
              <p className="text-sm text-neutral-400">
                Pick a recorded run from Recent Activity on the Dashboard, or run a task — its steps
                will appear here.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="primary" onClick={onRunIdleTasks}>
                Run idle tasks
              </Button>
              <Button variant="secondary" onClick={onGoToTasks}>
                Go to Tasks
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
            <p className="text-sm text-neutral-300">
              Viewing recorded run from {selectedLog.source} · {selectedLog.steps.length} step(s)
            </p>
            <Button variant="secondary" size="sm" onClick={onClearSelection}>
              Back to live run
            </Button>
          </div>
        </Card>
      )}
      <Timeline steps={steps} mode={mode} onToggleMode={onToggleMode} />
    </div>
  );
}
