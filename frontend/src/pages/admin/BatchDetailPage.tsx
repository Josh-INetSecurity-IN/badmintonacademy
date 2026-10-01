import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { ArrowLeft, Edit, UserPlus, Download, Printer, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal, confirm } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatINR, formatDate, downloadCSV, buildWhatsAppLink } from '@/utils/format';
import {
  getCoachingBatch,
  getBatchRoster,
  updateCoachingBatch,
  assignStudentsToBatch,
  removeStudentFromBatch,
  getCoaches,
} from '@/services/batches';
import { getCourts } from '@/services/courts';
import { getStudents } from '@/services/students';
import type { CoachingBatch, ApiUser, Court, Student } from '@/types';

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

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const batchId = Number(id);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  const { data: batch, isLoading } = useQuery({
    queryKey: ['coaching-batch', batchId],
    queryFn: () => getCoachingBatch(batchId),
    enabled: !!batchId,
  });

  const { data: rosterData } = useQuery({
    queryKey: ['batch-roster', batchId],
    queryFn: () => getBatchRoster(batchId),
    enabled: !!batchId,
  });

  const { data: coaches = [] } = useQuery({ queryKey: ['coaches'], queryFn: getCoaches });
  const { data: courtsData } = useQuery({
    queryKey: ['courts-for-batch'],
    queryFn: () => getCourts({ limit: 100 }),
  });
  const courts: Court[] = courtsData?.items ?? [];

  const { data: allStudentsData } = useQuery({
    queryKey: ['all-students-for-assign'],
    queryFn: () => getStudents({ limit: 500 }),
    enabled: showAssignModal,
  });

  const updateMutation = useMutation({
    mutationFn: (d: { id: number; data: any }) => updateCoachingBatch(d.id, d.data),
    onSuccess: () => {
      toast.success('Batch updated');
      queryClient.invalidateQueries({ queryKey: ['coaching-batch', batchId] });
      setShowEditModal(false);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error(err.response.data?.message || 'Schedule conflict');
      } else {
        handleError(err);
      }
    },
  });

  const assignMutation = useMutation({
    mutationFn: (studentIds: number[]) => assignStudentsToBatch(batchId, studentIds),
    onSuccess: () => {
      toast.success('Students assigned');
      queryClient.invalidateQueries({ queryKey: ['coaching-batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-roster', batchId] });
      setShowAssignModal(false);
      setSelectedStudents([]);
    },
    onError: handleError,
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: number) => removeStudentFromBatch(batchId, studentId),
    onSuccess: () => {
      toast.success('Student removed');
      queryClient.invalidateQueries({ queryKey: ['coaching-batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batch-roster', batchId] });
    },
    onError: handleError,
  });

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (!batch) return <EmptyState title="Batch not found" />;

  const days = parseDays(batch.daysOfWeek);
  const enrolled = (batch as any)._count?.students ?? 0;
  const roster: any[] = Array.isArray(rosterData)
    ? rosterData
    : ((rosterData as any)?.roster ?? (batch as any).students ?? []);

  const openEdit = () => {
    setEditForm({
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
    setShowEditModal(true);
  };

  const toggleEditDay = (day: string) => {
    setEditForm((f: any) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day) ? f.daysOfWeek.filter((d: string) => d !== day) : [...f.daysOfWeek, day],
    }));
  };

  const allStudents: Student[] = (allStudentsData?.items ?? []) as Student[];
  const enrolledIds = new Set(roster.map((r: any) => r.studentId ?? r.student?.id));
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id));

  const handleExportRoster = () => {
    const headers = ['Name', 'Admission No', 'Parent Phone', 'Joining Date', 'Fee', 'Status'];
    const rows = roster.map((r: any) => {
      const s = r.student ?? r;
      return [
        `${s.firstName} ${s.lastName}`,
        s.admissionNumber ?? '',
        s.parentPhone ?? s.phone ?? '',
        formatDate(r.joiningDate ?? s.joiningDate),
        s.monthlyFee ?? '',
        r.status ?? s.status ?? '',
      ];
    });
    downloadCSV(`${batch.name}-roster.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.name}
        subtitle={batch.coach ? `Coach: ${batch.coach.firstName} ${batch.coach.lastName}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button variant="outline" onClick={openEdit}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
            <Button onClick={() => setShowAssignModal(true)}><UserPlus className="h-4 w-4 mr-1" /> Assign Students</Button>
            <Button variant="outline" onClick={handleExportRoster}><Download className="h-4 w-4 mr-1" /> Export Roster</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Enrolled Students" value={String(enrolled)} />
        <StatCard title="Capacity" value={`${enrolled}/${batch.maxCapacity}`} />
        <StatCard title="Monthly Fee" value={formatINR(batch.monthlyFee)} />
        <StatCard title="Attendance" value="-" />
      </div>

      <Card>
        <CardHeader><CardTitle>Batch Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><span className="text-muted-foreground">Program Type:</span> <span className="font-medium capitalize">{batch.programType}</span></div>
            <div><span className="text-muted-foreground">Skill Level:</span> <span className="font-medium capitalize">{batch.skillLevel}</span></div>
            <div><span className="text-muted-foreground">Age Group:</span> <span className="font-medium">{batch.ageGroup || '-'}</span></div>
            <div><span className="text-muted-foreground">Coach:</span> <span className="font-medium">{batch.coach ? `${batch.coach.firstName} ${batch.coach.lastName}` : '-'}</span></div>
            <div><span className="text-muted-foreground">Court:</span> <span className="font-medium">{batch.court?.name ?? '-'}</span></div>
            <div><span className="text-muted-foreground">Days:</span> <span className="font-medium">{days.map((d) => d.slice(0, 3)).join(', ')}</span></div>
            <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{batch.startTime} - {batch.endTime}</span></div>
            <div><span className="text-muted-foreground">Start Date:</span> <span className="font-medium">{formatDate(batch.startDate)}</span></div>
            <div><span className="text-muted-foreground">End Date:</span> <span className="font-medium">{formatDate(batch.endDate)}</span></div>
            <div><span className="text-muted-foreground">Registration Fee:</span> <span className="font-medium">{formatINR(batch.registrationFee)}</span></div>
            <div className="flex items-center gap-2"><span className="text-muted-foreground">Color:</span> <span className="h-4 w-4 rounded-full" style={{ backgroundColor: batch.color }} /></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant={batch.status === 'active' ? 'success' : batch.status === 'full' ? 'warning' : 'default'}>{batch.status}</Badge></div>
            {batch.description && <div className="col-span-full"><span className="text-muted-foreground">Description:</span> <span className="font-medium">{batch.description}</span></div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Students Roster ({roster.length})</CardTitle></CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <EmptyState title="No students enrolled" description="Assign students to this batch." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Parent Contact</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((r: any) => {
                  const s = r.student ?? r;
                  const phone = s.parentPhone ?? s.phone ?? '';
                  return (
                    <TableRow key={r.id ?? s.id}>
                      <TableCell>
                        <div className="font-medium">{s.firstName} {s.lastName}</div>
                        <div className="text-xs text-muted-foreground">{s.admissionNumber}</div>
                      </TableCell>
                      <TableCell>{phone}</TableCell>
                      <TableCell>{formatDate(r.joiningDate ?? s.joiningDate)}</TableCell>
                      <TableCell>{formatINR(s.monthlyFee)}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell><Badge variant={r.status === 'active' ? 'success' : 'default'}>{r.status ?? 'active'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (await confirm('Remove this student from the batch?')) {
                                removeMutation.mutate(r.studentId ?? s.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          {phone && (
                            <a
                              href={buildWhatsAppLink(phone, `Hello, this is a reminder from ${batch.name} batch.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm"><MessageCircle className="h-4 w-4 text-green-600" /></Button>
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Students Modal */}
      <Modal open={showAssignModal} onClose={() => { setShowAssignModal(false); setSelectedStudents([]); }} title="Assign Students" size="lg">
        <div className="space-y-4">
          {availableStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available students to assign.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {availableStudents.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(s.id)}
                    onChange={(e) => setSelectedStudents((prev) => e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id))}
                  />
                  <div>
                    <div className="font-medium text-sm">{s.firstName} {s.lastName}</div>
                    <div className="text-xs text-muted-foreground">{s.admissionNumber}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowAssignModal(false); setSelectedStudents([]); }}>Cancel</Button>
            <Button onClick={() => assignMutation.mutate(selectedStudents)} disabled={selectedStudents.length === 0 || assignMutation.isPending}>
              Assign {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Batch" size="lg">
        {editForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Batch Name</label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Program Type</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={editForm.programType} onChange={(e) => setEditForm((f: any) => ({ ...f, programType: e.target.value }))}>
                  <option value="badminton">Badminton</option>
                  <option value="fitness">Fitness</option>
                  <option value="tournament">Tournament Prep</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Skill Level</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={editForm.skillLevel} onChange={(e) => setEditForm((f: any) => ({ ...f, skillLevel: e.target.value }))}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="all">All Levels</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age Group</label>
                <Input value={editForm.ageGroup} onChange={(e) => setEditForm((f: any) => ({ ...f, ageGroup: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Coach</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={editForm.coachId ?? ''} onChange={(e) => setEditForm((f: any) => ({ ...f, coachId: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">Select Coach</option>
                  {coaches.map((c: ApiUser) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Court</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={editForm.courtId ?? ''} onChange={(e) => setEditForm((f: any) => ({ ...f, courtId: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">Select Court</option>
                  {courts.map((c: Court) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Capacity</label>
                <Input type="number" value={editForm.maxCapacity} onChange={(e) => setEditForm((f: any) => ({ ...f, maxCapacity: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input type="color" value={editForm.color} onChange={(e) => setEditForm((f: any) => ({ ...f, color: e.target.value }))} className="h-10 w-full rounded border" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <Input type="time" value={editForm.startTime} onChange={(e) => setEditForm((f: any) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <Input type="time" value={editForm.endTime} onChange={(e) => setEditForm((f: any) => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Fee</label>
                <Input type="number" value={editForm.monthlyFee} onChange={(e) => setEditForm((f: any) => ({ ...f, monthlyFee: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={editForm.status} onChange={(e) => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="full">Full</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label key={day} className={`cursor-pointer px-3 py-1 rounded-full border text-sm ${editForm.daysOfWeek.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                    <input type="checkbox" className="sr-only" checked={editForm.daysOfWeek.includes(day)} onChange={() => toggleEditDay(day)} />
                    {day.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ id: batchId, data: editForm })} disabled={updateMutation.isPending}>
                Update Batch
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
