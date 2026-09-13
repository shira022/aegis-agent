import type { RecorderSession, RecorderStatus } from '../../ipc';
import { Badge, Button, formatTime, useAppTranslation } from '@aegis/ui';

export interface RecorderProps {
  session: RecorderSession;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onScreenshot: () => void;
}

const STATUS_LABEL_KEYS = {
  idle: 'recorder.status.idle',
  recording: 'recorder.status.recording',
  paused: 'recorder.status.paused',
  stopped: 'recorder.status.stopped',
} as const;

const statusVariant: Record<
  RecorderStatus,
  'default' | 'success' | 'danger' | 'warning' | 'info'
> = {
  idle: 'default',
  recording: 'danger',
  paused: 'warning',
  stopped: 'info',
};

export function Recorder({
  session,
  onStart,
  onStop,
  onPause,
  onResume,
  onScreenshot,
}: RecorderProps) {
  const { t, i18n } = useAppTranslation();
  const { status } = session;

  const canStart = status === 'idle' || status === 'stopped';
  const canPause = status === 'recording';
  const canResume = status === 'paused';
  const canStop = status === 'recording' || status === 'paused';
  const canScreenshot = status !== 'idle';

  const formatTimestamp = (timestamp?: number): string =>
    timestamp === undefined ? '—' : formatTime(timestamp, i18n.language);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">{t('recorder.title')}</h2>
        <div className="flex items-center gap-2">
          {status === 'recording' && (
            <span
              data-testid="recording-indicator"
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-danger"
            />
          )}
          <Badge variant={statusVariant[status]}>{t(STATUS_LABEL_KEYS[status])}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={!canStart} onClick={onStart}>
          {t('recorder.start')}
        </Button>
        <Button variant="secondary" size="sm" disabled={!canPause} onClick={onPause}>
          {t('recorder.pause')}
        </Button>
        <Button variant="secondary" size="sm" disabled={!canResume} onClick={onResume}>
          {t('recorder.resume')}
        </Button>
        <Button variant="danger" size="sm" disabled={!canStop} onClick={onStop}>
          {t('recorder.stop')}
        </Button>
        <Button variant="ghost" size="sm" disabled={!canScreenshot} onClick={onScreenshot}>
          {t('recorder.screenshot')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">{t('recorder.started')}</p>
          <p data-testid="recorder-started" className="text-sm text-fg">
            {formatTimestamp(session.startedAt)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">{t('recorder.actions')}</p>
          <p data-testid="recorder-action-count" className="text-sm text-fg">
            {session.actions.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted">{t('recorder.screenshots')}</p>
          <p data-testid="recorder-screenshot-count" className="text-sm text-fg">
            {session.screenshots.length}
          </p>
        </div>
      </div>

      {session.screenshots.length > 0 && (
        <ul data-testid="recorder-screenshots" className="space-y-2">
          {session.screenshots.map((screenshot) => (
            <li
              key={screenshot.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="text-fg">{screenshot.label}</span>
              <time className="text-xs text-muted">
                {formatTimestamp(screenshot.capturedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
