import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import {
  getFees,
  getOverdueFees,
  getDueSoonFees,
  getOutstandingFees,
  generateFees,
  createPayment,
  getStudentFees,
  getRegularPlayerFees,
} from '@/services/fees';
import { getReminderTemplate } from '@/services/notifications';
import { getStudents } from '@/services/students';
import { getRegularPlayers } from '@/services/players';
import { getSettings } from '@/services/settings';
import {
  formatINR,
  formatDate,
  buildWhatsAppLink,
  buildPaymentReminder,
  getMonthLabel,
} from '@/utils/format';
import type { FeeInvoice, PaginatedData, Student, RegularPlayer } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import {
  Plus,
  Search,
  Eye,
  MessageCircle,
  IndianRupee,
  CalendarClock,
  AlertTriangle,
  Wallet,
  FileText,
} from 'lucide-react';

const currentMonth = (): string =>
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

const FEE_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  pending: 'warning',
  paid: 'success',
  partial: 'info',
  overdue: 'danger',
  cancelled: 'default',
};

const asPaginated = <T,>(
  data: T[] | PaginatedData<T> | undefined | null,
): PaginatedData<T> | undefined => {
  if (!data) return undefined;
  if (Array.isArray(data)) {
    return { items: data, pagination: { total: data.length, page: 1, limit: data.length, totalPages: 1 } };
  }
  return data as PaginatedData<T>;
};

const getMember = (inv: FeeInvoice) => {
  if (inv.student) {
    return {
      type: 'student' as const,
      name: `${inv.student.firstName} ${inv.student.lastName}`.trim(),
      phone: inv.student.phone || '',
    };
  }
  if (inv.regularPlayer) {
    return {
      type: 'regular' as const,
      name: `${inv.regularPlayer.firstName} ${inv.regularPlayer.lastName}`.trim(),
      phone: inv.regularPlayer.phone || '',
    };
  }
  return { type: 'none' as const, name: '—', phone: '' };
};

const balanceOf = (inv: FeeInvoice): number =>
  Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));

function CollectPaymentModal({
  open,
  invoice,
  students,
  regularPlayers,
  onClose,
  onSuccess,
}: {
  open: boolean;
  invoice: FeeInvoice | null;
  students: Student[];
  regularPlayers: RegularPlayer[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isFixed = !!invoice;
  const [form, setForm] = useState({
    memberType: 'student',
    studentId: '',
    playerId: '',
    invoiceId: '',
    amount: '',
    discount: '0',
    tax: '0',
    paymentMethod: 'cash',
    transactionRef: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({
        memberType: invoice?.student ? 'student' : 'player',
        studentId: invoice?.studentId ? String(invoice.studentId) : '',
        playerId: invoice?.regularPlayerId ? String(invoice.regularPlayerId) : '',
        invoiceId: invoice ? String(invoice.id) : '',
        amount: invoice ? String(balanceOf(invoice)) : '',
        discount: '0',
        tax: '0',
        paymentMethod: 'cash',
        transactionRef: '',
        notes: '',
      });
      setErrors({});
    }
  }, [open, invoice]);

  const selectedType = isFixed ? (invoice!.student ? 'student' : 'player') : form.memberType;
  const selectedStudentId = isFixed ? (invoice!.studentId ? String(invoice!.studentId) : '') : form.studentId;
  const selectedPlayerId = isFixed
    ? invoice!.regularPlayerId
      ? String(invoice!.regularPlayerId)
      : ''
    : form.playerId;

  const { data: memberInvoicesData } = useQuery({
    queryKey: ['collect-member-invoices', selectedType, selectedStudentId, selectedPlayerId],
    queryFn: async () => {
      if (selectedType === 'student' && selectedStudentId) {
        const res = (await getStudentFees(Number(selectedStudentId))) as unknown as
          | FeeInvoice[]
          | { invoices?: FeeInvoice[] };
        return Array.isArray(res) ? res : (res?.invoices ?? []);
      }
      if (selectedType === 'player' && selectedPlayerId) {
        const res = (await getRegularPlayerFees(Number(selectedPlayerId))) as unknown as
          | FeeInvoice[]
          | { invoices?: FeeInvoice[] };
        return Array.isArray(res) ? res : (res?.invoices ?? []);
      }
      return [] as FeeInvoice[];
    },
    enabled:
      open &&
      !isFixed &&
      !!((selectedType === 'student' && selectedStudentId) || (selectedType === 'player' && selectedPlayerId)),
  });

  const memberInvoices = (memberInvoicesData ?? []).filter((i) =>
    ['pending', 'partial', 'overdue'].includes(i.status),
  );

  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      toast.success('Payment collected successfully');
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleInvoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setForm((prev) => ({ ...prev, invoiceId: id }));
    if (id) {
      const inv = memberInvoices.find((i) => String(i.id) === id);
      if (inv) setForm((prev) => ({ ...prev, amount: String(balanceOf(inv)) }));
    } else {
      setForm((prev) => ({ ...prev, amount: '' }));
    }
  };

  const category = isFixed
    ? invoice!.student
      ? 'coaching_fee'
      : 'regular_membership'
    : form.memberType === 'student'
      ? 'coaching_fee'
      : 'regular_membership';

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!isFixed) {
      if (form.memberType === 'student' && !form.studentId) errs.studentId = 'Required';
      if (form.memberType === 'player' && !form.playerId) errs.playerId = 'Required';
    }
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const finalAmount = Number(form.amount) - Number(form.discount || 0) + Number(form.tax || 0);
    if (finalAmount <= 0) {
      toast.error('Final amount must be greater than zero');
      return;
    }
    createMutation.mutate({
      studentId: selectedType === 'student' ? Number(selectedStudentId) : undefined,
      regularPlayerId: selectedType === 'player' ? Number(selectedPlayerId) : undefined,
      feeInvoiceId: isFixed ? invoice!.id : form.invoiceId ? Number(form.invoiceId) : undefined,
      category,
      amount: Number(form.amount),
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      paymentMethod: form.paymentMethod,
      transactionRef: form.transactionRef || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isFixed ? `Collect Payment - #${invoice!.invoiceNumber}` : 'Collect Payment'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            <Wallet className="h-4 w-4" />
            Collect Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!isFixed && (
          <>
            <Select
              label="Member Type"
              value={form.memberType}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, memberType: e.target.value, studentId: '', playerId: '' }))
              }
            >
              <option value="student">Student</option>
              <option value="player">Regular Player</option>
            </Select>
            {form.memberType === 'student' ? (
              <Select
                label="Student"
                value={form.studentId}
                onChange={(e) => setField('studentId', e.target.value)}
                error={errors.studentId}
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
                value={form.playerId}
                onChange={(e) => setField('playerId', e.target.value)}
                error={errors.playerId}
              >
                <option value="">Select player</option>
                {regularPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.playerId})
                  </option>
                ))}
              </Select>
            )}
          </>
        )}

        {!isFixed && (
          <Select label="Fee Invoice" value={form.invoiceId} onChange={handleInvoiceChange}>
            <option value="">Walk-in payment (no invoice)</option>
            {memberInvoices.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.invoiceNumber} · {getMonthLabel(i.billingMonth)} · {formatINR(balanceOf(i))} due
              </option>
            ))}
          </Select>
        )}

        {isFixed && (
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-900">
              {getMember(invoice!).name}
              <Badge variant={invoice!.student ? 'info' : 'success'} className="ml-2">
                {invoice!.student ? 'Student' : 'Player'}
              </Badge>
            </div>
            <div className="mt-1 text-slate-500">
              #{invoice!.invoiceNumber} · {getMonthLabel(invoice!.billingMonth)} · Due {formatDate(invoice!.dueDate)}
            </div>
            <div className="mt-1 text-slate-500">Balance: {formatINR(balanceOf(invoice!))}</div>
          </div>
        )}

        <Input
          label="Amount"
          type="number"
          min={0}
          value={form.amount}
          onChange={(e) => setField('amount', e.target.value)}
          error={errors.amount}
          placeholder="0"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Discount"
            type="number"
            min={0}
            value={form.discount}
            onChange={(e) => setField('discount', e.target.value)}
          />
          <Input
            label="Tax"
            type="number"
            min={0}
            value={form.tax}
            onChange={(e) => setField('tax', e.target.value)}
          />
        </div>
        <Select
          label="Payment Method"
          value={form.paymentMethod}
          onChange={(e) => setField('paymentMethod', e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </Select>
        <Input
          label="Transaction Reference"
          value={form.transactionRef}
          onChange={(e) => setField('transactionRef', e.target.value)}
        />
        <Input label="Notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
      </div>
    </Modal>
  );
}

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [tab, setTab] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectInvoice, setCollectInvoice] = useState<FeeInvoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<FeeInvoice | null>(null);
  const [generateForm, setGenerateForm] = useState({ month: currentMonth(), type: 'all' });

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, monthFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['fees', 'list', page, search, statusFilter, monthFilter],
    queryFn: () =>
      getFees({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        month: monthFilter || undefined,
      }),
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['fees', 'overdue'],
    queryFn: getOverdueFees,
  });

  const { data: dueSoonData, isLoading: dueSoonLoading } = useQuery({
    queryKey: ['fees', 'due-soon'],
    queryFn: getDueSoonFees,
  });

  const { data: outstandingData } = useQuery({
    queryKey: ['fees', 'outstanding'],
    queryFn: getOutstandingFees,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const { data: studentData } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => getStudents({ limit: 500 }),
    enabled: showCollectModal,
  });

  const { data: playerData } = useQuery({
    queryKey: ['regular-players', 'all'],
    queryFn: () => getRegularPlayers({ limit: 500 }),
    enabled: showCollectModal,
  });

  const students = studentData?.items ?? [];
  const regularPlayers = playerData?.items ?? [];
  const invoices = asPaginated(data);
  const overdueRows = asPaginated(overdueData)?.items ?? [];
  const dueSoonRows = asPaginated(dueSoonData)?.items ?? [];
  const overdueCount = asPaginated(overdueData)?.pagination?.total ?? 0;
  const dueSoonCount = asPaginated(dueSoonData)?.pagination?.total ?? 0;
  const outstanding = (outstandingData as unknown as { outstanding?: number } | undefined)?.outstanding ?? 0;
  const academyName: string =
    ((settingsData as Record<string, unknown> | undefined)?.['academy_name'] as string) ||
    ((settingsData as Record<string, unknown> | undefined)?.['academyName'] as string) ||
    'Badminton Academy';

  const generateMutation = useMutation({
    mutationFn: (d: { month: string; type: string }) => generateFees(d),
    onSuccess: (result) => {
      const r = result as { created?: number; skipped?: number } | undefined;
      toast.success(`Fee generation complete: ${r?.created ?? 0} created, ${r?.skipped ?? 0} skipped`);
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      setShowGenerateModal(false);
      setGenerateForm({ month: currentMonth(), type: 'all' });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleWhatsAppReminder = async (inv: FeeInvoice) => {
    try {
      const tpl = (await getReminderTemplate({ invoiceId: inv.id })) as
        | { whatsappLink?: string | null; phone?: string | null; message?: string | null }
        | null
        | undefined;
      if (tpl?.whatsappLink) {
        window.open(tpl.whatsappLink, '_blank', 'noopener,noreferrer');
        return;
      }
      const msg =
        tpl?.message || undefined;
      if (tpl?.phone && msg) {
        window.open(buildWhatsAppLink(tpl.phone, msg), '_blank', 'noopener,noreferrer');
        return;
      }
      throw new Error('No reminder template usable');
    } catch {
      const member = getMember(inv);
      if (!member.phone) {
        toast.error('No contact number available for this member');
        return;
      }
      const message = buildPaymentReminder({
        name: member.name,
        academyName,
        feeType: member.type === 'student' ? 'coaching fee' : 'membership fee',
        amount: balanceOf(inv),
        billingMonth: getMonthLabel(inv.billingMonth),
        dueDate: formatDate(inv.dueDate),
      });
      window.open(buildWhatsAppLink(member.phone, message), '_blank', 'noopener,noreferrer');
    }
  };

  const openCollect = (inv: FeeInvoice | null) => {
    setCollectInvoice(inv);
    setShowCollectModal(true);
  };

  const renderInvoices = (rows: FeeInvoice[]) => (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice No</TableHead>
            <TableHead>Student / Player</TableHead>
            <TableHead>Month</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Tax</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((inv) => {
            const member = getMember(inv);
            const balance = balanceOf(inv);
            const canCollect = inv.status !== 'cancelled' && balance > 0;
            return (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{member.name}</span>
                    <Badge variant={member.type === 'student' ? 'info' : 'success'}>
                      {member.type === 'student' ? 'Student' : member.type === 'regular' ? 'Player' : '—'}
                    </Badge>
                  </div>
                  {member.phone && <div className="text-xs text-slate-500">{member.phone}</div>}
                </TableCell>
                <TableCell className="text-sm">{getMonthLabel(inv.billingMonth)}</TableCell>
                <TableCell className="text-sm">{formatINR(inv.amount)}</TableCell>
                <TableCell className="text-sm">{formatINR(inv.discount)}</TableCell>
                <TableCell className="text-sm">{formatINR(inv.tax)}</TableCell>
                <TableCell className="text-sm font-medium">{formatINR(inv.totalAmount)}</TableCell>
                <TableCell className="text-sm">{formatINR(inv.paidAmount)}</TableCell>
                <TableCell className="text-sm font-medium text-slate-900">{formatINR(balance)}</TableCell>
                <TableCell className="text-sm">{formatDate(inv.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant={FEE_STATUS_BADGE[inv.status] || 'default'}>{inv.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Collect Payment"
                      disabled={!canCollect}
                      onClick={() => openCollect(inv)}
                    >
                      <Wallet className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="WhatsApp Reminder"
                      onClick={() => handleWhatsAppReminder(inv)}
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" title="View" onClick={() => setViewInvoice(inv)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const allContent = isLoading ? (
    <SkeletonTable rows={8} columns={12} />
  ) : (invoices?.items ?? []).length === 0 ? (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title="No fee invoices found"
      description="Generate fees for a billing month or adjust your filters."
      action={
        <Button onClick={() => setShowGenerateModal(true)}>
          <Plus className="h-4 w-4" />
          Generate Fees
        </Button>
      }
    />
  ) : (
    <>
      {renderInvoices(invoices?.items ?? [])}
      {invoices?.pagination && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-500">
            Showing {(invoices.pagination.page - 1) * invoices.pagination.limit + 1} to{' '}
            {Math.min(invoices.pagination.page * invoices.pagination.limit, invoices.pagination.total)} of{' '}
            {invoices.pagination.total} invoices
          </p>
          <Pagination
            page={invoices.pagination.page}
            totalPages={invoices.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );

  const overdueContent = overdueLoading ? (
    <SkeletonTable rows={8} columns={12} />
  ) : overdueRows.length === 0 ? (
    <EmptyState
      icon={<AlertTriangle className="h-12 w-12" />}
      title="No overdue invoices"
      description="Great — everything is paid up!"
    />
  ) : (
    renderInvoices(overdueRows)
  );

  const dueSoonContent = dueSoonLoading ? (
    <SkeletonTable rows={8} columns={12} />
  ) : dueSoonRows.length === 0 ? (
    <EmptyState
      icon={<CalendarClock className="h-12 w-12" />}
      title="Nothing due soon"
      description="No invoices are falling due in the next 7 days."
    />
  ) : (
    renderInvoices(dueSoonRows)
  );

  const tabs = [
    { value: 'all', label: 'All', content: allContent },
    { value: 'overdue', label: 'Overdue', content: overdueContent },
    { value: 'due-soon', label: 'Due Soon', content: dueSoonContent },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Invoices"
        description="Track monthly fees, pending balances and collect payments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Fees' },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => openCollect(null)}>
              <Wallet className="h-4 w-4" />
              Collect Payment
            </Button>
            <Button onClick={() => setShowGenerateModal(true)}>
              <Plus className="h-4 w-4" />
              Generate Fees
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Outstanding"
          value={formatINR(outstanding)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Overdue Invoices"
          value={overdueCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Due in 7 Days"
          value={dueSoonCount}
          icon={<CalendarClock className="h-5 w-5" />}
          color="blue"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, phone, invoice no..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input
            label="Month"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
        </div>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <Modal
        open={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setGenerateForm({ month: currentMonth(), type: 'all' });
        }}
        title="Generate Fee Invoices"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowGenerateModal(false);
                setGenerateForm({ month: currentMonth(), type: 'all' });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => generateMutation.mutate(generateForm)}
              loading={generateMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              Generate
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Billing Month"
            type="month"
            value={generateForm.month}
            onChange={(e) => setGenerateForm((prev) => ({ ...prev, month: e.target.value }))}
          />
          <Select
            label="Generate For"
            value={generateForm.type}
            onChange={(e) => setGenerateForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">All Members</option>
            <option value="coaching">Coaching Students Only</option>
            <option value="regular">Regular Players Only</option>
          </Select>
          <p className="text-sm text-slate-500">
            Creates pending invoices for active members for the selected month. Members with a
            zero fee or an existing invoice for the month are skipped.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice #${viewInvoice.invoiceNumber}` : ''}
        footer={
          <Button variant="secondary" onClick={() => setViewInvoice(null)}>
            Close
          </Button>
        }
      >
        {viewInvoice && (
          <div className="space-y-2 text-sm">
            {[
              ['Member', getMember(viewInvoice).name],
              ['Month', getMonthLabel(viewInvoice.billingMonth)],
              ['Amount', formatINR(viewInvoice.amount)],
              ['Discount', formatINR(viewInvoice.discount)],
              ['Tax', formatINR(viewInvoice.tax)],
              ['Total', formatINR(viewInvoice.totalAmount)],
              ['Paid', formatINR(viewInvoice.paidAmount)],
              ['Balance', formatINR(balanceOf(viewInvoice))],
              ['Due Date', formatDate(viewInvoice.dueDate)],
              ['Status', viewInvoice.status],
              ['Notes', viewInvoice.notes || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium text-slate-900 capitalize">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <CollectPaymentModal
        open={showCollectModal}
        invoice={collectInvoice}
        students={students}
        regularPlayers={regularPlayers}
        onClose={() => {
          setShowCollectModal(false);
          setCollectInvoice(null);
        }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['fees'] })}
      />
    </div>
  );
}