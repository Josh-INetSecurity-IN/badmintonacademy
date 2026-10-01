import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import {
  getPayments,
  createPayment,
  cancelPayment,
  getPaymentReceipt,
  getPaymentSummary,
} from '@/services/fees';
import { getStudents } from '@/services/students';
import { getRegularPlayers } from '@/services/players';
import { getSettings } from '@/services/settings';
import {
  formatINR,
  formatDateTime,
  buildWhatsAppLink,
  getMonthLabel,
} from '@/utils/format';
import type { Payment, Student, RegularPlayer } from '@/types';
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
  Search,
  Receipt,
  XCircle,
  MessageCircle,
  IndianRupee,
  CreditCard,
  Printer,
  FileText,
} from 'lucide-react';

const currentMonth = (): string =>
  `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

const PAYMENT_CATEGORIES = ['coaching_fee', 'regular_membership', 'guest_booking', 'tournament', 'product_sale', 'other'];

const CATEGORY_LABELS: Record<string, string> = {
  coaching_fee: 'Coaching Fee',
  regular_membership: 'Regular Membership',
  guest_booking: 'Guest Booking',
  tournament: 'Tournament',
  product_sale: 'Product Sale',
  other: 'Other',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  other: 'Other',
};

const PAYMENT_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  paid: 'success',
  cancelled: 'danger',
  pending: 'warning',
  partial: 'info',
};

interface ReceiptData {
  receiptNumber: string;
  amount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  paymentMethod: string;
  transactionRef?: string | null;
  paymentDate: string;
  category: string;
  description?: string | null;
  notes?: string | null;
  invoice?: {
    id: number;
    invoiceNumber: string;
    billingMonth: string;
    totalAmount: number;
    paidAmount: number;
    dueDate: string;
  } | null;
  customer?: {
    type: string;
    id: number;
    reference: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
  settings: Record<string, string>;
}

const readReceipt = async (id: number): Promise<ReceiptData | null> => {
  const blob = await getPaymentReceipt(id);
  const text = await blob.text();
  try {
    const parsed = JSON.parse(text) as { data?: ReceiptData };
    return parsed?.data ?? null;
  } catch {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    URL.revokeObjectURL(url);
    return null;
  }
};

const getPayer = (p: Payment) => {
  const extend = p as Payment & {
    student?: { firstName: string; lastName: string; phone?: string | null };
    regularPlayer?: { firstName: string; lastName: string; phone?: string | null };
  };
  if (extend.student) {
    return {
      type: 'student' as const,
      name: `${extend.student.firstName} ${extend.student.lastName}`.trim(),
      phone: extend.student.phone || '',
    };
  }
  if (extend.regularPlayer) {
    return {
      type: 'regular' as const,
      name: `${extend.regularPlayer.firstName} ${extend.regularPlayer.lastName}`.trim(),
      phone: extend.regularPlayer.phone || '',
    };
  }
  return { type: 'none' as const, name: '—', phone: '' };
};

function RecordPaymentModal({
  open,
  students,
  regularPlayers,
  onClose,
  onSuccess,
}: {
  open: boolean;
  students: Student[];
  regularPlayers: RegularPlayer[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    memberType: 'student',
    studentId: '',
    playerId: '',
    category: 'coaching_fee',
    description: '',
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
        memberType: 'student',
        studentId: '',
        playerId: '',
        category: 'coaching_fee',
        description: '',
        amount: '',
        discount: '0',
        tax: '0',
        paymentMethod: 'cash',
        transactionRef: '',
        notes: '',
      });
      setErrors({});
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      toast.success('Payment recorded successfully');
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

  const handleMemberTypeChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      memberType: value,
      studentId: '',
      playerId: '',
      category: value === 'student' ? 'coaching_fee' : 'regular_membership',
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.memberType === 'student' && !form.studentId) errs.studentId = 'Required';
    if (form.memberType === 'player' && !form.playerId) errs.playerId = 'Required';
    if (!form.category) errs.category = 'Required';
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
      studentId: form.memberType === 'student' ? Number(form.studentId) : undefined,
      regularPlayerId: form.memberType === 'player' ? Number(form.playerId) : undefined,
      category: form.category,
      description: form.description || undefined,
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
      title="Record Payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Member Type"
          value={form.memberType}
          onChange={(e) => handleMemberTypeChange(e.target.value)}
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
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => setField('category', e.target.value)}
          error={errors.category}
        >
          {PAYMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </Select>
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
        />
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
          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
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

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, monthFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'list', page, search, categoryFilter, statusFilter, monthFilter],
    queryFn: () =>
      getPayments({
        page,
        limit: 15,
        search: search || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        month: monthFilter || undefined,
      }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['payments', 'summary', monthFilter],
    queryFn: () => getPaymentSummary({ month: monthFilter }),
    enabled: !!monthFilter,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
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
  const payments = data?.items ?? [];
  const pagination = data?.pagination;
  const academyName =
    (settingsData as Record<string, unknown> | undefined)?.['academy_name'] ||
    (settingsData as Record<string, unknown> | undefined)?.['academyName'] ||
    'Badminton Academy';

  const summary = summaryData as
    | { byCategory?: { category: string; total: number; count: number }[]; byMonth?: Record<string, number> }
    | undefined;

  const { totalThisMonth, paymentCount, topCategories } = useMemo(() => {
    const byCategory = summary?.byCategory ?? [];
    const total =
      (summary?.byMonth?.[monthFilter] ?? 0) ||
      byCategory.reduce((sum, c) => sum + Number(c.total), 0);
    const count = byCategory.reduce((sum, c) => sum + Number(c.count), 0);
    const top = [...byCategory].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 4);
    return { totalThisMonth: total, paymentCount: count, topCategories: top };
  }, [summary, monthFilter]);

  const cancelMutation = useMutation({
    mutationFn: cancelPayment,
    onSuccess: (_data, id) => {
      const p = payments.find((pay) => pay.id === id);
      toast.success(
        `Payment ${p ? p.receiptNumber : `#${id}`} cancelled. Amount reversed from the invoice.`,
      );
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleCancel = async (p: Payment) => {
    const ok = await confirm({
      title: 'Cancel Payment',
      message: `Cancel payment ${p.receiptNumber} of ${formatINR(p.finalAmount)}? The amount will be reversed from the linked invoice.`,
      confirmText: 'Cancel Payment',
    });
    if (ok) cancelMutation.mutate(p.id);
  };

  const handleReceipt = async (p: Payment) => {
    setReceiptLoadingId(p.id);
    try {
      const data = await readReceipt(p.id);
      if (data) setReceipt(data);
    } catch (err) {
      toast.error(handleError(err));
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const handleWhatsApp = (p: Payment) => {
    const payer = getPayer(p);
    if (!payer.phone) {
      toast.error('No phone number available for this payer');
      return;
    }
    const message =
      `Hello ${payer.name},\n\n` +
      `Thank you for your payment of ${formatINR(p.finalAmount)} ` +
      `(${CATEGORY_LABELS[p.category] || p.category}) at ${academyName}.\n` +
      `Receipt No: ${p.receiptNumber}\n\n` +
      `${academyName}`;
    window.open(buildWhatsAppLink(payer.phone, message), '_blank', 'noopener,noreferrer');
  };

  const statColors = ['blue', 'green', 'amber', 'red'] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Record and track all payments received by the academy"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Payments' },
        ]}
        actions={
          <Button onClick={() => setShowRecordModal(true)}>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title={`Total (${getMonthLabel(monthFilter)})`}
          value={formatINR(totalThisMonth)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Payments Recorded"
          value={paymentCount}
          icon={<CreditCard className="h-5 w-5" />}
          color="blue"
        />
        {topCategories.map((c, i) => (
          <StatCard
            key={c.category}
            title={CATEGORY_LABELS[c.category] || c.category}
            value={formatINR(c.total)}
            icon={<CreditCard className="h-5 w-5" />}
            color={statColors[(i + 1) % statColors.length]}
          />
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, phone, receipt no..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {PAYMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </Select>
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
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

      {isLoading ? (
        <SkeletonTable rows={8} columns={11} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No payments found"
          description="Record your first payment or adjust your filters."
          action={
            <Button onClick={() => setShowRecordModal(true)}>
              <Plus className="h-4 w-4" />
              Record Payment
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const payer = getPayer(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{payer.name}</span>
                          <Badge variant={payer.type === 'student' ? 'info' : 'success'}>
                            {payer.type === 'student' ? 'Student' : payer.type === 'regular' ? 'Player' : '—'}
                          </Badge>
                        </div>
                        {payer.phone && <div className="text-xs text-slate-500">{payer.phone}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{CATEGORY_LABELS[p.category] || p.category}</TableCell>
                      <TableCell className="text-sm">{formatINR(p.amount)}</TableCell>
                      <TableCell className="text-sm">{formatINR(p.discount)}</TableCell>
                      <TableCell className="text-sm">{formatINR(p.tax)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatINR(p.finalAmount)}</TableCell>
                      <TableCell className="text-sm capitalize">
                        {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(p.paymentDate)}</TableCell>
                      <TableCell>
                        <Badge variant={PAYMENT_STATUS_BADGE[p.status] || 'default'}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Receipt"
                            onClick={() => handleReceipt(p)}
                            loading={receiptLoadingId === p.id}
                          >
                            <Receipt className="h-4 w-4 text-indigo-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="WhatsApp"
                            onClick={() => handleWhatsApp(p)}
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          {p.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel"
                              onClick={() => handleCancel(p)}
                              loading={cancelMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
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
                payments
              </p>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <RecordPaymentModal
        open={showRecordModal}
        students={students}
        regularPlayers={regularPlayers}
        onClose={() => setShowRecordModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['payments'] });
          queryClient.invalidateQueries({ queryKey: ['payments', 'summary'] });
          queryClient.invalidateQueries({ queryKey: ['fees'] });
        }}
      />

      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title={receipt ? `Payment Receipt - ${receipt.receiptNumber}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceipt(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </>
        }
      >
        {receipt && (
          <div className="space-y-4">
            <div className="border-b border-dashed border-slate-300 pb-4 text-center">
              <p className="text-lg font-bold text-slate-900">
                {receipt.settings?.academy_name ||
                  receipt.settings?.academyName ||
                  (typeof academyName === 'string' ? academyName : 'Badminton Academy')}
              </p>
              <p className="text-sm text-slate-500">Official Payment Receipt</p>
            </div>
            <div className="flex items-start justify-between text-sm">
              <div>
                <div className="text-slate-500">Receipt No.</div>
                <div className="font-mono font-medium text-slate-900">{receipt.receiptNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500">Date</div>
                <div className="font-medium text-slate-900">{formatDateTime(receipt.paymentDate)}</div>
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="text-slate-500">Payer</div>
              <div className="font-medium text-slate-900">
                {receipt.customer?.name || 'Walk-in Customer'}
                {receipt.customer?.reference && (
                  <span className="ml-2 text-xs text-slate-500">({receipt.customer.reference})</span>
                )}
              </div>
              {receipt.customer?.phone && (
                <div className="mt-0.5 text-xs text-slate-500">{receipt.customer.phone}</div>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Particulars</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2">
                      {CATEGORY_LABELS[receipt.category] || receipt.category}
                      {receipt.invoice && (
                        <div className="text-xs text-slate-500">
                          {receipt.invoice.invoiceNumber} · {getMonthLabel(receipt.invoice.billingMonth)}
                        </div>
                      )}
                      {receipt.description && (
                        <div className="text-xs text-slate-500">{receipt.description}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{formatINR(receipt.amount)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-500">Discount</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {formatINR(-receipt.discount)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-500">Tax</td>
                    <td className="px-3 py-2 text-right text-slate-500">{formatINR(receipt.tax)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-slate-900">Total Paid</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">
                      {formatINR(receipt.finalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>
                Method: {PAYMENT_METHOD_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
              </span>
              {receipt.transactionRef && <span>Txn Ref: {receipt.transactionRef}</span>}
            </div>
            {receipt.notes && <p className="text-xs text-slate-500">Notes: {receipt.notes}</p>}
            <p className="border-t border-dashed border-slate-300 pt-3 text-center text-sm text-slate-500">
              Thank you for your payment!
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}