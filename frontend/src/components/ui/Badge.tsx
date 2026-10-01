import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-success-subtle text-success-700 ring-success-600/20',
  warning: 'bg-warning-subtle text-warning-700 ring-warning-600/20',
  danger: 'bg-destructive-subtle text-destructive-700 ring-destructive-600/20',
  info: 'bg-info-subtle text-info-700 ring-info-600/20',
  brand: 'bg-primary-subtle text-primary-700 ring-primary-600/20',
  accent: 'bg-sport-50 text-sport-700 ring-sport-600/20',
  outline: 'bg-transparent text-slate-600 ring-slate-300',
} as const;

export type BadgeVariant = keyof typeof variants;

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', children, className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5',
        'text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
