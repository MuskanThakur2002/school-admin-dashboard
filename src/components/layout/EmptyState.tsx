import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/40 mb-4">
        {icon}
      </div>
      <h3 className="font-display text-title-lg text-on-surface mb-1">{title}</h3>
      {description && <p className="text-body-md text-on-surface-variant max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}
