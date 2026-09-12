import type { HealingEvent, HealingEventType } from '../../ipc';

export interface HealingNotifierProps {
  events: HealingEvent[];
  onDismiss: (eventId: string) => void;
  onDismissAll?: () => void;
}

interface HealingMeta {
  icon: string;
  className: string;
  label: string;
}

const healingMeta: Record<HealingEventType, HealingMeta> = {
  error: { icon: '✕', className: 'bg-red-900 border-red-700 text-red-100', label: 'Error' },
  healing: { icon: '🛠', className: 'bg-amber-900 border-amber-700 text-amber-100', label: 'Healing' },
  healed: { icon: '✓', className: 'bg-green-900 border-green-700 text-green-100', label: 'Healed' },
  failed: { icon: '✗', className: 'bg-red-950 border-red-700 text-red-100', label: 'Failed' },
  fallback: {
    icon: '↩',
    className: 'bg-neutral-800 border-neutral-600 text-neutral-200',
    label: 'Fallback',
  },
};

export function HealingNotifier({ events, onDismiss, onDismissAll }: HealingNotifierProps) {
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
            className="rounded-md bg-neutral-700 px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-neutral-600"
          >
            Dismiss all
          </button>
        </div>
      )}

      {events.map((event) => {
        const meta = healingMeta[event.type];
        return (
          <div
            key={event.id}
            data-testid="healing-event"
            data-type={event.type}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 shadow-lg ${meta.className}`}
          >
            <span data-testid="healing-icon" aria-hidden="true" className="text-base leading-5">
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{meta.label}</p>
              <p className="text-xs break-words">{event.message}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
                {event.taskId}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Dismiss ${event.message}`}
              onClick={() => onDismiss(event.id)}
              className="text-current opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
