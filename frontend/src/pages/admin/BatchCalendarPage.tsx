import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getBatchCalendar } from '@/services/batches';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const STATUS_COLORS: Record<string, string> = {
  active: 'border-l-blue-500 bg-blue-50',
  full: 'border-l-amber-500 bg-amber-50',
  completed: 'border-l-gray-400 bg-gray-50',
  inactive: 'border-l-gray-300 bg-gray-50',
};

export default function BatchCalendarPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['batch-calendar'],
    queryFn: getBatchCalendar,
  });

  const schedule: Record<string, any[]> = (data as Record<string, any[]>) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Calendar"
        actions={<Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d) => (
            <div key={d} className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[900px]">
            {DAYS.map((day, idx) => {
              const key = DAY_KEYS[idx];
              const dayBatches = schedule[key] ?? schedule[day] ?? schedule[day.toLowerCase()] ?? [];
              return (
                <div key={day} className="space-y-2">
                  <div className="text-center font-medium text-sm p-2 bg-muted rounded">{day.slice(0, 3)}</div>
                  {dayBatches.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center p-4 border rounded border-dashed">No batches</div>
                  ) : (
                    dayBatches.map((b: any, i: number) => {
                      const students = b.studentsCount ?? b._count?.students ?? 0;
                      const capacity = b.maxCapacity ?? 0;
                      const statusClass = STATUS_COLORS[b.status] ?? '';
                      return (
                        <div
                          key={b.id ?? i}
                          className={`p-2 rounded border-l-4 cursor-pointer hover:shadow-md transition-shadow text-xs ${statusClass}`}
                          onClick={() => navigate(`/admin/coaching-batches/${b.id}`)}
                        >
                          <div className="font-semibold truncate">{b.name}</div>
                          <div className="text-muted-foreground">{b.coach ? `${b.coach.firstName} ${b.coach.lastName}` : ''}</div>
                          <div className="text-muted-foreground">{b.court?.name ?? ''}</div>
                          <div>{b.startTime} - {b.endTime}</div>
                          <div>{students}/{capacity}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-medium">Legend:</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-l-4 border-l-blue-500 bg-blue-50" /> Active</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-l-4 border-l-amber-500 bg-amber-50" /> Full</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-l-4 border-l-gray-400 bg-gray-50" /> Completed</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border-l-4 border-l-gray-300 bg-gray-50" /> Inactive</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
