import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import {
  getRegularPlayers,
  createRegularPlayer,
  pausePlayer,
  resumePlayer,
  renewPlayer,
  getExpiredPlayers,
} from '@/services/players';
import { formatINR, formatDate, getInitials, buildWhatsAppLink, downloadCSV } from '@/utils/format';
import type { RegularPlayer, RegularPlayerAssignment } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Plus,
  Download,
  Search,
  Eye,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  AlertTriangle,
  Users,
} from 'lucide-react';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  payment_due: 'warning',
  overdue: 'danger',
  expired: 'danger',
  paused: 'info',
  cancelled: 'default',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'payment_due', label: 'Payment Due' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'expired', label: 'Expired' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  emergencyContact: '',
  joiningDate: new Date().toISOString().split('T')[0],
  monthlyFee: '',
  securityDeposit: '',
  paymentFrequency: 'monthly',
  status: 'active',
};

function parseDays(daysOfWeek: string | string[] | undefined): string[] {
  if (!daysOfWeek) return [];
  if (Array.isArray(daysOfWeek)) return daysOfWeek;
  try {
    const parsed = JSON.parse(daysOfWeek);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return daysOfWeek.split(',').map((d) => d.trim()).filter(Boolean);
  }
}

function getPrimaryAssignment(player: RegularPlayer): RegularPlayerAssignment | null {
  if (!player.assignments || player.assignments.length === 0) return null;
  const active = player.assignments.find((a) => a.status === 'active');
  return active || player.assignments[0];
}

export default function RegularPlayersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, showExpired]);

  const { data, isLoading } = useQuery({
    queryKey: ['regular-players', page, search, statusFilter],
    queryFn: () =>
      getRegularPlayers({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    enabled: !showExpired,
  });

  const { data: expiredPlayers, isLoading: expiredLoading } = useQuery({
    queryKey: ['regular-players', 'expired'],
    queryFn: getExpiredPlayers,
    enabled: showExpired,
  });

  const createMutation = useMutation({
    mutationFn: (formData: typeof EMPTY_FORM) =>
      createRegularPlayer({
        ...formData,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : 0,
        securityDeposit: formData.securityDeposit ? Number(formData.securityDeposit) : 0,
      }),
    onSuccess: () => {
      toast.success('Player added successfully');
      queryClient.invalidateQueries({ queryKey: ['regular-players'] });
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: pausePlayer,
    onSuccess: () => {
      toast.success('Player paused');
      queryClient.invalidateQueries({ queryKey: ['regular-players'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: resumePlayer,
    onSuccess: () => {
      toast.success('Player resumed');
      queryClient.invalidateQueries({ queryKey: ['regular-players'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const renewMutation = useMutation({
    mutationFn: renewPlayer,
    onSuccess: () => {
      toast.success('Player renewed');
      queryClient.invalidateQueries({ queryKey: ['regular-players'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (!form.phone.trim()) errs.phone = 'Required';
    if (!form.joiningDate) errs.joiningDate = 'Required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate(form);
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const all: RegularPlayer[] = [];
      let currentPage = 1;
      let total = Infinity;
      while (all.length < total) {
        const res = await getRegularPlayers({ page: currentPage, limit: 500 });
        all.push(...res.items);
        total = res.pagination.total;
        if (res.items.length === 0) break;
        currentPage += 1;
      }
      downloadCSV(
        'regular-players.csv',
        ['Player ID', 'Name', 'Phone', 'WhatsApp', 'Email', 'Monthly Fee', 'Next Payment Due', 'Status'],
        all.map((p) => [
          p.playerId,
          `${p.firstName} ${p.lastName}`,
          p.phone,
          p.whatsappNumber || '',
          p.email || '',
          p.monthlyFee,
          p.nextPaymentDue || '',
          p.status,
        ]),
      );
      toast.success(`Exported ${all.length} players`);
    } catch (err) {
      toast.error(handleError(err));
    } finally {
      setExporting(false);
    }
  };

  const getReminderMessage = (p: RegularPlayer): string =>
    `Hello ${p.firstName} ${p.lastName}, this is a reminder from Badminton Academy that your monthly fee of ${formatINR(
      p.monthlyFee,
    )} is due on ${formatDate(p.nextPaymentDue)}. Kindly make the payment at your convenience. Thank you.`;

  const players = showExpired ? (expiredPlayers ?? []) : (data?.items ?? []);
  const pagination = showExpired ? undefined : data?.pagination;
  const loading = showExpired ? expiredLoading : isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regular Players"
        description="Manage regular players, subscriptions, batches and payments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Regular Players' },
        ]}
        actions={
          <>
            <Button
              variant={showExpired ? 'primary' : 'outline'}
              onClick={() => setShowExpired((v) => !v)}
            >
              <AlertTriangle className="h-4 w-4" />
              {showExpired ? 'Show All' : 'View Expired'}
            </Button>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Player
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, phone, player id..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : players.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={showExpired ? 'No expired players' : 'No players found'}
          description={
            showExpired
              ? 'All regular player subscriptions are currently active.'
              : 'Add your first regular player or adjust your filters.'
          }
          action={
            !showExpired ? (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4" />
                Add Player
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Next Payment Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((p) => {
                  const assignment = getPrimaryAssignment(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {p.photo ? (
                            <img
                              src={p.photo}
                              alt={`${p.firstName} ${p.lastName}`}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                              {getInitials(`${p.firstName} ${p.lastName}`)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {p.firstName} {p.lastName}
                            </div>
                            <div className="text-xs text-slate-500">{p.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment?.batch ? assignment.batch.name : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignment?.batch
                          ? `${parseDays(assignment.batch.daysOfWeek)
                              .map((d) => d.slice(0, 3))
                              .join(', ')} • ${assignment.batch.startTime}-${assignment.batch.endTime}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{formatINR(p.monthlyFee)}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.nextPaymentDue)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[p.status] || 'default'}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/regular-players/${p.id}`}>
                            <Button variant="ghost" size="icon" title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {p.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Pause"
                              onClick={() => pauseMutation.mutate(p.id)}
                              loading={pauseMutation.isPending}
                            >
                              <Pause className="h-4 w-4 text-slate-500" />
                            </Button>
                          )}
                          {p.status === 'paused' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Resume"
                              onClick={() => resumeMutation.mutate(p.id)}
                              loading={resumeMutation.isPending}
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {(p.status === 'expired' || p.status === 'payment_due') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Renew"
                              onClick={() => renewMutation.mutate(p.id)}
                              loading={renewMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          <a
                            href={buildWhatsAppLink(p.whatsappNumber || p.phone, getReminderMessage(p))}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" title="WhatsApp reminder">
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {pagination && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                players
              </p>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <Modal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setForm(EMPTY_FORM);
          setFormErrors({});
        }}
        title="Add New Player"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false);
                setForm(EMPTY_FORM);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={createMutation.isPending}>
              Add Player
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              error={formErrors.firstName}
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              error={formErrors.lastName}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={formErrors.phone}
            />
            <Input
              label="WhatsApp Number"
              value={form.whatsappNumber}
              onChange={(e) => setField('whatsappNumber', e.target.value)}
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
          />
          <Input
            label="Emergency Contact"
            value={form.emergencyContact}
            onChange={(e) => setField('emergencyContact', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Joining Date"
              type="date"
              value={form.joiningDate}
              onChange={(e) => setField('joiningDate', e.target.value)}
              error={formErrors.joiningDate}
            />
            <Select
              label="Payment Frequency"
              value={form.paymentFrequency}
              onChange={(e) => setField('paymentFrequency', e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Fee"
              type="number"
              value={form.monthlyFee}
              onChange={(e) => setField('monthlyFee', e.target.value)}
            />
            <Input
              label="Security Deposit"
              type="number"
              value={form.securityDeposit}
              onChange={(e) => setField('securityDeposit', e.target.value)}
            />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="payment_due">Payment Due</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}