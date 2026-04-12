import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  className?: string;
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-status-present', bg: 'bg-status-present/10' },
  down: { icon: TrendingDown, color: 'text-status-absent', bg: 'bg-status-absent/10' },
  neutral: { icon: Minus, color: 'text-on-surface-variant', bg: 'bg-surface-container-high' },
};

export function StatCard({ title, value, trend, trendValue, icon, className }: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-2xl shadow-card p-5 relative overflow-hidden group',
        'transition-all duration-200 hover:shadow-float',
        className,
      )}
    >
      {/* Subtle gradient accent at top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />

      <div className="flex items-start justify-between mb-3">
        <p className="text-body-sm text-on-surface-variant/70 font-medium uppercase tracking-wider">{title}</p>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/[0.07] flex items-center justify-center text-primary transition-colors group-hover:bg-primary/[0.12]">
            {icon}
          </div>
        )}
      </div>

      <p className="font-display text-display-sm text-on-surface tracking-tight leading-none">{value}</p>

      {trendInfo && trendValue && (
        <div className={cn('inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full text-label-sm font-medium', trendInfo.bg, trendInfo.color)}>
          <trendInfo.icon className="w-3 h-3" strokeWidth={2.5} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
}
