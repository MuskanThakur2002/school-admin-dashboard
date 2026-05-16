import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  pageSizeOptions?: number[];
  label?: string;
}

export function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  label,
}: PaginationProps) {
  if (total <= 0) return null;

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * limit + 1;
  const end = Math.min(total, safePage * limit);

  const canPrev = safePage > 1;
  const canNext = safePage < pageCount;

  const buttons = [
    { onClick: () => onPageChange(1), disabled: !canPrev, icon: ChevronsLeft, ariaLabel: 'First page' },
    { onClick: () => onPageChange(safePage - 1), disabled: !canPrev, icon: ChevronLeft, ariaLabel: 'Previous page' },
    { onClick: () => onPageChange(safePage + 1), disabled: !canNext, icon: ChevronRight, ariaLabel: 'Next page' },
    { onClick: () => onPageChange(pageCount), disabled: !canNext, icon: ChevronsRight, ariaLabel: 'Last page' },
  ];

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
      <div className="flex items-center gap-2">
        <label htmlFor="pagination-limit" className="text-[0.75rem] text-[var(--text-muted)]">
          Rows per page
        </label>
        <select
          id="pagination-limit"
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="bg-[var(--card-bg)] rounded-md px-2 py-1 text-[0.75rem] text-[var(--text-primary)] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <p className="text-[0.75rem] text-[var(--text-muted)]">
        Showing {start}–{end} of {total}{label ? ` ${label}` : ''}
      </p>

      <div className="flex items-center gap-0.5">
        {buttons.map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            disabled={btn.disabled}
            aria-label={btn.ariaLabel}
            className={cn(
              'p-1.5 rounded-lg text-[var(--text-tertiary)] transition-all',
              'hover:bg-[var(--border-subtle)] disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            )}
          >
            <btn.icon className="w-4 h-4" strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}
