import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { getProducts, getLowStockProducts, createProduct, updateProduct, deleteProduct, stockIn, stockAdjust } from '@/services/sales';
import { formatINR, getInitials } from '@/utils/format';
import type { Product } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { confirm } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { AlertTriangle, Package, PackagePlus, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';

const STATUS_BADGE: Record<string, 'success' | 'default' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'default',
  discontinued: 'danger',
};

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  brand: string;
  description: string;
  purchasePrice: string;
  sellingPrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
  supplier: string;
  status: string;
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  category: '',
  brand: '',
  description: '',
  purchasePrice: '',
  sellingPrice: '',
  stockQuantity: '0',
  lowStockThreshold: '5',
  supplier: '',
  status: 'active',
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [stockInFor, setStockInFor] = useState<Product | null>(null);
  const [stockInQty, setStockInQty] = useState('');
  const [stockInPrice, setStockInPrice] = useState('');

  const [adjustFor, setAdjustFor] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'list', page, search],
    queryFn: () => getProducts({ page, limit: 15, search: search || undefined }),
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: getLowStockProducts,
  });

  const products = data?.items ?? [];
  const pagination = data?.pagination;
  const lowStockProducts = lowStockData ?? [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { id?: number; data: ProductForm }) => {
      const body = {
        name: payload.data.name,
        sku: payload.data.sku || undefined,
        category: payload.data.category || undefined,
        brand: payload.data.brand || undefined,
        description: payload.data.description || undefined,
        purchasePrice: Number(payload.data.purchasePrice || 0),
        sellingPrice: Number(payload.data.sellingPrice || 0),
        stockQuantity: Number(payload.data.stockQuantity || 0),
        lowStockThreshold: Number(payload.data.lowStockThreshold || 0),
        supplier: payload.data.supplier || undefined,
        status: payload.data.status,
      };
      return payload.id ? updateProduct(payload.id, body) : createProduct(body);
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.id ? 'Product updated successfully' : 'Product created successfully');
      setShowFormModal(false);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success('Product deleted');
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const stockInMutation = useMutation({
    mutationFn: (vars: { id: number; quantity: number; purchasePrice?: number }) =>
      stockIn(vars.id, { quantity: vars.quantity, purchasePrice: vars.purchasePrice }),
    onSuccess: () => {
      toast.success('Stock added successfully');
      setStockInFor(null);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (vars: { id: number; quantity: number; type: string; reason: string }) =>
      stockAdjust(vars.id, { quantity: vars.quantity, type: vars.type, reason: vars.reason }),
    onSuccess: () => {
      toast.success('Stock adjusted');
      setAdjustFor(null);
      invalidateAll();
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku ?? '',
      category: p.category ?? '',
      brand: p.brand ?? '',
      description: p.description ?? '',
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      stockQuantity: String(p.stockQuantity),
      lowStockThreshold: String(p.lowStockThreshold),
      supplier: p.supplier ?? '',
      status: p.status,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const setField = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.sellingPrice || Number(form.sellingPrice) < 0) errs.sellingPrice = 'Enter a valid price';
    if (Number(form.stockQuantity) < 0) errs.stockQuantity = 'Cannot be negative';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    saveMutation.mutate({ id: editing?.id, data: form });
  };

  const handleDelete = async (p: Product) => {
    const ok = await confirm({
      title: 'Delete Product',
      message: `Delete "${p.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
    });
    if (ok) deleteMutation.mutate(p.id);
  };

  const openStockIn = (p: Product) => {
    setStockInFor(p);
    setStockInQty('');
    setStockInPrice('');
  };

  const handleStockIn = () => {
    if (!stockInFor) return;
    const qty = Number(stockInQty);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    stockInMutation.mutate({
      id: stockInFor.id,
      quantity: qty,
      purchasePrice: stockInPrice ? Number(stockInPrice) : undefined,
    });
  };

  const openAdjust = (p: Product) => {
    setAdjustFor(p);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustReason('');
  };

  const handleAdjust = () => {
    if (!adjustFor) return;
    const qty = Number(adjustQty);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (adjustType === 'subtract' && qty > adjustFor.stockQuantity) {
      toast.error('Cannot subtract more than the current stock');
      return;
    }
    adjustMutation.mutate({ id: adjustFor.id, quantity: qty, type: adjustType, reason: adjustReason });
  };

  const isLowStock = (p: Product) => p.status === 'active' && p.stockQuantity <= p.lowStockThreshold;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage the academy's retail inventory"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Products' },
        ]}
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Products" value={pagination?.total ?? products.length} icon={<Package className="h-5 w-5" />} color="blue" />
        <StatCard
          title="Low Stock Items"
          value={lowStockProducts.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={lowStockProducts.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Inventory Value (Cost)"
          value={formatINR(products.reduce((sum, p) => sum + Number(p.purchasePrice || 0) * Number(p.stockQuantity || 0), 0))}
          icon={<PackagePlus className="h-5 w-5" />}
          color="amber"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, SKU, category, brand..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} columns={12} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No products found"
          description="Add your first product or adjust your search."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Purchase</TableHead>
                  <TableHead className="text-right">Selling</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-sm font-semibold text-indigo-600">
                            {getInitials(p.name)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{p.name}</div>
                          {p.description && <div className="text-xs text-slate-500 line-clamp-1">{p.description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{p.sku || '—'}</TableCell>
                    <TableCell className="text-sm">{p.category || '—'}</TableCell>
                    <TableCell className="text-sm">{p.brand || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{formatINR(p.purchasePrice)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatINR(p.sellingPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={isLowStock(p) ? 'font-semibold text-red-600' : 'font-medium text-slate-900'}>
                          {p.stockQuantity}
                        </span>
                        {isLowStock(p) && <Badge variant="danger">Low</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{p.supplier || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[p.status] || 'default'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Stock In" onClick={() => openStockIn(p)}>
                          <PackagePlus className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Adjust" onClick={() => openAdjust(p)}>
                          <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4 text-indigo-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
              </p>
              <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <Modal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowFormModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>
              {editing ? 'Update Product' : 'Add Product'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            error={formErrors.name}
            placeholder="e.g. Yonex Mavis 350 Shuttlecock"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="SKU" value={form.sku} onChange={(e) => setField('sku', e.target.value)} />
            <Input label="Brand" value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
          </div>
          <Input label="Category" value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="e.g. Shuttlecocks, Rackets, Strings" />
          <Input label="Description" value={form.description} onChange={(e) => setField('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase Price"
              type="number"
              min={0}
              value={form.purchasePrice}
              onChange={(e) => setField('purchasePrice', e.target.value)}
            />
            <Input
              label="Selling Price"
              type="number"
              min={0}
              value={form.sellingPrice}
              onChange={(e) => setField('sellingPrice', e.target.value)}
              error={formErrors.sellingPrice}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stock Quantity"
              type="number"
              min={0}
              value={form.stockQuantity}
              onChange={(e) => setField('stockQuantity', e.target.value)}
              error={formErrors.stockQuantity}
            />
            <Input
              label="Low Stock Threshold"
              type="number"
              min={0}
              value={form.lowStockThreshold}
              onChange={(e) => setField('lowStockThreshold', e.target.value)}
            />
          </div>
          <Input label="Supplier" value={form.supplier} onChange={(e) => setField('supplier', e.target.value)} />
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </Select>
        </div>
      </Modal>

      <Modal
        open={!!stockInFor}
        onClose={() => setStockInFor(null)}
        title={stockInFor ? `Stock In - ${stockInFor.name}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStockInFor(null)}>
              Cancel
            </Button>
            <Button onClick={handleStockIn} loading={stockInMutation.isPending}>
              <PackagePlus className="h-4 w-4" />
              Add Stock
            </Button>
          </>
        }
      >
        {stockInFor && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Current stock: <span className="font-semibold text-slate-900">{stockInFor.stockQuantity}</span>
            </p>
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={stockInQty}
              onChange={(e) => setStockInQty(e.target.value)}
              placeholder="e.g. 10"
            />
            <Input
              label="Purchase Price (optional)"
              type="number"
              min={0}
              value={stockInPrice}
              onChange={(e) => setStockInPrice(e.target.value)}
              placeholder="Per unit cost for this lot"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!adjustFor}
        onClose={() => setAdjustFor(null)}
        title={adjustFor ? `Adjust Stock - ${adjustFor.name}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustFor(null)}>
              Cancel
            </Button>
            <Button variant={adjustType === 'subtract' ? 'danger' : 'primary'} onClick={handleAdjust} loading={adjustMutation.isPending}>
              <SlidersHorizontal className="h-4 w-4" />
              Adjust Stock
            </Button>
          </>
        }
      >
        {adjustFor && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Current stock: <span className="font-semibold text-slate-900">{adjustFor.stockQuantity}</span>
            </p>
            <Select label="Adjustment Type" value={adjustType} onChange={(e) => setAdjustType(e.target.value as 'add' | 'subtract')}>
              <option value="add">Add to stock</option>
              <option value="subtract">Subtract from stock</option>
            </Select>
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. 2"
            />
            <Input
              label="Reason"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Damaged item, count correction"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}