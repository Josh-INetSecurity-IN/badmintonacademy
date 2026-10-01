import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { Plus, Search, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal, confirm } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatINR, formatDate } from '@/utils/format';
import {
  getCoachingBatches,
  createCoachingBatch,
  updateCoachingBatch,
  deleteCoachingBatch,
  getCoaches,
} from '@/services/batches';
import { getCourts } from '@/services/courts';
import type { CoachingBatch, ApiUser, Court } from '@/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseDays(val: string[] | string | null | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [val];
  } catch {
    return val.split(',').map((d) => d.trim()).filter(Boolean);
  }
}

const emptyBatch = {
  name: '',
  programType: 'badminton',
  skillLevel: 'beginner',
  ageGroup: '',
  coachId: null as number | null,
  courtId: null as number | null,
  maxCapacity: 16,
  daysOfWeek: [] as string[],
  startTime: '06:00',
  endTime: '07:30',
  startDate: '',
  endDate: '',
  monthlyFee: '',
  registrationFee: '',
  description: '',
  color: '#3b82f6',
  status: 'active',
};

export default function CoachingBatchesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<CoachingBatch | null>(null);
  const [form, setForm] = useState(emptyBatch);

  const { data, isLoading } = useQuery({
    queryKey: ['coaching-batches', page, search, statusFilter],
    queryFn: () =>
      getCoachingBatches({
        page,
        limit: 15,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      }),
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches'],
    queryFn: getCoaches,
  });

  const { data: courtsData } = useQuery({
    queryKey: ['courts-for-batches'],
    queryFn: () => getCourts({ limit: 100 }),
  });
  const courts: Court[] = courtsData?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => createCoachingBatch(d),
    onSuccess: () => {
      toast.success('Batch created');
      queryClient.invalidateQueries({ queryKey: ['coaching-batches'] });
      setShowModal(false);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error(err.response.data?.message || 'Conflict: batch overlaps with existing schedule');
      } else {
        handleError(err);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: { id: number; data: typeof form }) => updateCoachingBatch(d.id, d.data),
    onSuccess: () => {
      toast.success('Batch updated');
      queryClient.invalidateQueries({ queryKey: ['coaching-batches'] });
      setShowModal(false);
      setEditingBatch(null);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error(err.response.data?.message || 'Conflict: schedule overlap');
      } else {
        handleError(err);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCoachingBatch(id),
    onSuccess: () => {
      toast.success('Batch deleted');
      queryClient.invalidateQueries({ queryKey: ['coaching-batches'] });
    },
    onError: handleError,
  });

  const openCreate = () => {
    setEditingBatch(null);
    setForm({ ...emptyBatch });
    setShowModal(true);
  };

  const openEdit = (batch: CoachingBatch) => {
    setEditingBatch(batch);
    setForm({
      name: batch.name,
      programType: batch.programType,
      skillLevel: batch.skillLevel,
      ageGroup: batch.ageGroup || '',
      coachId: batch.coachId ?? null,
      courtId: batch.courtId ?? null,
      maxCapacity: batch.maxCapacity,
      daysOfWeek: parseDays(batch.daysOfWeek),
      startTime: batch.startTime,
      endTime: batch.endTime,
      startDate: batch.startDate,
      endDate: batch.endDate || '',
      monthlyFee: batch.monthlyFee,
      registrationFee: batch.registrationFee,
      description: batch.description || '',
      color: batch.color || '#3b82f6',
      status: batch.status,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingBatch) {
      updateMutation.mutate({ id: editingBatch.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day],
    }));
  };

  const batches = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader title="Coaching Batches" actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Batch</Button>} />

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search batches..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-40"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="full">Full</option>
            <option value="completed">Completed</option>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : batches.length === 0 ? (
        <EmptyState title="No batches found" description="Create your first coaching batch to get started." />
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => {
                  const days = parseDays(b.daysOfWeek);
                  const enrolled = (b as any)._count?.students ?? 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="font-medium">{b.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{b.coach ? `${b.coach.firstName} ${b.coach.lastName}` : '-'}</TableCell>
                      <TableCell>{b.court?.name ?? '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{days.map((d) => d.slice(0, 3)).join(', ')}</div>
                        <div className="text-xs text-muted-foreground">{b.startTime} - {b.endTime}</div>
                      </TableCell>
                      <TableCell>{enrolled}/{b.maxCapacity}</TableCell>
                      <TableCell>{formatINR(b.monthlyFee)}</TableCell>
                      <TableCell><Badge variant={b.status === 'active' ? 'success' : b.status === 'full' ? 'warning' : b.status === 'completed' ? 'info' : 'default'}>{b.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          {pagination && pagination.totalPages > 1 && (
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingBatch(null); }}
        title={editingBatch ? 'Edit Batch' : 'Add Coaching Batch'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Batch Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Program Type</label>
              <Select value={form.programType} onChange={(e) => setForm((f) => ({ ...f, programType: e.target.value }))}>
                <option value="badminton">Badminton</option>
                <option value="fitness">Fitness</option>
                <option value="tournament">Tournament Prep</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Skill Level</label>
              <Select value={form.skillLevel} onChange={(e) => setForm((f) => ({ ...f, skillLevel: e.target.value }))}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="all">All Levels</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Age Group</label>
              <Input value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} placeholder="e.g. 8-12 years" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coach</label>
              <Select value={form.coachId ?? ''} onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Select Coach</option>
                {coaches.map((c: ApiUser) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Court</label>
              <Select value={form.courtId ?? ''} onChange={(e) => setForm((f) => ({ ...f, courtId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Select Court</option>
                {courts.map((c: Court) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Capacity</label>
              <Input type="number" value={form.maxCapacity} onChange={(e) => setForm((f) => ({ ...f, maxCapacity: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-10 w-full rounded border" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date (optional)</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Fee (₹)</label>
              <Input type="number" value={form.monthlyFee} onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Registration Fee (₹)</label>
              <Input type="number" value={form.registrationFee} onChange={(e) => setForm((f) => ({ ...f, registrationFee: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Days of Week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <label key={day} className={`cursor-pointer px-3 py-1 rounded-full border text-sm ${form.daysOfWeek.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                  <input type="checkbox" className="sr-only" checked={form.daysOfWeek.includes(day)} onChange={() => toggleDay(day)} />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowModal(false); setEditingBatch(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingBatch ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
