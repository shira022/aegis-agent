interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const typeClasses: Record<string, string> = {
  success: 'bg-green-900 border-green-700 text-green-100',
  error: 'bg-red-900 border-red-700 text-red-100',
  info: 'bg-blue-900 border-blue-700 text-blue-100',
};

const typeIcons: Record<string, string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
};

export function Toast({ message, type, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${typeClasses[type]}`}
    >
      <div className="flex items-center gap-2">
        <span>{typeIcons[type]}</span>
        <span>{message}</span>
      </div>
      <button
        aria-label="閉じる"
        onClick={onDismiss}
        className="ml-4 text-current opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}
