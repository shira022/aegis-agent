import { Icon, toastIcons, X, type ToastKind } from '../icons';
import { useAppTranslation } from '../i18n';

export interface ToastProps {
  message: string;
  type: ToastKind;
  onDismiss: () => void;
}

const typeClasses: Record<ToastKind, string> = {
  success: 'bg-success-surface border-success text-success-fg',
  error: 'bg-danger-surface border-danger text-danger-fg',
  info: 'bg-info-surface border-info text-info-fg',
};

const TYPE_LABEL_KEYS = {
  success: 'toast.success',
  error: 'toast.error',
  info: 'toast.info',
} as const;

export function Toast({ message, type, onDismiss }: ToastProps) {
  const { t } = useAppTranslation();

  return (
    <div
      role="alert"
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${typeClasses[type]}`}
    >
      <div className="flex items-center gap-2">
        <Icon icon={toastIcons[type]} size={16} label={t(TYPE_LABEL_KEYS[type])} />
        <span>{message}</span>
      </div>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onDismiss}
        className="ml-4 inline-flex h-6 w-6 items-center justify-center text-current opacity-60 hover:opacity-100"
      >
        <Icon icon={X} size={16} />
      </button>
    </div>
  );
}
