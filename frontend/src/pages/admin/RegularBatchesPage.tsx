import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { Plus, Edit, Trash2, LayoutGrid, List, Eye, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, confirm } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { formatINR, formatDate } from '@/utils/format';
import {
  getRegularBatches,
  getRegularBatch,
  getRegularBatchWeeklySchedule,
  createRegularBatch,
  updateRegularBatch,
  deleteRegularBatch,
  assignPlayersToRegularBatch,
  removePlayerFromRegularBatch,
} from '@/services/batches';
import { getCourts } from '@/services/courts';
import { getRegularPlayers } from '@/services/players';
import type { RegularBatch, Court, RegularPlayer } from '@/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_COLS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

function normalizeDay(d: string): string {
  return d.toLowerCase().trim();
}

const emptyForm = {
  name: '',
  courtId: null as number | null,
  daysOfWeek: [] as string[],
  startTime: '06:00',
  endTime: '07:30',
  maxPlayers: 8,
  monthlyPrice: '',
  startDate: '',
  status: 'active',
  notes: '',
};

export default function RegularBatchesPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingBatch, setEditingBatch] = useState<RegularBatch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<RegularBatch | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['regular-batches'],
    queryFn: () => getRegularBatches({ limit: 100 }),
  });

  const { data: weeklySchedule } = useQuery({
    queryKey: ['regular-weekly-schedule'],
    queryFn: getRegularBatchWeeklySchedule,
    enabled: view === 'grid',
  });

  const { data: courtsData } = useQuery({
    queryKey: ['courts-for-regular'],
    queryFn: () => getCourts({ limit: 100 }),
  });
  const courts: Court[] = courtsData?.items ?? [];

  const { data: detailBatch } = useQuery({
    queryKey: ['regular-batch-detail', selectedBatch?.id],
    queryFn: () => getRegularBatch(selectedBatch!.id),
    enabled: !!selectedBatch?.id && showDetail,
  });

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['regular-players', 'assignable'],
    queryFn: () => getRegularPlayers({ limit: 500 }),
    enabled: showAssign,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => createRegularBatch(d),
    onSuccess: () => {
      toast.success('Batch created');
      queryClient.invalidateQueries({ queryKey: ['regular-batches'] });
      queryClient.invalidateQueries({ queryKey: ['regular-weekly-schedule'] });
      setShowModal(false);
    },
    onError: handleError,
  });

  const updateMutation = useMutation({
    mutationFn: (d: { id: number; data: any }) => updateRegularBatch(d.id, d.data),
    onSuccess: () => {
      toast.success('Batch updated');
      queryClient.invalidateQueries({ queryKey: ['regular-batches'] });
      queryClient.invalidateQueries({ queryKey: ['regular-weekly-schedule'] });
      setShowModal(false);
      setEditingBatch(null);
      if (selectedBatch) queryClient.invalidateQueries({ queryKey: ['regular-batch-detail', selectedBatch.id] });
    },
    onError: handleError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRegularBatch(id),
    onSuccess: () => {
      toast.success('Batch deleted');
      queryClient.invalidateQueries({ queryKey: ['regular-batches'] });
      queryClient.invalidateQueries({ queryKey: ['regular-weekly-schedule'] });
      setShowDetail(false);
      setSelectedBatch(null);
    },
    onError: handleError,
  });

  const assignMutation = useMutation({
    mutationFn: (playerIds: number[]) => assignPlayersToRegularBatch(selectedBatch!.id, playerIds),
    onSuccess: () => {
      toast.success('Players assigned to batch');
      queryClient.invalidateQueries({ queryKey: ['regular-batch-detail', selectedBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ['regular-batches'] });
      queryClient.invalidateQueries({ queryKey: ['regular-weekly-schedule'] });
      setShowAssign(false);
      setSelectedPlayers([]);
    },
    onError: (err: unknown) => toast.error(handleError(err)),
  });

  const removePlayerMutation = useMutation({
    mutationFn: (playerId: number) => removePlayerFromRegularBatch(selectedBatch!.id, playerId),
    onSuccess: () => {
      toast.success('Player removed from batch');
      queryClient.invalidateQueries({ queryKey: ['regular-batch-detail', selectedBatch?.id] });
      queryClient.invalidateQueries({ queryKey: ['regular-batches'] });
      queryClient.invalidateQueries({ queryKey: ['regular-weekly-schedule'] });
    },
    onError: (err: unknown) => toast.error(handleError(err)),
  });

  const batches = data?.items ?? [];
  const schedule: Record<string, any[]> = (weeklySchedule as Record<string, any[]>) ?? {};

  const openCreate = () => { setEditingBatch(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (b: RegularBatch) => {
    setEditingBatch(b);
    setForm({
      name: b.name,
      courtId: b.courtId ?? null,
      daysOfWeek: parseDays(b.daysOfWeek),
      startTime: b.startTime,
      endTime: b.endTime,
      maxPlayers: b.maxPlayers,
      monthlyPrice: b.monthlyPrice,
      startDate: b.startDate,
      status: b.status,
      notes: b.notes || '',
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
    setForm((f) => ({ ...f, daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d) => d !== day) : [...f.daysOfWeek, day] }));
  };

  const openDetail = (b: RegularBatch) => { setSelectedBatch(b); setShowDetail(true); };

  const detailData = detailBatch as RegularBatch | undefined;
  const detailPlayers = (detailData?.players ?? []) as any[];
  const enrolledPlayerIds = new Set(detailPlayers.map((p: any) => p.playerId ?? p.player?.id));
  const allPlayers = (playersData?.items ?? []) as RegularPlayer[];
  const availablePlayers = allPlayers.filter((p) => !enrolledPlayerIds.has(p.id) && p.status !== 'archived');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regular Play Batches"
        actions={
          <div className="flex gap-2">
            <Button variant={view === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setView('grid')}><LayoutGrid className="h-4 w-4" /></Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Batch</Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : batches.length === 0 ? (
        <EmptyState title="No regular batches" description="Create a regular play batch." />
      ) : view === 'grid' ? (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[900px]">
            {DAYS.map((day, idx) => {
              const key = DAY_COLS[idx];
              const dayBatches = schedule[key] ?? schedule[day] ?? schedule[day.toLowerCase()] ?? [];
              return (
                <div key={day} className="space-y-2">
                  <div className="text-center font-medium text-sm p-2 bg-muted rounded">{day.slice(0, 3)}</div>
                  {dayBatches.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center p-4 border rounded border-dashed">No batches</div>
                  ) : (
                    dayBatches.map((b: any, i: number) => (
                      <div
                        key={b.id ?? i}
                        className="p-2 rounded border cursor-pointer hover:shadow-md transition-shadow text-xs"
                        style={{ borderLeftColor: '#3b82f6', borderLeftWidth: 3 }}
                        onClick={() => { setSelectedBatch(b); setShowDetail(true); }}
                      >
                        <div className="font-semibold truncate">{b.name}</div>
                        <div className="text-muted-foreground">{b.court?.name ?? ''}</div>
                        <div>{b.startTime} - {b.endTime}</div>
                        <div>{b._count?.players ?? 0}/{b.maxPlayers} players</div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => {
                const days = parseDays(b.daysOfWeek);
                const count = (b as any)._count?.players ?? 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.court?.name ?? '-'}</TableCell>
                    <TableCell className="text-sm">{days.map((d) => d.slice(0, 3)).join(', ')}</TableCell>
                    <TableCell>{b.startTime} - {b.endTime}</TableCell>
                    <TableCell>{count}/{b.maxPlayers}</TableCell>
                    <TableCell>{formatINR(b.monthlyPrice)}</TableCell>
                    <TableCell><Badge variant={b.status === 'active' ? 'success' : 'default'}>{b.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(b)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditingBatch(null); }} title={editingBatch ? 'Edit Regular Batch' : 'Add Regular Batch'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Batch Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Court</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.courtId ?? ''} onChange={(e) => setForm((f) => ({ ...f, courtId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Select Court</option>
                {courts.map((c: Court) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Players</label>
              <Input type="number" value={form.maxPlayers} onChange={(e) => setForm((f) => ({ ...f, maxPlayers: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Price (₹)</label>
              <Input type="number" value={form.monthlyPrice} onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))} />
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
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
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
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea className="w-full rounded-md border px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowModal(false); setEditingBatch(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingBatch ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => { setShowDetail(false); setSelectedBatch(null); }} title={detailData?.name ?? 'Batch Details'} size="lg">
        {detailData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Court:</span> <span className="font-medium">{detailData.court?.name ?? '-'}</span></div>
              <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{detailData.startTime} - {detailData.endTime}</span></div>
              <div><span className="text-muted-foreground">Days:</span> <span className="font-medium">{parseDays(detailData.daysOfWeek).map((d) => d.slice(0, 3)).join(', ')}</span></div>
              <div><span className="text-muted-foreground">Max Players:</span> <span className="font-medium">{detailData.maxPlayers}</span></div>
              <div><span className="text-muted-foreground">Monthly Price:</span> <span className="font-medium">{formatINR(detailData.monthlyPrice)}</span></div>
              <div><span className="text-muted-foreground">Start Date:</span> <span className="font-medium">{formatDate(detailData.startDate)}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={detailData.status === 'active' ? 'success' : 'default'}>{detailData.status}</Badge></div>
              {detailData.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> <span className="font-medium">{detailData.notes}</span></div>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium">Players ({detailPlayers.length})</h4>
                <Button size="sm" onClick={() => { setSelectedPlayers([]); setShowAssign(true); }}>
                  <UserPlus className="h-4 w-4 mr-1" /> Assign Players
                </Button>
              </div>
              {detailPlayers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No players enrolled.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailPlayers.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.player?.firstName} {p.player?.lastName}</TableCell>
                        <TableCell>{p.player?.phone}</TableCell>
                        <TableCell><Badge variant={p.status === 'active' ? 'success' : 'default'}>{p.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {p.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={removePlayerMutation.isPending}
                              onClick={async () => {
                                if (await confirm(`Remove ${p.player?.firstName ?? 'this player'} from this batch?`)) {
                                  removePlayerMutation.mutate(p.playerId ?? p.player?.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { openEdit(detailData); }}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
                <Button variant="outline" onClick={async () => {
                  if (await confirm('Delete this batch?')) deleteMutation.mutate(detailData.id);
                }} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete</Button>
              </div>
              <Button variant="outline" onClick={() => { setShowDetail(false); setSelectedBatch(null); }}>Close</Button>
            </div>
          </div>
        ) : (
          <Skeleton className="h-40" />
        )}
      </Modal>

      {/* Assign Players Modal */}
      <Modal
        open={showAssign}
        onClose={() => { setShowAssign(false); setSelectedPlayers([]); }}
        title={`Assign Players${detailData ? ` - ${detailData.name}` : ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {playersLoading ? (
            <Skeleton className="h-40" />
          ) : availablePlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available players to assign.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {availablePlayers.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(p.id)}
                    onChange={(e) =>
                      setSelectedPlayers((prev) =>
                        e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                      )
                    }
                  />
                  <div>
                    <div className="font-medium text-sm">{p.firstName} {p.lastName}</div>
                    <div className="text-xs text-muted-foreground">{p.playerId} · {p.phone}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowAssign(false); setSelectedPlayers([]); }}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate(selectedPlayers)}
              disabled={selectedPlayers.length === 0 || assignMutation.isPending}
            >
              Assign {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
