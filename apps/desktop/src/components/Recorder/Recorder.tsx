import type { RecorderSession, RecorderStatus } from '../../ipc';
import { Badge, Button } from '@aegis/ui';

export interface RecorderProps {
  session: RecorderSession;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onScreenshot: () => void;
}

const statusLabels: Record<RecorderStatus, string> = {
  idle: 'Idle',
  recording: 'Recording',
  paused: 'Paused',
  stopped: 'Stopped',
};

const statusVariant: Record<
  RecorderStatus,
  'default' | 'success' | 'danger' | 'warning' | 'info'
> = {
  idle: 'default',
  recording: 'danger',
  paused: 'warning',
  stopped: 'info',
};

function formatTime(timestamp?: number): string {
  if (timestamp === undefined) {
    return '—';
  }
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function Recorder({
  session,
  onStart,
  onStop,
  onPause,
  onResume,
  onScreenshot,
}: RecorderProps) {
  const { status } = session;

  const canStart = status === 'idle' || status === 'stopped';
  const canPause = status === 'recording';
  const canResume = status === 'paused';
  const canStop = status === 'recording' || status === 'paused';
  const canScreenshot = status !== 'idle';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Recorder</h2>
        <div className="flex items-center gap-2">
          {status === 'recording' && (
            <span
              data-testid="recording-indicator"
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"
            />
          )}
          <Badge variant={statusVariant[status]}>{statusLabels[status]}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={!canStart} onClick={onStart}>
          Start
        </Button>
        <Button variant="secondary" size="sm" disabled={!canPause} onClick={onPause}>
          Pause
        </Button>
        <Button variant="secondary" size="sm" disabled={!canResume} onClick={onResume}>
          Resume
        </Button>
        <Button variant="danger" size="sm" disabled={!canStop} onClick={onStop}>
          Stop
        </Button>
        <Button variant="ghost" size="sm" disabled={!canScreenshot} onClick={onScreenshot}>
          Screenshot
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          <p className="text-xs text-neutral-500">Started</p>
          <p data-testid="recorder-started" className="text-sm text-neutral-200">
            {formatTime(session.startedAt)}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          <p className="text-xs text-neutral-500">Actions</p>
          <p data-testid="recorder-action-count" className="text-sm text-neutral-200">
            {session.actions.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          <p className="text-xs text-neutral-500">Screenshots</p>
          <p data-testid="recorder-screenshot-count" className="text-sm text-neutral-200">
            {session.screenshots.length}
          </p>
        </div>
      </div>

      {session.screenshots.length > 0 && (
        <ul data-testid="recorder-screenshots" className="space-y-2">
          {session.screenshots.map((screenshot) => (
            <li
              key={screenshot.id}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <span className="text-neutral-200">{screenshot.label}</span>
              <time className="text-xs text-neutral-500">
                {formatTime(screenshot.capturedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
