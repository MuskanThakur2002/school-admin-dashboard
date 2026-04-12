import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-up">
      <div>
        <h1 className="font-display text-headline-md text-on-surface tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-body-md text-on-surface-variant/70 mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
