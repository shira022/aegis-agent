import type { HealingEvent, HealingEventType } from '../../ipc';
import { Icon, healingIcons, useAppTranslation, X } from '@aegis/ui';

export interface HealingNotifierProps {
  events: HealingEvent[];
  onDismiss: (eventId: string) => void;
  onDismissAll?: () => void;
}

const HEALING_LABEL_KEYS = {
  error: 'healing.error',
  healing: 'healing.healing',
  healed: 'healing.healed',
  failed: 'healing.failed',
  fallback: 'healing.fallback',
} as const;

const HEALING_CLASSES: Record<HealingEventType, string> = {
  error: 'bg-danger-surface border-danger text-danger-fg',
  healing: 'bg-warning-surface border-warning text-warning-fg',
  healed: 'bg-success-surface border-success text-success-fg',
  failed: 'bg-danger-surface border-danger text-danger-fg',
  fallback: 'bg-surface-raised border-border text-fg',
};

export function HealingNotifier({ events, onDismiss, onDismissAll }: HealingNotifierProps) {
  const { t } = useAppTranslation();

  if (events.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="healing-notifier"
      className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
    >
      {events.length > 1 && onDismissAll && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDismissAll}
            className="rounded-md bg-surface-raised px-3 py-1 text-xs font-medium text-fg transition-colors hover:bg-border"
          >
            {t('healing.dismissAll')}
          </button>
        </div>
      )}

      {events.map((event) => {
        const message = t(event.messageKey, event.messageParams);
        return (
          <div
            key={event.id}
            data-testid="healing-event"
            data-type={event.type}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 shadow-lg ${HEALING_CLASSES[event.type]}`}
          >
            <span data-testid="healing-icon" className="pt-0.5">
              <Icon
                icon={healingIcons[event.type]}
                size={16}
                label={t(HEALING_LABEL_KEYS[event.type])}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(HEALING_LABEL_KEYS[event.type])}</p>
              <p className="text-xs break-words">{message}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide opacity-70">{event.taskId}</p>
            </div>
            <button
              type="button"
              aria-label={t('healing.dismiss', { message })}
              onClick={() => onDismiss(event.id)}
              className="inline-flex h-6 w-6 items-center justify-center text-current opacity-60 hover:opacity-100"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
