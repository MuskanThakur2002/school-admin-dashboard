import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-status-present/10 text-status-present',
  danger: 'bg-status-absent/10 text-status-absent',
  warning: 'bg-status-late/10 text-status-late',
  default: 'bg-surface-container-high text-on-surface-variant',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
