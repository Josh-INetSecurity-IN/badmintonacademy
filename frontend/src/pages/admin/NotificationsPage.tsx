import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { formatDateTime } from '@/utils/format';
import { getNotifications, markRead, markAllRead } from '@/services/notifications';
import type { Notification, PaginatedData } from '@/types';

const typeVariant: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  payment: 'success',
  enquiry: 'info',
  attendance: 'warning',
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const params: Record<string, unknown> = { page, limit: 20 };
  if (unreadOnly) params.unreadOnly = true;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => getNotifications(params),
  });

  const markReadMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
    onError: (e) => toast.error(handleError(e)),
  });

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="View and manage notifications"
        actions={
          <Button
            variant="outline"
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            Mark All Read
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-slate-300"
          />
          Unread only
        </label>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} columns={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={unreadOnly ? 'You have no unread notifications' : 'No notifications yet'}
        />
      ) : (
        <div className="space-y-2">
          {items.map((n: Notification) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) markReadMutation.mutate(n.id);
              }}
              className={`flex items-start gap-4 rounded-lg border px-4 py-3 transition-colors ${
                n.isRead
                  ? 'border-slate-200 bg-white'
                  : 'border-indigo-200 bg-indigo-50 cursor-pointer hover:bg-indigo-100'
              }`}
            >
              {!n.isRead && (
                <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-indigo-500" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${n.isRead ? 'font-normal text-slate-700' : 'font-semibold text-slate-900'}`}>
                    {n.title}
                  </p>
                  <Badge variant={typeVariant[n.type] ?? 'default'}>{n.type}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500 truncate">{n.message}</p>
              </div>
              <span className="flex-shrink-0 text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
