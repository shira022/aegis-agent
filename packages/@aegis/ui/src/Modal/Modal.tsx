import type { ReactNode } from 'react';
import { useEffect, useCallback, useId, useRef } from 'react';
import { Icon, X } from '../icons';
import { useAppTranslation } from '../i18n';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const { t } = useAppTranslation();
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = getFocusableElements(panel);
      const first = focusables[0] ?? closeButtonRef.current;
      const last = focusables[focusables.length - 1] ?? closeButtonRef.current;
      if (!first || !last) return;
      const active =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const focusInside = active !== null && panel.contains(active);
      if (e.shiftKey) {
        if (!focusInside || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!focusInside || active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = getFocusableElements(panelRef.current);
    const target = focusables[0] ?? closeButtonRef.current;
    target?.focus();
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const hasTitle = typeof title === 'string' && title.length > 0;

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasTitle ? headingId : undefined}
        aria-label={hasTitle ? undefined : t('common.dialog')}
        className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {hasTitle ? (
            <h2 id={headingId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
          ) : null}
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-fg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Icon icon={X} size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
