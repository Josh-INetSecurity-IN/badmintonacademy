import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: { value: string; label: string; content: ReactNode; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const activeTab = tabs.find((t) => t.value === value);

  return (
    <div className={className}>
      <div
        className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto border-b border-slate-200"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5',
                'text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'border-primary text-primary-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-2xs font-semibold tabular-nums',
                    isActive ? 'bg-primary-subtle text-primary-700' : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="animate-fade-in pt-5">{activeTab?.content}</div>
    </div>
  );
}
