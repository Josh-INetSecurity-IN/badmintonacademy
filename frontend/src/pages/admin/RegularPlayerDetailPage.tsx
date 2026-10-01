import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import {
  getRegularPlayer,
  updateRegularPlayer,
  assignPlayerToBatch,
  removePlayerFromBatch,
  pausePlayer,
  resumePlayer,
  renewPlayer,
  getUpcomingSessions,
} from '@/services/players';
import { getRegularBatches } from '@/services/batches';
import { formatINR, formatDate, buildWhatsAppLink } from '@/utils/format';
import type { RegularPlayer, RegularPlayerAssignment } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { confirm } from '@/components/ui/Modal';
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
  AlertTriangle,
  CalendarCheck,
  UserPlus,
  UserMinus,
  RefreshCw,
  Pause,
  Play,
  CalendarClock,
  CreditCard,
} from 'lucide-react';

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  payment_due: 'warning',
  overdue: 'danger',
  expired: 'danger',
  paused: 'info',
  cancelled: 'default',
  paid: 'success',
  pending: 'warning',
  partial: 'info',
  present: 'success',
  absent: 'danger',
  late: 'warning',
};

function parseDays(daysOfWeek: string | string[] | undefined): string[] {
  if (!daysOfWeek) return [];
  if (Array.isArray(daysOfWeek)) return daysOfWeek;
  try {
    const parsed = JSON.parse(daysOfWeek);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return daysOfWeek.split(',').map((d) => d.trim()).filter(Boolean);
  }
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  emergencyContact: '',
  joiningDate: '',
  monthlyFee: '',
  securityDeposit: '',
  paymentFrequency: 'monthly',
  status: 'active',
  notes: '',
};

export default function RegularPlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const playerId = Number(id);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [assignBatchId, setAssignBatchId] = useState('');

  const { data: player, isLoading } = useQuery<RegularPlayer>({
    queryKey: ['regular-player', playerId],
    queryFn: () => getRegularPlayer(playerId),
    enabled: !!playerId,
  });

  const { data: batchData } = useQuery({
    queryKey: ['regular-batches-list'],
    queryFn: () => getRegularBatches({ limit: 200 }),
  });

  const { data: upcomingSessions } = useQuery({
    queryKey: ['regular-player-upcoming', playerId],
    queryFn: () => getUpcomingSessions(playerId),
    enabled: !!playerId && activeTab === 'schedule',
  });

  const updateMutation = useMutation({
    mutationFn: (formData: typeof EMPTY_FORM) =>
      updateRegularPlayer(playerId, {
        ...formData,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : 0,
        securityDeposit: formData.securityDeposit ? Number(formData.securityDeposit) : 0,
      }),
    onSuccess: () => {
      toast.success('Player updated');
      queryClient.invalidateQueries({ queryKey: ['regular-player', playerId] });
      setShowEditModal(false);
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const assignMutation = useMutation({
    mutationFn: (batchId: number) => assignPlayerToBatch(playerId, batchId),
    onSuccess: () => {
      toast.success('Batch assigned');
      queryClient.invalidateQueries({ queryKey: ['regular-player', playerId] });
      setAssignBatchId('');
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (batchId: number) => removePlayerFromBatch(playerId, batchId),
    onSuccess: () => {
      toast.success('Removed from batch');
      queryClient.invalidateQueries({ queryKey: ['regular-player', playerId] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => pausePlayer(playerId),
    onSuccess: () => {
      toast.success('Player paused');
      queryClient.invalidateQueries({ queryKey: ['regular-player', playerId] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumePlayer(playerId),
    onSuccess: () => {
      toast.success('Player resumed');
      queryClient.invalidateQueries({ queryKey: ['regular-player', playerId] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const renewMutation = useMutation({
    mutationFn: () => renewPlayer(playerId),
    onSuccess: () => {
      toast.success('Player renewed');
      queryClient.invalidateQueries({ queryKey: ['regular-player', playerId] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const openEdit = () => {
    if (!player) return;
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone,
      whatsappNumber: player.whatsappNumber || '',
      email: player.email || '',
      address: player.address || '',
      emergencyContact: player.emergencyContact || '',
      joiningDate: player.joiningDate ? player.joiningDate.split('T')[0] : '',
      monthlyFee: String(player.monthlyFee || ''),
      securityDeposit: String(player.securityDeposit || ''),
      paymentFrequency: player.paymentFrequency || 'monthly',
      status: player.status || 'active',
      notes: player.notes || '',
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
    if (!form.phone.trim()) errs.phone = 'Required';
    if (!form.joiningDate) errs.joiningDate = 'Required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = () => {
    if (!validate()) return;
    updateMutation.mutate(form);
  };

  const handleRemoveFromBatch = async () => {
    const active = assignments.find((a) => a.status === 'active') ?? assignments[0];
    if (!active) return;
    const ok = await confirm({
      title: 'Remove from Batch',
      message: 'Are you sure you want to remove this player from their current regular batch?',
      confirmText: 'Remove',
    });
    if (ok) removeMutation.mutate(active.batchId);
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

  if (!player) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-12 w-12" />}
        title="Player not found"
        description="This player may have been deleted or you don't have access."
        action={
          <Button onClick={() => navigate('/admin/regular-players')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Regular Players
          </Button>
        }
      />
    );
  }

  const batches = batchData?.items ?? [];
  const assignments: RegularPlayerAssignment[] = player.assignments ?? [];
  const payments = (player as Record<string, unknown>).payments as
    | { receiptNumber: string; amount: string; finalAmount: string; paymentMethod: string; paymentDate: string; status: string }[]
    | undefined;
  const feeInvoices = (player as Record<string, unknown>).feeInvoices as
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
  const attendances = (player as Record<string, unknown>).attendances as
    | { id: number; date: string; status: string; notes?: string | null }[]
    | undefined;

  const sessions = (Array.isArray(upcomingSessions) ? upcomingSessions : []) as Record<string, unknown>[];

  const whatsappMessage = `Hello ${player.firstName} ${player.lastName}, this is a message from Badminton Academy regarding your membership.`;

  const tabs = [
    {
      value: 'overview',
      label: 'Overview',
      content: (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Player ID" value={player.playerId} />
              <InfoRow label="Full Name" value={`${player.firstName} ${player.lastName}`} />
              <InfoRow label="Phone" value={player.phone} />
              <InfoRow label="WhatsApp" value={player.whatsappNumber || '-'} />
              <InfoRow label="Email" value={player.email || '-'} />
              <InfoRow label="Address" value={player.address || '-'} className="sm:col-span-2" />
              <InfoRow label="Emergency Contact" value={player.emergencyContact || '-'} />
              <InfoRow label="Status" value={player.status} badge />
              <InfoRow label="Joining Date" value={formatDate(player.joiningDate)} />
              <InfoRow label="Payment Frequency" value={player.paymentFrequency || '-'} />
              <InfoRow label="Monthly Fee" value={formatINR(player.monthlyFee)} />
              <InfoRow label="Security Deposit" value={formatINR(player.securityDeposit)} />
              <InfoRow label="Subscription Start" value={formatDate(player.subscriptionStart)} />
              <InfoRow label="Subscription End" value={formatDate(player.subscriptionEnd)} />
              <InfoRow label="Next Payment Due" value={formatDate(player.nextPaymentDue)} />
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      value: 'schedule',
      label: 'Schedule',
      content: (
        <div className="space-y-5">
          {assignments.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<UserPlus className="h-8 w-8" />}
                  title="Not assigned to any batch"
                  description="Assign this player to a regular play batch below."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Batches</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Court</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.batch?.name || `Batch #${a.batchId}`}</TableCell>
                        <TableCell className="text-sm">{a.batch?.court?.name || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {a.batch ? parseDays(a.batch.daysOfWeek).join(', ') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.batch ? `${a.batch.startTime} - ${a.batch.endTime}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[a.status] || 'default'}>{a.status}</Badge>
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
                        {b.name}
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

          {assignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Remove from Batch</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="danger" onClick={handleRemoveFromBatch} loading={removeMutation.isPending}>
                  <UserMinus className="h-4 w-4" />
                  Remove from Current Batch
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<CalendarClock className="h-8 w-8" />}
                    title="No upcoming sessions"
                    description="Upcoming play sessions will appear here once scheduled."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Court</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {formatDate(String(s.date || s.sessionDate || ''))}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.startTime && s.endTime
                            ? `${String(s.startTime)} - ${String(s.endTime)}`
                            : s.time
                              ? String(s.time)
                              : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {(s as { court?: { name?: string } }).court?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[String(s.status)] || 'default'}>
                            {String(s.status || 'scheduled')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
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
                        <TableCell className="text-sm capitalize">
                          {p.paymentMethod.replace(/_/g, ' ')}
                        </TableCell>
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
      value: 'fees',
      label: 'Fees',
      content: (
        <Card>
          {!feeInvoices || feeInvoices.length === 0 ? (
            <CardContent>
              <EmptyState
                title="No fee invoices"
                description="Fee invoices will appear here once generated."
              />
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
      value: 'attendance',
      label: 'Attendance',
      content: (
        <Card>
          {!attendances || attendances.length === 0 ? (
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
                    {attendances.map((a) => (
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
            {player.notes ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{player.notes}</p>
            ) : (
              <EmptyState title="No notes" description="Add notes about this player from the edit form." />
            )}
          </CardContent>
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${player.firstName} ${player.lastName}`}
        description={player.playerId}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Regular Players', href: '/admin/regular-players' },
          { label: `${player.firstName} ${player.lastName}` },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={openEdit}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            {player.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => pauseMutation.mutate()}
                loading={pauseMutation.isPending}
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            {player.status === 'paused' && (
              <Button
                variant="outline"
                onClick={() => resumeMutation.mutate()}
                loading={resumeMutation.isPending}
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
            {(player.status === 'expired' || player.status === 'payment_due') && (
              <Button variant="outline" onClick={() => renewMutation.mutate()} loading={renewMutation.isPending}>
                <RefreshCw className="h-4 w-4" />
                Renew
              </Button>
            )}
            <a
              href={buildWhatsAppLink(player.whatsappNumber || player.phone, whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </Button>
            </a>
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
          value={formatINR(player.monthlyFee)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Subscription Status"
          value={player.status.replace(/_/g, ' ')}
          icon={<CreditCard className="h-5 w-5" />}
          color={player.status === 'active' ? 'green' : player.status === 'expired' || player.status === 'overdue' ? 'red' : player.status === 'payment_due' ? 'amber' : 'slate'}
        />
        <StatCard
          title="Next Due"
          value={formatDate(player.nextPaymentDue)}
          icon={<CalendarCheck className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Expiry"
          value={formatDate(player.subscriptionEnd)}
          icon={<CalendarClock className="h-5 w-5" />}
          color="red"
        />
      </div>

      <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Player"
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
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              error={formErrors.phone}
            />
            <Input
              label="WhatsApp Number"
              value={form.whatsappNumber}
              onChange={(e) => setField('whatsappNumber', e.target.value)}
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
          />
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Joining Date"
              type="date"
              value={form.joiningDate}
              onChange={(e) => setField('joiningDate', e.target.value)}
              error={formErrors.joiningDate}
            />
            <Select
              label="Payment Frequency"
              value={form.paymentFrequency}
              onChange={(e) => setField('paymentFrequency', e.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Fee"
              type="number"
              value={form.monthlyFee}
              onChange={(e) => setField('monthlyFee', e.target.value)}
            />
            <Input
              label="Security Deposit"
              type="number"
              value={form.securityDeposit}
              onChange={(e) => setField('securityDeposit', e.target.value)}
            />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="payment_due">Payment Due</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </Select>
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