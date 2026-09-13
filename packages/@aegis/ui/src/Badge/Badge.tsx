import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-surface-raised text-fg',
  success: 'bg-success-surface text-success-fg',
  warning: 'bg-warning-surface text-warning-fg',
  danger: 'bg-danger-surface text-danger-fg',
  info: 'bg-info-surface text-info-fg',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
