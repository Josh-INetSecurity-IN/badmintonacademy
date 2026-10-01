import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-primary text-white shadow-sm hover:bg-primary-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-primary-500',
  secondary:
    'border border-slate-200 bg-slate-50 text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] focus-visible:ring-slate-400',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] focus-visible:ring-slate-400',
  danger:
    'bg-destructive text-white shadow-sm hover:bg-red-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-red-500',
  success:
    'bg-success text-white shadow-sm hover:bg-green-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-green-500',
  accent:
    'bg-sport text-white shadow-sm hover:bg-sport-700 hover:shadow-md active:scale-[0.98] focus-visible:ring-green-500',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  link:
    'text-primary underline-offset-4 hover:underline focus-visible:ring-primary-400',
  default:
    'bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] focus-visible:ring-slate-500',
} as const;

const sizes = {
  xs: 'h-8 gap-1.5 px-2.5 text-xs',
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-8 w-8 p-0',
  'icon-lg': 'h-11 w-11 p-0',
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
