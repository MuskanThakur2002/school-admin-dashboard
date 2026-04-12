import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5',
            'text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)]',
            'outline-none transition-all duration-200 font-body',
            'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
            'focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)]',
            error && 'shadow-[0_0_0_2px_rgba(239,68,68,0.2)]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-[0.6875rem] text-red-500 font-medium">{error}</p>}
        {hint && !error && <p className="text-[0.6875rem] text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
