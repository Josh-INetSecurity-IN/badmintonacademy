import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { getStudents, createStudent, archiveStudent, exportStudents } from '@/services/students';
import { getCoachingBatches } from '@/services/batches';
import { formatINR, formatDate, getInitials, buildWhatsAppLink, downloadCSV } from '@/utils/format';
import type { Student, PaginatedData } from '@/types';
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
import { Plus, Download, Search, Eye, MessageCircle, Archive, Users, Loader2 } from 'lucide-react';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'danger',
  graduated: 'info',
  left: 'warning',
};

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  parentName: '',
  parentPhone: '',
  phone: '',
  email: '',
  address: '',
  emergencyContact: '',
  medicalNotes: '',
  joiningDate: new Date().toISOString().split('T')[0],
  skillLevel: 'beginner',
  coachingProgram: '',
  monthlyFee: '',
  admissionFee: '',
  discount: '0',
  feeDueDay: '',
  status: 'active',
};

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, skillFilter, batchFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, search, statusFilter, skillFilter, batchFilter],
    queryFn: () =>
      getStudents({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
        skillLevel: skillFilter || undefined,
        batchId: batchFilter || undefined,
      }),
  });

  const { data: batchData } = useQuery({
    queryKey: ['coaching-batches-list'],
    queryFn: () => getCoachingBatches({ limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: typeof EMPTY_FORM) => {
      const payload = {
        ...formData,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : 0,
        admissionFee: formData.admissionFee ? Number(formData.admissionFee) : 0,
        discount: formData.discount ? Number(formData.discount) : 0,
        feeDueDay: formData.feeDueDay ? Number(formData.feeDueDay) : undefined,
      };
      return createStudent(payload);
    },
    onSuccess: () => {
      toast.success('Student added successfully');
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveStudent,
    onSuccess: () => {
      toast.success('Student archived');
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleArchive = async (student: Student) => {
    const ok = await confirm({
      title: 'Archive Student',
      message: `Are you sure you want to archive ${student.firstName} ${student.lastName}?`,
      confirmText: 'Archive',
    });
    if (ok) archiveMutation.mutate(student.id);
  };

  const handleExport = async () => {
    try {
      const blob = await exportStudents();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Students exported');
    } catch (err) {
      toast.error(handleError(err));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
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

  const batches = batchData?.items ?? [];
  const students = data?.items ?? [];
  const pagination = data?.pagination;

  const getBatchName = (student: Student) => {
    const bs = student.batchStudents;
    if (!bs || bs.length === 0) return '-';
    const active = bs.find((b) => b.status === 'active');
    if (active?.batch) return active.batch.name;
    if (bs[0]?.batch) return bs[0].batch.name;
    return '-';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage coaching academy students"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Students' },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, phone, admission no..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="graduated">Graduated</option>
          <option value="left">Left</option>
        </Select>
        <Select label="Skill Level" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>
        <Select label="Batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} columns={9} />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No students found"
          description="Add your first student or adjust your filters."
          action={
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Skill Level</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Monthly Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.admissionNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {s.photo ? (
                          <img
                            src={s.photo}
                            alt={`${s.firstName} ${s.lastName}`}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                            {getInitials(`${s.firstName} ${s.lastName}`)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">
                            {s.firstName} {s.lastName}
                          </div>
                          {s.phone && <div className="text-xs text-slate-500">{s.phone}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.parentName || '-'}</div>
                      {s.parentPhone && <div className="text-xs text-slate-500">{s.parentPhone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{s.skillLevel}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getBatchName(s)}</TableCell>
                    <TableCell className="text-sm">{formatINR(s.monthlyFee)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[s.status] || 'default'}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(s.joiningDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/students/${s.id}`}>
                          <Button variant="ghost" size="icon" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {s.parentPhone && (
                          <a
                            href={buildWhatsAppLink(
                              s.parentPhone,
                              `Hello ${s.parentName || 'Parent'}, this is a message from the Badminton Academy regarding ${s.firstName} ${s.lastName}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" title="WhatsApp Parent">
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Archive"
                          onClick={() => handleArchive(s)}
                          loading={archiveMutation.isPending}
                        >
                          <Archive className="h-4 w-4 text-slate-400" />
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} students
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
        title="Add New Student"
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
              Add Student
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
            <Select label="Gender" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Input
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Parent Name"
              value={form.parentName}
              onChange={(e) => setField('parentName', e.target.value)}
            />
            <Input
              label="Parent Phone"
              value={form.parentPhone}
              onChange={(e) => setField('parentPhone', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </div>
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
          <Input
            label="Medical Notes"
            value={form.medicalNotes}
            onChange={(e) => setField('medicalNotes', e.target.value)}
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
              label="Skill Level"
              value={form.skillLevel}
              onChange={(e) => setField('skillLevel', e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <Input
            label="Coaching Program"
            value={form.coachingProgram}
            onChange={(e) => setField('coachingProgram', e.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Monthly Fee"
              type="number"
              value={form.monthlyFee}
              onChange={(e) => setField('monthlyFee', e.target.value)}
            />
            <Input
              label="Admission Fee"
              type="number"
              value={form.admissionFee}
              onChange={(e) => setField('admissionFee', e.target.value)}
            />
            <Input
              label="Discount"
              type="number"
              value={form.discount}
              onChange={(e) => setField('discount', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Fee Due Day"
              type="number"
              min={1}
              max={31}
              value={form.feeDueDay}
              onChange={(e) => setField('feeDueDay', e.target.value)}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setField('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
