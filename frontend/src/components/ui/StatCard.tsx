import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

const colorMap = {
  blue: 'bg-primary-subtle text-primary-600',
  green: 'bg-success-subtle text-success-600',
  amber: 'bg-warning-subtle text-warning-600',
  red: 'bg-destructive-subtle text-destructive',
  slate: 'bg-slate-100 text-slate-600',
  purple: 'bg-info-subtle text-info-600',
  sport: 'bg-sport-50 text-sport-600',
} as const;

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: keyof typeof colorMap;
  hint?: string;
  link?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  hint,
  link,
  className,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        'group relative overflow-hidden p-5',
        link && 'card-hover cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 font-display text-2xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-semibold tabular-nums',
                trend.isPositive ? 'text-success-600' : 'text-destructive',
              )}
            >
              <span
                className={cn(
                  'inline-block transition-transform',
                  trend.isPositive ? '' : 'rotate-180',
                )}
                aria-hidden="true"
              >
                ▲
              </span>
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </p>
          )}
          {hint && !trend && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              'icon-tile h-10 w-10 transition-transform duration-200 group-hover:scale-105',
              colorMap[color],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
}
