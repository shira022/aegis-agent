import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  className?: string;
}

export function Card({ children, title, actions, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
