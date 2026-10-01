import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, handleError } from '@/services/api';
import { getSubscriptions, getSubscriptionStats } from '@/services/fees';
import { getStudents } from '@/services/students';
import { getRegularPlayers } from '@/services/players';
import { formatINR, formatDate } from '@/utils/format';
import type { Subscription } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { confirm } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import {
  Plus,
  RefreshCw,
  Pause,
  Play,
  Ban,
  IndianRupee,
  CalendarClock,
  AlertTriangle,
  TrendingDown,
  Users,
  FileText,
} from 'lucide-react';

const todayStr = (): string => new Date().toISOString().split('T')[0];

const computeEndDate = (startDate: string, billingCycle: string): string => {
  const d = new Date(startDate);
  if (billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (billingCycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

const SUB_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  paused: 'warning',
  cancelled: 'danger',
  expired: 'default',
};

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const typeLabel = (sub: Subscription): string => (sub.type === 'coaching' ? 'Coaching' : 'Regular');

const memberName = (sub: Subscription): string => {
  if (sub.student) return `${sub.student.firstName} ${sub.student.lastName}`.trim();
  if (sub.regularPlayer) return `${sub.regularPlayer.firstName} ${sub.regularPlayer.lastName}`.trim();
  return '—';
};

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    type: 'coaching',
    studentId: '',
    regularPlayerId: '',
    startDate: todayStr(),
    endDate: computeEndDate(todayStr(), 'monthly'),
    amount: '',
    discount: '0',
    billingCycle: 'monthly',
    endDateTouched: false,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions', page, typeFilter, statusFilter],
    queryFn: () =>
      getSubscriptions({
        page,
        limit: 15,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['subscriptions-stats'],
    queryFn: getSubscriptionStats,
  });

  const { data: studentData } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => getStudents({ limit: 500 }),
  });

  const { data: playerData } = useQuery({
    queryKey: ['regular-players', 'all'],
    queryFn: () => getRegularPlayers({ limit: 500 }),
  });

  const students = studentData?.items ?? [];
  const regularPlayers = playerData?.items ?? [];
  const subscriptions = data?.items ?? [];
  const pagination = data?.pagination;

  const stats = (statsData ?? {}) as Record<string, number>;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions-stats'] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await api.post('/subscriptions', payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Subscription added successfully');
      refresh();
      setShowAddModal(false);
      setForm({
        type: 'coaching',
        studentId: '',
        regularPlayerId: '',
        startDate: todayStr(),
        endDate: computeEndDate(todayStr(), 'monthly'),
        amount: '',
        discount: '0',
        billingCycle: 'monthly',
        endDateTouched: false,
      });
      setFormErrors({});
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/subscriptions/${id}/renew`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Subscription renewed successfully');
      refresh();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/subscriptions/${id}/pause`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Subscription paused');
      refresh();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/subscriptions/${id}/resume`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Subscription resumed');
      refresh();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.post(`/subscriptions/${id}/cancel`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Subscription cancelled');
      refresh();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleRenew = async (sub: Subscription) => {
    const newEnd = computeEndDate(sub.endDate, sub.billingCycle);
    const ok = await confirm({
      title: 'Renew Subscription',
      message: `Renew the ${typeLabel(sub).toLowerCase()} subscription for ${memberName(sub)}? The end date will be extended to ${formatDate(newEnd)}.`,
      confirmText: 'Renew',
    });
    if (ok) renewMutation.mutate(sub.id);
  };

  const handleCancel = async (sub: Subscription) => {
    const ok = await confirm({
      title: 'Cancel Subscription',
      message: `Cancel the ${typeLabel(sub).toLowerCase()} subscription for ${memberName(sub)}? This will stop future renewals.`,
      confirmText: 'Cancel Subscription',
    });
    if (ok) cancelMutation.mutate(sub.id);
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleBillingCycleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      billingCycle: value,
      endDate: prev.endDateTouched ? prev.endDate : computeEndDate(prev.startDate, value),
    }));
  };

  const handleStartDateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate: computeEndDate(value, prev.billingCycle),
      endDateTouched: false,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.type === 'coaching' && !form.studentId) errs.studentId = 'Required';
    if (form.type === 'regular' && !form.regularPlayerId) errs.regularPlayerId = 'Required';
    if (!form.startDate) errs.startDate = 'Required';
    if (!form.endDate) errs.endDate = 'Required';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    createMutation.mutate({
      type: form.type,
      studentId: form.type === 'coaching' ? Number(form.studentId) : undefined,
      regularPlayerId: form.type === 'regular' ? Number(form.regularPlayerId) : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      amount: Number(form.amount),
      discount: Number(form.discount || 0),
      billingCycle: form.billingCycle,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage coaching and regular membership subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Subscriptions' },
        ]}
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Active"
          value={stats.activeCount ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Renewals Due This Week"
          value={stats.renewalsDueThisWeek ?? 0}
          icon={<CalendarClock className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Expired"
          value={stats.expired ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="MRR"
          value={formatINR(stats.monthlyRecurringRevenue ?? 0)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Churned"
          value={stats.churned ?? 0}
          icon={<TrendingDown className="h-5 w-5" />}
          color="slate"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="coaching">Coaching</option>
            <option value="regular">Regular</option>
          </Select>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No subscriptions found"
          description="Add a new subscription or adjust your filters."
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Subscription
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{memberName(sub)}</span>
                        <Badge variant={sub.type === 'coaching' ? 'info' : 'success'}>{typeLabel(sub)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{BILLING_CYCLE_LABELS[sub.billingCycle] || sub.billingCycle}</TableCell>
                    <TableCell className="text-sm">{formatDate(sub.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(sub.endDate)}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatINR(sub.amount)}
                      {Number(sub.discount) > 0 && (
                        <div className="text-xs text-slate-500">-{formatINR(sub.discount)} disc</div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sub.billingCycle}</TableCell>
                    <TableCell>
                      <Badge variant={SUB_STATUS_BADGE[sub.paymentStatus] || 'default'}>
                        {sub.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {sub.paymentStatus !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Renew"
                            onClick={() => handleRenew(sub)}
                            loading={renewMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 text-indigo-600" />
                          </Button>
                        )}
                        {sub.paymentStatus === 'active' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Pause"
                            onClick={() => pauseMutation.mutate(sub.id)}
                            loading={pauseMutation.isPending}
                          >
                            <Pause className="h-4 w-4 text-amber-600" />
                          </Button>
                        ) : sub.paymentStatus === 'paused' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Resume"
                            onClick={() => resumeMutation.mutate(sub.id)}
                            loading={resumeMutation.isPending}
                          >
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                        ) : null}
                        {sub.paymentStatus !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancel"
                            onClick={() => handleCancel(sub)}
                            loading={cancelMutation.isPending}
                          >
                            <Ban className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagination && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                subscriptions
              </p>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Subscription"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Add Subscription
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Type" value={form.type} onChange={(e) => setField('type', e.target.value)}>
            <option value="coaching">Coaching</option>
            <option value="regular">Regular</option>
          </Select>
          {form.type === 'coaching' ? (
            <Select
              label="Student"
              value={form.studentId}
              onChange={(e) => setField('studentId', e.target.value)}
              error={formErrors.studentId}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNumber})
                </option>
              ))}
            </Select>
          ) : (
            <Select
              label="Regular Player"
              value={form.regularPlayerId}
              onChange={(e) => setField('regularPlayerId', e.target.value)}
              error={formErrors.regularPlayerId}
            >
              <option value="">Select player</option>
              {regularPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.playerId})
                </option>
              ))}
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              error={formErrors.startDate}
            />
            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => {
                setField('endDate', e.target.value);
                setForm((prev) => ({ ...prev, endDateTouched: true }));
              }}
              error={formErrors.endDate}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              error={formErrors.amount}
              placeholder="0"
            />
            <Input
              label="Discount"
              type="number"
              min={0}
              value={form.discount}
              onChange={(e) => setField('discount', e.target.value)}
            />
          </div>
          <Select
            label="Billing Cycle"
            value={form.billingCycle}
            onChange={(e) => handleBillingCycleChange(e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}