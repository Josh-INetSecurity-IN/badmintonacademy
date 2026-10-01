import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, confirm } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatINR } from '@/utils/format';
import { getCourts, createCourt, updateCourt, deleteCourt } from '@/services/courts';
import type { Court } from '@/types';

const emptyForm = {
  name: '',
  courtType: 'indoor',
  surfaceType: '',
  location: '',
  hourlyRate: '',
  status: 'available',
  notes: '',
};

export default function CourtsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['courts'],
    queryFn: () => getCourts({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => createCourt(d),
    onSuccess: () => {
      toast.success('Court created');
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      setShowModal(false);
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: (d: { id: number; data: any }) => updateCourt(d.id, d.data),
    onSuccess: () => {
      toast.success('Court updated');
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      setShowModal(false);
      setEditingCourt(null);
    },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCourt(id),
    onSuccess: () => {
      toast.success('Court deleted');
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    },
    onError: handleError,
  });

  const openCreate = () => { setEditingCourt(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (c: Court) => {
    setEditingCourt(c);
    setForm({
      name: c.name,
      courtType: c.courtType,
      surfaceType: c.surfaceType || '',
      location: c.location || '',
      hourlyRate: c.hourlyRate,
      status: c.status,
      notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingCourt) {
      updateMutation.mutate({ id: editingCourt.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const courts: Court[] = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Courts" actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Court</Button>} />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : courts.length === 0 ? (
        <EmptyState title="No courts" description="Add your first court." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.courtType}</TableCell>
                  <TableCell className="capitalize">{c.surfaceType || '-'}</TableCell>
                  <TableCell>{c.location || '-'}</TableCell>
                  <TableCell>{formatINR(c.hourlyRate)}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'available' ? 'success' : c.status === 'maintenance' ? 'danger' : 'default'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{c.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={async () => {
                        if (await confirm('Delete this court?')) deleteMutation.mutate(c.id);
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingCourt(null); }}
        title={editingCourt ? 'Edit Court' : 'Add Court'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Court Name</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Court Type</label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.courtType} onChange={(e) => setForm((f) => ({ ...f, courtType: e.target.value }))}>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="semi-indoor">Semi-Indoor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Surface Type</label>
            <Input value={form.surfaceType} onChange={(e) => setForm((f) => ({ ...f, surfaceType: e.target.value }))} placeholder="e.g. Synthetic, Wooden" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hourly Rate (₹)</label>
            <Input type="number" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowModal(false); setEditingCourt(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingCourt ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
