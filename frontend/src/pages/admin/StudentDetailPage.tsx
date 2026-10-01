import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import {
  getStudent,
  updateStudent,
  assignBatch,
  removeFromBatch,
  transferBatch,
} from '@/services/students';
import { getCoachingBatches } from '@/services/batches';
import {
  formatINR,
  formatDate,
  getAge,
  getInitials,
  buildWhatsAppLink,
} from '@/utils/format';
import type { Student, BatchStudent } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Printer,
  IndianRupee,
  CheckCircle,
  AlertTriangle,
  CalendarCheck,
  UserPlus,
  RefreshCw,
  UserMinus,
  Loader2,
} from 'lucide-react';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'danger',
  graduated: 'info',
  left: 'warning',
  paid: 'success',
  pending: 'warning',
  partial: 'info',
  overdue: 'danger',
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'info',
};

function parseDays(daysOfWeek: string | string[]): string[] {
  if (Array.isArray(daysOfWeek)) return daysOfWeek;
  try {
    const parsed = JSON.parse(daysOfWeek);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return daysOfWeek ? daysOfWeek.split(',').map((d) => d.trim()) : [];
  }
}

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
  joiningDate: '',
  skillLevel: 'beginner',
  coachingProgram: '',
  monthlyFee: '',
  admissionFee: '',
  discount: '0',
  feeDueDay: '',
  status: 'active',
  notes: '',
};

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const studentId = Number(id);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [assignBatchId, setAssignBatchId] = useState('');
  const [transferFromBatchId, setTransferFromBatchId] = useState('');
  const [transferToBatchId, setTransferToBatchId] = useState('');

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId),
    enabled: !!studentId,
  });

  const { data: batchData } = useQuery({
    queryKey: ['coaching-batches-list'],
    queryFn: () => getCoachingBatches({ limit: 200 }),
  });

  const updateMutation = useMutation({
    mutationFn: (formData: typeof EMPTY_FORM) => {
      const payload = {
        ...formData,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : 0,
        admissionFee: formData.admissionFee ? Number(formData.admissionFee) : 0,
        discount: formData.discount ? Number(formData.discount) : 0,
        feeDueDay: formData.feeDueDay ? Number(formData.feeDueDay) : undefined,
      };
      return updateStudent(studentId, payload);
    },
    onSuccess: () => {
      toast.success('Student updated');
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setShowEditModal(false);
    },
    onError: (err: unknown) => toast.error(handleError(err)),
  });

  const assignMutation = useMutation({
    mutationFn: (batchId: number) => assignBatch(studentId, batchId),
    onSuccess: () => {
      toast.success('Batch assigned');
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setAssignBatchId('');
    },
    onError: (err: unknown) => toast.error(handleError(err)),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFromBatch(studentId),
    onSuccess: () => {
      toast.success('Removed from batch');
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
    },
    onError: (err: unknown) => toast.error(handleError(err)),
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!transferFromBatchId || !transferToBatchId) throw new Error('Select both batches');
      return transferBatch(studentId, Number(transferFromBatchId), Number(transferToBatchId));
    },
    onSuccess: () => {
      toast.success('Batch transferred');
      queryClient.invalidateQueries({ queryKey: ['student', studentId] });
      setTransferFromBatchId('');
      setTransferToBatchId('');
    },
    onError: (err: unknown) => toast.error(handleError(err)),
  });

  const openEdit = () => {
    if (!student) return;
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      medicalNotes: student.medicalNotes || '',
      joiningDate: student.joiningDate ? student.joiningDate.split('T')[0] : '',
      skillLevel: student.skillLevel || 'beginner',
      coachingProgram: student.coachingProgram || '',
      monthlyFee: String(student.monthlyFee || ''),
      admissionFee: String(student.admissionFee || ''),
      discount: String(student.discount || '0'),
      feeDueDay: student.feeDueDay ? String(student.feeDueDay) : '',
      status: student.status || 'active',
      notes: student.notes || '',
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = () => {
    if (!validate()) return;
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-12 w-12" />}
        title="Student not found"
        description="This student may have been deleted or you don't have access."
        action={
          <Button onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Students
          </Button>
        }
      />
    );
  }

  const batches = batchData?.items ?? [];
  const batchStudents = student.batchStudents ?? [];
  const payments = (student as Record<string, unknown>).payments as
    | { receiptNumber: string; amount: string; finalAmount: string; paymentMethod: string; paymentDate: string; status: string }[]
    | undefined;
  const feeInvoices = (student as Record<string, unknown>).feeInvoices as
    | {
        id: number;
        invoiceNumber: string;
        billingMonth: string;
        amount: string;
        discount: string;
        tax: string;
        totalAmount: string;
        paidAmount: string;
        dueDate: string;
        status: string;
      }[]
    | undefined;
  const attendances = (student as Record<string, unknown>).attendances as
    | { id: number; date: string; status: string; notes?: string | null }[]
    | undefined;

  const totalPaid = payments
    ? payments.reduce((sum, p) => sum + Number(p.finalAmount || 0), 0)
    : 0;

  const pendingFees = feeInvoices
    ? feeInvoices.reduce(
        (sum, inv) => sum + (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0)),
        0
      )
    : 0;

  const attendanceList = attendances ?? [];
  const totalSessions = attendanceList.length;
  const presentCount = attendanceList.filter((a) => a.status === 'present').length;
  const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  const whatsappMessage = `Hello ${student.parentName || 'Parent'}, this is a message from the Badminton Academy regarding ${student.firstName} ${student.lastName}.`;

  const tabs = [
    {
      value: 'overview',
      label: 'Overview',
      content: (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Admission Number" value={student.admissionNumber} />
              <InfoRow label="Full Name" value={`${student.firstName} ${student.lastName}`} />
              <InfoRow label="Gender" value={student.gender || '-'} />
              <InfoRow
                label="Date of Birth"
                value={
                  student.dateOfBirth
                    ? `${formatDate(student.dateOfBirth)} (${getAge(student.dateOfBirth)} yrs)`
                    : '-'
                }
              />
              <InfoRow label="Parent Name" value={student.parentName || '-'} />
              <InfoRow label="Parent Phone" value={student.parentPhone || '-'} />
              <InfoRow label="Phone" value={student.phone || '-'} />
              <InfoRow label="Email" value={student.email || '-'} />
              <InfoRow label="Address" value={student.address || '-'} className="sm:col-span-2" />
              <InfoRow label="Status" value={student.status} badge />
              <InfoRow label="Joining Date" value={formatDate(student.joiningDate)} />
              <InfoRow label="Skill Level" value={student.skillLevel} />
              <InfoRow
                label="Batch"
                value={
                  batchStudents.length > 0
                    ? batchStudents
                        .map((bs) => bs.batch?.name || `Batch #${bs.batchId}`)
                        .join(', ')
                    : '-'
                }
              />
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'personal',
      label: 'Personal Details',
      content: (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Emergency Contact" value={student.emergencyContact || '-'} className="sm:col-span-2" />
              <InfoRow label="Medical Notes" value={student.medicalNotes || '-'} className="sm:col-span-2" />
              <InfoRow label="Notes" value={student.notes || '-'} className="sm:col-span-2" />
              <InfoRow label="Coaching Program" value={student.coachingProgram || '-'} />
              <InfoRow label="Monthly Fee" value={formatINR(student.monthlyFee)} />
              <InfoRow label="Admission Fee" value={formatINR(student.admissionFee)} />
              <InfoRow label="Discount" value={formatINR(student.discount)} />
              <InfoRow label="Fee Due Day" value={student.feeDueDay ? String(student.feeDueDay) : '-'} />
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'batch',
      label: 'Batch & Coaching',
      content: (
        <div className="space-y-5">
          {batchStudents.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<UserPlus className="h-8 w-8" />}
                  title="Not assigned to any batch"
                  description="Assign this student to a coaching batch below."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Current Batches</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Coach</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchStudents.map((bs: BatchStudent) => (
                      <TableRow key={bs.id}>
                        <TableCell className="font-medium">{bs.batch?.name || `Batch #${bs.batchId}`}</TableCell>
                        <TableCell className="text-sm">
                          {bs.batch ? parseDays(bs.batch.daysOfWeek).join(', ') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {bs.batch ? `${bs.batch.startTime} - ${bs.batch.endTime}` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {bs.batch?.coach
                            ? `${bs.batch.coach.firstName} ${bs.batch.coach.lastName}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[bs.status] || 'default'}>{bs.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Assign to Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Select
                    label="Select Batch"
                    value={assignBatchId}
                    onChange={(e) => setAssignBatchId(e.target.value)}
                  >
                    <option value="">Choose a batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.skillLevel})
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  disabled={!assignBatchId}
                  onClick={() => assignBatchId && assignMutation.mutate(Number(assignBatchId))}
                  loading={assignMutation.isPending}
                >
                  <UserPlus className="h-4 w-4" />
                  Assign
                </Button>
              </div>
            </CardContent>
          </Card>

          {batchStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Transfer Batch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <Select
                    label="From Batch"
                    value={transferFromBatchId}
                    onChange={(e) => setTransferFromBatchId(e.target.value)}
                  >
                    <option value="">Select</option>
                    {batchStudents
                      .filter((bs) => bs.batch)
                      .map((bs) => (
                        <option key={bs.batchId} value={bs.batchId}>
                          {bs.batch!.name}
                        </option>
                      ))}
                  </Select>
                  <Select
                    label="To Batch"
                    value={transferToBatchId}
                    onChange={(e) => setTransferToBatchId(e.target.value)}
                  >
                    <option value="">Select</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    disabled={!transferFromBatchId || !transferToBatchId}
                    onClick={() => transferMutation.mutate()}
                    loading={transferMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {batchStudents.some((bs) => bs.status === 'active') && (
            <Card>
              <CardHeader>
                <CardTitle>Remove from Batch</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="danger"
                  onClick={() => removeMutation.mutate()}
                  loading={removeMutation.isPending}
                >
                  <UserMinus className="h-4 w-4" />
                  Remove from Current Batch
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ),
    },
    {
      value: 'fees',
      label: 'Fees',
      content: (
        <Card>
          {!feeInvoices || feeInvoices.length === 0 ? (
            <CardContent>
              <EmptyState title="No fee invoices" description="Fee invoices will appear here once generated." />
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Fee Invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">{inv.billingMonth}</TableCell>
                        <TableCell className="text-sm">{formatINR(inv.amount)}</TableCell>
                        <TableCell className="text-sm">{formatINR(inv.discount)}</TableCell>
                        <TableCell className="text-sm">{formatINR(inv.tax)}</TableCell>
                        <TableCell className="text-sm font-medium">{formatINR(inv.totalAmount)}</TableCell>
                        <TableCell className="text-sm">{formatINR(inv.paidAmount)}</TableCell>
                        <TableCell className="text-sm">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[inv.status] || 'default'}>{inv.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          )}
        </Card>
      ),
    },
    {
      value: 'payments',
      label: 'Payments',
      content: (
        <Card>
          {!payments || payments.length === 0 ? (
            <CardContent>
              <EmptyState title="No payments" description="Payment records will appear here." />
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                        <TableCell className="text-sm font-medium">{formatINR(p.finalAmount)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.paymentMethod.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-sm">{formatDate(p.paymentDate)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[p.status] || 'default'}>{p.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          )}
        </Card>
      ),
    },
    {
      value: 'attendance',
      label: 'Attendance',
      content: (
        <Card>
          {attendanceList.length === 0 ? (
            <CardContent>
              <EmptyState title="No attendance records" description="Attendance data will appear here." />
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceList.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{formatDate(a.date)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[a.status] || 'default'}>{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{a.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          )}
        </Card>
      ),
    },
    {
      value: 'notes',
      label: 'Notes',
      content: (
        <Card>
          <CardContent>
            {student.notes ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{student.notes}</p>
            ) : (
              <EmptyState title="No notes" description="Add notes about this student from the edit form." />
            )}
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={student.admissionNumber}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Students', href: '/admin/students' },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={openEdit}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            {student.parentPhone && (
              <a
                href={buildWhatsAppLink(student.parentPhone, whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp
                </Button>
              </a>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Fee"
          value={formatINR(student.monthlyFee)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Total Paid"
          value={formatINR(totalPaid)}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Pending Fees"
          value={formatINR(pendingFees)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Attendance"
          value={`${attendancePct}%`}
          icon={<CalendarCheck className="h-5 w-5" />}
          color="amber"
        />
      </div>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Student"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} loading={updateMutation.isPending}>
              Save Changes
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
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
              <option value="left">Left</option>
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

function InfoRow({
  label,
  value,
  badge,
  className,
}: {
  label: string;
  value: string;
  badge?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">
        {badge ? <Badge variant={STATUS_BADGE[value] || 'default'}>{value}</Badge> : value}
      </dd>
    </div>
  );
}
