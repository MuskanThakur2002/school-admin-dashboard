import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'gradient-hero text-white font-semibold',
    'shadow-[0_2px_8px_rgba(0,44,152,0.3),_0_1px_2px_rgba(0,0,0,0.06)]',
    'hover:shadow-[0_4px_16px_rgba(0,44,152,0.35),_0_2px_4px_rgba(0,0,0,0.08)]',
    'hover:brightness-110 active:brightness-95',
  ].join(' '),
  secondary: 'bg-secondary-fixed text-on-secondary-fixed font-semibold hover:brightness-95 shadow-[0_1px_3px_rgba(0,105,112,0.15)]',
  tertiary: 'bg-transparent text-primary font-medium hover:bg-primary/[0.06] active:bg-primary/[0.1]',
  danger: 'bg-tertiary text-white font-semibold hover:brightness-110 shadow-[0_1px_3px_rgba(121,0,9,0.2)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-[7px] text-[0.8125rem] gap-1.5',
  md: 'px-5 py-[9px] text-[0.875rem] gap-2',
  lg: 'px-6 py-[11px] text-[0.9375rem] gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, loading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-[10px] font-display',
          'transition-all duration-150 ease-out cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
