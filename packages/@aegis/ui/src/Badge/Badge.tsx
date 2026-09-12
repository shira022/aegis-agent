import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-neutral-700 text-neutral-200',
  success: 'bg-green-800 text-green-100',
  warning: 'bg-yellow-800 text-yellow-100',
  danger: 'bg-red-800 text-red-100',
  info: 'bg-blue-800 text-blue-100',
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
