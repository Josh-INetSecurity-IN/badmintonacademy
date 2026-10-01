import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import axios from 'axios';
import {
  getGuestBookings,
  createGuestBooking,
  cancelGuestBooking,
  completeGuestBooking,
  convertGuestToRegular,
  getDailyGuestBookings,
  getGuestRevenue,
  getCourts,
} from '@/services/courts';
import { formatINR, formatDate } from '@/utils/format';
import type { GuestBooking, Court } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { confirm } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  UserPlus,
  IndianRupee,
  Users,
  Clock,
  CalendarX,
} from 'lucide-react';

const BOOKING_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  confirmed: 'info',
  cancelled: 'danger',
  completed: 'success',
};

const PAYMENT_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  paid: 'success',
  pending: 'warning',
  partial: 'info',
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  visitDate: new Date().toISOString().split('T')[0],
  courtId: '',
  startTime: '07:00',
  endTime: '08:30',
  numberOfPlayers: '2',
  amount: '',
  paymentMethod: 'cash',
  paymentStatus: 'pending',
  bookingStatus: 'confirmed',
  notes: '',
};

export default function GuestBookingsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState('list');
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['guest-bookings', page, search, statusFilter, dateFilter],
    queryFn: () =>
      getGuestBookings({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        date: dateFilter || undefined,
      }),
    enabled: view === 'list',
  });

  const { data: dailyBookings, isLoading: dailyLoading } = useQuery({
    queryKey: ['guest-bookings-daily'],
    queryFn: getDailyGuestBookings,
    enabled: view === 'daily',
  });

  const { data: courtsData } = useQuery({
    queryKey: ['courts-for-guest'],
    queryFn: () => getCourts({ limit: 100 }),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['guest-revenue', monthKey],
    queryFn: () => getGuestRevenue({ month: monthKey }),
  });

  const courts: Court[] = courtsData?.items ?? [];
  const bookings = view === 'list' ? (data?.items ?? []) : (dailyBookings ?? []);
  const pagination = data?.pagination;

  const revenue = useMemo(() => {
    const rev = revenueData as Record<string, unknown> | undefined;
    if (rev) {
      for (const key of ['total', 'revenue', 'amount', 'totalAmount']) {
        const v = rev[key];
        if (v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v))) {
          return Number(v);
        }
      }
    }
    return bookings
      .filter((b) => {
        if (b.bookingStatus === 'cancelled') return false;
        const d = new Date(b.visitDate);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      })
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);
  }, [revenueData, bookings, today]);

  const pendingAmount = bookings
    .filter((b) => b.bookingStatus !== 'cancelled' && b.paymentStatus === 'pending')
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const createMutation = useMutation({
    mutationFn: (formData: typeof EMPTY_FORM) =>
      createGuestBooking({
        ...formData,
        courtId: Number(formData.courtId),
        numberOfPlayers: formData.numberOfPlayers ? Number(formData.numberOfPlayers) : 1,
        amount: formData.amount ? Number(formData.amount) : 0,
      }),
    onSuccess: () => {
      toast.success('Booking created');
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
      setShowNewModal(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
    },
    onError: (err: unknown) => {
      const message = handleError(err);
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error(`Double booking conflict: ${message}`);
      } else {
        toast.error(message);
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeGuestBooking,
    onSuccess: () => {
      toast.success('Booking completed');
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelGuestBooking,
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const convertMutation = useMutation({
    mutationFn: convertGuestToRegular,
    onSuccess: (_data, bookingId) => {
      const booking = bookings.find((b) => b.id === bookingId);
      toast.success(
        `${booking ? booking.name : 'Guest'} converted to a regular player successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['regular-players'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleCancel = async (b: GuestBooking) => {
    const ok = await confirm({
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel booking ${b.bookingNumber}?`,
      confirmText: 'Cancel Booking',
    });
    if (ok) cancelMutation.mutate(b.id);
  };

  const handleConvert = async (b: GuestBooking) => {
    const ok = await confirm({
      title: 'Convert to Regular',
      message: `Convert ${b.name} into a regular player?`,
      confirmText: 'Convert',
    });
    if (ok) convertMutation.mutate(b.id);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.phone.trim()) errs.phone = 'Required';
    if (!form.visitDate) errs.visitDate = 'Required';
    if (!form.courtId) errs.courtId = 'Required';
    if (!form.startTime) errs.startTime = 'Required';
    if (!form.endTime) errs.endTime = 'Required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    createMutation.mutate(form);
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const renderBookingsTable = (rows: GuestBooking[]) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Court</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Players</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-mono text-xs">{b.bookingNumber}</TableCell>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell className="text-sm">{b.phone}</TableCell>
              <TableCell className="text-sm">{b.court?.name || `Court #${b.courtId}`}</TableCell>
              <TableCell className="text-sm">{formatDate(b.visitDate)}</TableCell>
              <TableCell className="text-sm">
                {b.startTime} - {b.endTime}
              </TableCell>
              <TableCell className="text-sm">{b.numberOfPlayers}</TableCell>
              <TableCell className="text-sm font-medium">{formatINR(b.amount)}</TableCell>
              <TableCell>
                <Badge variant={PAYMENT_STATUS_BADGE[b.paymentStatus] || 'default'}>
                  {b.paymentStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={BOOKING_STATUS_BADGE[b.bookingStatus] || 'default'}>
                  {b.bookingStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {b.bookingStatus === 'confirmed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Complete"
                      onClick={() => completeMutation.mutate(b.id)}
                      loading={completeMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {b.bookingStatus === 'confirmed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Cancel"
                      onClick={() => handleCancel(b)}
                      loading={cancelMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  {b.bookingStatus === 'confirmed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Convert to Regular"
                      onClick={() => handleConvert(b)}
                      loading={convertMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4 text-indigo-600" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const tabs = [
    {
      value: 'list',
      label: 'Bookings List',
      content: isLoading ? (
        <SkeletonTable rows={8} columns={11} />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title="No bookings found"
          description="Create a new guest booking or adjust your filters."
          action={
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          }
        />
      ) : (
        <>
          {renderBookingsTable(bookings)}
          {pagination && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                bookings
              </p>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ),
    },
    {
      value: 'daily',
      label: 'Daily View',
      content: dailyLoading ? (
        <SkeletonTable rows={8} columns={11} />
      ) : !dailyBookings || dailyBookings.length === 0 ? (
        <EmptyState
          icon={<CalendarX className="h-12 w-12" />}
          title="No bookings today"
          description="Guest bookings for today will appear here."
        />
      ) : (
        renderBookingsTable(dailyBookings)
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest Players"
        description="Manage guest player court bookings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Guest Players' },
        ]}
        actions={
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={`Revenue (${new Date().toLocaleString('en-IN', { month: 'short' })})`}
          value={formatINR(revenue)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title={view === 'daily' ? 'Bookings Today' : 'Total Bookings'}
          value={view === 'daily' ? (dailyBookings?.length ?? 0) : (data?.pagination?.total ?? 0)}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Pending Payment"
          value={formatINR(pendingAmount)}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, phone, booking no..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            label="Date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      <Tabs tabs={tabs} value={view} onChange={setView} />

      <Modal
        open={showNewModal}
        onClose={() => {
          setShowNewModal(false);
          setForm(EMPTY_FORM);
          setFormErrors({});
        }}
        title="New Guest Booking"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowNewModal(false);
                setForm(EMPTY_FORM);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createMutation.isPending}>
              Create Booking
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              error={formErrors.name}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={formErrors.phone}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="WhatsApp Number"
              value={form.whatsappNumber}
              onChange={(e) => setField('whatsappNumber', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </div>
          <Input
            label="Visit Date"
            type="date"
            value={form.visitDate}
            onChange={(e) => setField('visitDate', e.target.value)}
            error={formErrors.visitDate}
          />
          <Select
            label="Court"
            value={form.courtId}
            onChange={(e) => setField('courtId', e.target.value)}
            error={formErrors.courtId}
          >
            <option value="">Select court</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={form.startTime}
              onChange={(e) => setField('startTime', e.target.value)}
              error={formErrors.startTime}
            />
            <Input
              label="End Time"
              type="time"
              value={form.endTime}
              onChange={(e) => setField('endTime', e.target.value)}
              error={formErrors.endTime}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Number of Players"
              type="number"
              min={1}
              value={form.numberOfPlayers}
              onChange={(e) => setField('numberOfPlayers', e.target.value)}
            />
            <Input
              label="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
            />
          </div>
          <Select
            label="Payment Method"
            value={form.paymentMethod}
            onChange={(e) => setField('paymentMethod', e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Payment Status"
              value={form.paymentStatus}
              onChange={(e) => setField('paymentStatus', e.target.value)}
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </Select>
            <Select
              label="Booking Status"
              value={form.bookingStatus}
              onChange={(e) => setField('bookingStatus', e.target.value)}
            >
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}