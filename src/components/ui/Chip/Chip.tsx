import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

type ChipVariant = 'present' | 'absent' | 'late' | 'info' | 'default';

interface ChipProps {
  variant?: ChipVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  present: 'bg-status-present/10 text-status-present',
  absent: 'bg-status-absent/10 text-status-absent',
  late: 'bg-status-late/10 text-status-late',
  info: 'bg-primary/8 text-primary',
  default: 'bg-surface-container-high/80 text-on-surface-variant',
};

export function Chip({ variant = 'default', children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-[3px] rounded-full text-[0.6875rem] font-semibold tracking-wide capitalize',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
