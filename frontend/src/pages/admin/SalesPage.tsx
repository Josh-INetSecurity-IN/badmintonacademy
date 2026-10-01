import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { getSales, getProducts, getSalesSummary, createSale } from '@/services/sales';
import { getStudents } from '@/services/students';
import { getRegularPlayers } from '@/services/players';
import { formatINR, formatDate, formatDateTime } from '@/utils/format';
import type { Product, Sale, Student, RegularPlayer } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { CalendarDays, Eye, FileText, IndianRupee, Package, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  other: 'Other',
};

const PAYMENT_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  paid: 'success',
  pending: 'warning',
  partial: 'info',
  cancelled: 'danger',
  failed: 'danger',
};

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

interface CartItem {
  tempId: number;
  productId: number;
  quantity: string;
  unitPrice: string;
}

function NewSaleModal({
  open,
  products,
  students,
  players,
  onClose,
  onSuccess,
}: {
  open: boolean;
  products: Product[];
  students: Student[];
  players: RegularPlayer[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const tempCounter = useRef(0);
  const [customerType, setCustomerType] = useState('walkin');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [items, setItems] = useState<CartItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      tempCounter.current = 0;
      setCustomerType('walkin');
      setCustomerName('');
      setCustomerPhone('');
      setStudentId('');
      setPlayerId('');
      setDiscount('0');
      setPaymentMethod('cash');
      setPaymentStatus('paid');
      setItems([]);
      setErrors({});
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast.success('Sale recorded successfully');
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleCustomerTypeChange = (value: string) => {
    setCustomerType(value);
    setStudentId('');
    setPlayerId('');
    setCustomerName('');
    setCustomerPhone('');
  };

  const handleStudentChange = (id: string) => {
    setStudentId(id);
    const s = students.find((x) => String(x.id) === id);
    if (s) {
      setCustomerName(`${s.firstName} ${s.lastName}`.trim());
      setCustomerPhone(s.phone || s.parentPhone || '');
    }
  };

  const handlePlayerChange = (id: string) => {
    setPlayerId(id);
    const p = players.find((x) => String(x.id) === id);
    if (p) {
      setCustomerName(`${p.firstName} ${p.lastName}`.trim());
      setCustomerPhone(p.phone || '');
    }
  };

  const handleProductSelect = (productId: string) => {
    if (!productId) return;
    const product = products.find((p) => String(p.id) === productId);
    if (!product) return;
    tempCounter.current += 1;
    setItems((prev) => [
      ...prev,
      {
        tempId: tempCounter.current,
        productId: product.id,
        quantity: '1',
        unitPrice: String(Number(product.sellingPrice) || 0),
      },
    ]);
  };

  const updateItem = (tempId: number, field: keyof CartItem, value: string) => {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, [field]: value } : it)));
  };

  const removeItem = (tempId: number) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const getProduct = (productId: number) => products.find((p) => p.id === productId);

  const subtotal = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  const discountNum = Number(discount || 0);
  const finalAmount = Math.max(subtotal - discountNum, 0);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (items.length === 0) errs.items = 'Add at least one item to the cart';
    if (!customerName.trim()) errs.customerName = 'Required';
    for (const it of items) {
      const product = getProduct(it.productId);
      if (!product) continue;
      const qty = Number(it.quantity || 0);
      if (qty <= 0) {
        errs.items = 'All quantities must be greater than zero';
        break;
      }
      if (qty > product.stockQuantity) {
        errs.items = `${product.name} has only ${product.stockQuantity} in stock`;
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      studentId: customerType === 'student' && studentId ? Number(studentId) : undefined,
      regularPlayerId: customerType === 'player' && playerId ? Number(playerId) : undefined,
      paymentMethod,
      paymentStatus,
      discount: discountNum,
      items: items.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Sale"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            <ShoppingCart className="h-4 w-4" />
            Create Sale
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Customer Type"
          value={customerType}
          onChange={(e) => handleCustomerTypeChange(e.target.value)}
        >
          <option value="walkin">Walk-in Customer</option>
          <option value="student">Student</option>
          <option value="player">Regular Player</option>
        </Select>

        {customerType === 'student' ? (
          <Select
            label="Select Student"
            value={studentId}
            onChange={(e) => handleStudentChange(e.target.value)}
          >
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} ({s.admissionNumber})
              </option>
            ))}
          </Select>
        ) : customerType === 'player' ? (
          <Select
            label="Select Player"
            value={playerId}
            onChange={(e) => handlePlayerChange(e.target.value)}
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.playerId})
              </option>
            ))}
          </Select>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={errors.customerName}
          />
          <Input
            label="Phone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Add Products</label>
          <Select onChange={(e) => handleProductSelect(e.target.value)}>
            <option value="">Select a product to add</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - {formatINR(p.sellingPrice)} (stock: {p.stockQuantity})
              </option>
            ))}
          </Select>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No items added yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Unit Price</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const product = getProduct(it.productId);
                  const overStock = product ? Number(it.quantity) > product.stockQuantity : false;
                  return (
                    <tr key={it.tempId} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium text-slate-900">{product?.name || `Product #${it.productId}`}</span>
                        {overStock && <div className="text-xs text-red-600">Only {product?.stockQuantity} in stock</div>}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => updateItem(it.tempId, 'quantity', e.target.value)}
                          className="w-20"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={it.unitPrice}
                          onChange={(e) => updateItem(it.tempId, 'unitPrice', e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">
                        {formatINR(Number(it.quantity || 0) * Number(it.unitPrice || 0))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="icon" title="Remove" onClick={() => removeItem(it.tempId)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Discount"
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
          <Select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Select label="Payment Status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
        </Select>

        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Discount</span>
            <span>-{formatINR(discountNum)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Final Amount</span>
            <span>{formatINR(finalAmount)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayISO());
  const [paymentStatus, setPaymentStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showNewSale, setShowNewSale] = useState(false);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [from, to, paymentStatus, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', 'list', page, from, to, paymentStatus, search],
    queryFn: () =>
      getSales({
        page,
        limit: 15,
        from: from || undefined,
        to: to || undefined,
        paymentStatus: paymentStatus || undefined,
        search: search || undefined,
      }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['sales', 'summary'],
    queryFn: () => getSalesSummary({}),
  });

  const { data: productData } = useQuery({
    queryKey: ['products', 'cart'],
    queryFn: () => getProducts({ limit: 500 }),
  });

  const { data: studentData } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => getStudents({ limit: 500 }),
  });

  const { data: playerData } = useQuery({
    queryKey: ['regular-players', 'all'],
    queryFn: () => getRegularPlayers({ limit: 500 }),
  });

  const sales = data?.items ?? [];
  const pagination = data?.pagination;
  const products = productData?.items ?? [];
  const students = studentData?.items ?? [];
  const players = playerData?.items ?? [];

  const summary = (summaryData ?? {}) as Record<string, unknown>;
  const todayTotal = Number(summary.todayTotal ?? summary.today ?? summary.totalToday ?? 0);
  const monthTotal = Number(summary.monthTotal ?? summary.month ?? summary.totalThisMonth ?? 0);
  const todayCount = Number(summary.todayCount ?? summary.invoicesToday ?? summary.salesToday ?? 0);

  const getSaleItemsTotal = (s: Sale): number =>
    (s.items ?? []).reduce((sum, it) => sum + Number(it.total ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        description="Record retail sales and track revenue"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Sales' },
        ]}
        actions={
          <Button onClick={() => setShowNewSale(true)}>
            <Plus className="h-4 w-4" />
            New Sale
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatINR(todayTotal)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Today's Invoices"
          value={todayCount}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="This Month"
          value={formatINR(monthTotal)}
          icon={<CalendarDays className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Products in Stock"
          value={products.length}
          icon={<Package className="h-5 w-5" />}
          color="amber"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <div className="min-w-[160px]">
            <Select label="Payment Status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by invoice, customer, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} columns={9} />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No sales found"
          description="Record your first sale or adjust your filters."
          action={
            <Button onClick={() => setShowNewSale(true)}>
              <Plus className="h-4 w-4" />
              New Sale
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{s.customerName || 'Walk-in Customer'}</div>
                      {s.customerPhone && <div className="text-xs text-slate-500">{s.customerPhone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(s.saleDate)}</TableCell>
                    <TableCell className="text-right text-sm">{s.items?.length ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{formatINR(s.totalAmount)}</TableCell>
                    <TableCell className="text-right text-sm text-amber-600">{formatINR(s.discount)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatINR(s.finalAmount)}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_STATUS_BADGE[s.paymentStatus] || 'default'}>{s.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" title="View Details" onClick={() => setDetailSale(s)}>
                          <Eye className="h-4 w-4 text-indigo-600" />
                        </Button>
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} sales
              </p>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <NewSaleModal
        open={showNewSale}
        products={products}
        students={students}
        players={players}
        onClose={() => setShowNewSale(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }}
      />

      <Modal
        open={!!detailSale}
        onClose={() => setDetailSale(null)}
        title={detailSale ? `Sale Details - ${detailSale.invoiceNumber}` : ''}
        footer={
          <Button variant="secondary" onClick={() => setDetailSale(null)}>
            Close
          </Button>
        }
      >
        {detailSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Customer</div>
                <div className="font-medium text-slate-900">{detailSale.customerName || 'Walk-in Customer'}</div>
                {detailSale.customerPhone && <div className="text-xs text-slate-500">{detailSale.customerPhone}</div>}
              </div>
              <div className="text-right">
                <div className="text-slate-500">Date</div>
                <div className="font-medium text-slate-900">{formatDateTime(detailSale.saleDate)}</div>
              </div>
            </div>

            {detailSale.items && detailSale.items.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailSale.items.map((it) => (
                      <tr key={it.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-slate-900">{it.product?.name || `Product #${it.productId}`}</td>
                        <td className="px-3 py-2 text-right">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatINR(it.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatINR(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Item details not available.</p>
            )}

            <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Items Total</span>
                <span>{formatINR(getSaleItemsTotal(detailSale))}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount</span>
                <span>-{formatINR(detailSale.discount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <span>Final Amount</span>
                <span>{formatINR(detailSale.finalAmount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-500">
                Method:{' '}
                <span className="capitalize text-slate-900">
                  {PAYMENT_METHOD_LABELS[detailSale.paymentMethod] || detailSale.paymentMethod}
                </span>
              </div>
              <Badge variant={PAYMENT_STATUS_BADGE[detailSale.paymentStatus] || 'default'}>
                {detailSale.paymentStatus}
              </Badge>
            </div>
            {detailSale.notes && <p className="text-xs text-slate-500">Notes: {detailSale.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}