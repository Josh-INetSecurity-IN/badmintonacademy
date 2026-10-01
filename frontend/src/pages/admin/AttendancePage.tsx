import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { getAttendanceOverview, getBatchAttendance, getAttendanceReport, markAttendance, markBulkAttendance } from '@/services/attendance';
import { getCoachingBatches } from '@/services/batches';
import { getRegularPlayers } from '@/services/players';
import { downloadCSV } from '@/utils/format';
import type { RegularPlayer } from '@/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { CalendarCheck, CheckCircle2, Clock, FileDown, HelpCircle, Percent, UserCheck, Users, XCircle } from 'lucide-react';

const TABS = ['Coaching Batch', 'Regular Player Daily'] as const;

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave', 'holiday'];

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  leave: 'info',
  holiday: 'default',
  cancelled: 'default',
  pending: 'default',
};

const todayISO = (): string => new Date().toISOString().slice(0, 10);

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const extractRows = (data: Record<string, unknown>): Record<string, unknown>[] => {
  for (const key of ['items', 'students', 'rows', 'report', 'data', 'results']) {
    const val = data[key];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
  }
  return [];
};

const getStudentName = (r: Record<string, unknown>): string => {
  const first = r.firstName;
  const last = r.lastName;
  if (typeof first === 'string' || typeof last === 'string') {
    return `${first ?? ''} ${last ?? ''}`.trim() || '—';
  }
  for (const key of ['studentName', 'name', 'fullName', 'student']) {
    const v = r[key];
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const fn = o.firstName;
      const ln = o.lastName;
      if (fn || ln) return `${fn ?? ''} ${ln ?? ''}`.trim() || '—';
      if (typeof o.name === 'string') return o.name;
    }
  }
  return '—';
};

const getNum = (r: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const v = r[key];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v);
  }
  return 0;
};

interface AttendanceRow {
  recordId: number;
  studentId?: number;
  name: string;
  status: string;
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Coaching Batch');

  const [coachingDate, setCoachingDate] = useState(todayISO());
  const [batchId, setBatchId] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState('present');
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [savingRecordId, setSavingRecordId] = useState<number | null>(null);

  const [regularDate, setRegularDate] = useState(todayISO());
  const [playerStatusMap, setPlayerStatusMap] = useState<Record<number, string>>({});
  const [bulkPlayerStatus, setBulkPlayerStatus] = useState('present');
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null);

  const [reportFrom, setReportFrom] = useState(daysAgo(30));
  const [reportTo, setReportTo] = useState(todayISO());
  const [reportBatch, setReportBatch] = useState('');

  const { data: overviewData } = useQuery({
    queryKey: ['attendance', 'overview'],
    queryFn: getAttendanceOverview,
  });

  const { data: batchData } = useQuery({
    queryKey: ['batches', 'coaching', 'all'],
    queryFn: () => getCoachingBatches({ limit: 500 }),
  });

  const { data: playerData } = useQuery({
    queryKey: ['regular-players', 'all'],
    queryFn: () => getRegularPlayers({ limit: 500 }),
  });

  const { data: batchAttendance, isLoading: batchLoading } = useQuery({
    queryKey: ['attendance', 'batch', batchId, coachingDate],
    queryFn: () => getBatchAttendance(Number(batchId), coachingDate),
    enabled: !!batchId,
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['attendance', 'report', reportFrom, reportTo, reportBatch],
    queryFn: () =>
      getAttendanceReport({
        from: reportFrom,
        to: reportTo,
        batchId: reportBatch || undefined,
      }),
    enabled: !!reportFrom && !!reportTo,
  });

  const batches = batchData?.items ?? [];
  const players = (playerData?.items ?? []).filter((p) => p.status !== 'archived');
  const reportRows = extractRows((reportData ?? {}) as Record<string, unknown>);

  const overview = (overviewData ?? {}) as Record<string, unknown>;
  const presentToday = Number(overview.present ?? overview.todayPresent ?? overview.totalPresent ?? 0);
  const absentToday = Number(overview.absent ?? overview.todayAbsent ?? overview.totalAbsent ?? 0);
  const lateToday = Number(overview.late ?? overview.todayLate ?? 0);
  const totalMarked = Number(overview.totalMarked ?? 0);
  const pendingToday = Number(overview.pending ?? overview.pendingCount ?? 0);
  const attendancePercent = Number(
    overview.percentage ??
      overview.presentPercentage ??
      overview.attendancePercentage ??
      (totalMarked > 0 ? Math.round((presentToday / totalMarked) * 1000) / 10 : 0),
  );

  useEffect(() => {
    setSelectedIds([]);
    if (!batchAttendance) {
      setStatusMap({});
      return;
    }
    const map: Record<number, string> = {};
    batchAttendance.forEach((r) => {
      map[r.id] = r.status;
    });
    setStatusMap(map);
  }, [batchAttendance]);

  const rows: AttendanceRow[] = (batchAttendance ?? [])
    .filter((r) => r.studentId)
    .map((r) => ({
      recordId: r.id,
      studentId: r.studentId ?? undefined,
      name: r.student ? `${r.student.firstName} ${r.student.lastName}`.trim() : `Student #${r.studentId}`,
      status: statusMap[r.id] ?? r.status,
    }));

  const bulkMutation = useMutation({
    mutationFn: (data: { batchId: number; date: string; studentIds: number[]; status: string }) =>
      markBulkAttendance(data),
    onSuccess: () => {
      toast.success('Attendance marked for the selected students');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'batch'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (data: unknown) => markAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'batch'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const markPlayerMutation = useMutation({
    mutationFn: (data: unknown) => markAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleMarkSelected = () => {
    if (!batchId) return;
    const studentIds = rows
      .filter((r) => selectedIds.includes(r.recordId) && r.studentId)
      .map((r) => r.studentId as number);
    if (studentIds.length === 0) {
      toast.error('No students selected');
      return;
    }
    bulkMutation.mutate({ batchId: Number(batchId), date: coachingDate, studentIds, status: bulkStatus });
  };

  const handleStatusChange = (recordId: number, studentId: number, status: string) => {
    setStatusMap((prev) => ({ ...prev, [recordId]: status }));
    setSavingRecordId(recordId);
    markOneMutation.mutate(
      { date: coachingDate, studentId, batchId: Number(batchId), status },
      {
        onSettled: () => setSavingRecordId(null),
        onSuccess: () => toast.success('Attendance updated'),
        onError: (err: unknown) => toast.error(handleError(err)),
      },
    );
  };

  const handlePlayerStatusChange = (playerId: number, status: string) => {
    setPlayerStatusMap((prev) => ({ ...prev, [playerId]: status }));
  };

  const handleMarkPlayer = (p: RegularPlayer) => {
    setSavingPlayerId(p.id);
    markPlayerMutation.mutate(
      { date: regularDate, regularPlayerId: p.id, status: playerStatusMap[p.id] ?? 'present' },
      {
        onSettled: () => setSavingPlayerId(null),
        onSuccess: () => toast.success(`${p.firstName} ${p.lastName} marked`),
        onError: (err: unknown) => toast.error(handleError(err)),
      },
    );
  };

  const markAllPlayersMutation = useMutation({
    mutationFn: async (list: RegularPlayer[]) => {
      await Promise.all(
        list.map((p) =>
          markAttendance({ date: regularDate, regularPlayerId: p.id, status: bulkPlayerStatus }),
        ),
      );
    },
    onSuccess: () => {
      toast.success('Attendance marked for all players');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'overview'] });
    },
    onError: (err: unknown) => {
      toast.error(handleError(err));
    },
  });

  const handleMarkAllPlayers = () => {
    markAllPlayersMutation.mutate(players);
  };

  const handleExportReport = () => {
    const csvRows = reportRows.map((r) => {
      const total = getNum(r, ['sessionsTotal', 'totalSessions', 'sessions', 'total']);
      const present = getNum(r, ['present', 'presentCount']);
      const late = getNum(r, ['late', 'lateCount']);
      const absent = getNum(r, ['absent', 'absentCount']);
      const percentage = getNum(r, ['percentage', 'attendancePercentage']) || (total > 0 ? Math.round((present / total) * 1000) / 10 : 0);
      return [getStudentName(r), total, present, late, absent, `${percentage}%`];
    });
    downloadCSV('attendance-report.csv', ['Student', 'Sessions', 'Present', 'Late', 'Absent', 'Percentage'], csvRows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Mark and track coaching batch and regular player attendance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Attendance' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Present Today" value={presentToday} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <StatCard title="Absent Today" value={absentToday} icon={<XCircle className="h-5 w-5" />} color="red" />
        <StatCard title="Late Today" value={lateToday} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard title="Pending" value={pendingToday} icon={<HelpCircle className="h-5 w-5" />} color="slate" />
        <StatCard title="Attendance %" value={`${attendancePercent}%`} icon={<Percent className="h-5 w-5" />} color="blue" />
      </div>

      <div className="flex border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Coaching Batch' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Input label="Date" type="date" value={coachingDate} onChange={(e) => setCoachingDate(e.target.value)} />
              <div className="min-w-[220px] flex-1">
                <Select label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {!batchId ? (
            <EmptyState icon={<Users className="h-12 w-12" />} title="Select a batch" description="Choose a coaching batch and date to mark attendance." />
          ) : batchLoading ? (
            <SkeletonTable rows={8} columns={5} />
          ) : rows.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-12 w-12" />} title="No students loaded" description="No attendance records found for this batch and date." />
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-[180px]">
                  <Select label="Apply status to selected" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button onClick={handleMarkSelected} loading={bulkMutation.isPending} disabled={selectedIds.length === 0}>
                  Mark Selected ({selectedIds.length})
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={rows.length > 0 && selectedIds.length === rows.length}
                          onChange={(e) => setSelectedIds(e.target.checked ? rows.map((r) => r.recordId) : [])}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.recordId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={selectedIds.includes(row.recordId)}
                            onChange={(e) =>
                              setSelectedIds((prev) =>
                                e.target.checked ? [...prev, row.recordId] : prev.filter((id) => id !== row.recordId),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-900">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.status}
                              className="w-36"
                              onChange={(e) => {
                                if (row.studentId) handleStatusChange(row.recordId, row.studentId, e.target.value);
                              }}
                              disabled={savingRecordId === row.recordId}
                            >
                              {ATTENDANCE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </Select>
                            <Badge variant={STATUS_BADGE[row.status] || 'default'}>{row.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={savingRecordId === row.recordId}
                            onClick={() => {
                              if (row.studentId) {
                                setStatusMap((prev) => ({ ...prev, [row.recordId]: 'present' }));
                                handleStatusChange(row.recordId, row.studentId, 'present');
                              }
                            }}
                          >
                            Reset
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'Regular Player Daily' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <Input label="Date" type="date" value={regularDate} onChange={(e) => setRegularDate(e.target.value)} className="max-w-xs" />
          </div>

          {players.length === 0 ? (
            <EmptyState icon={<Users className="h-12 w-12" />} title="No regular players" description="Add regular players before marking daily attendance." />
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-[180px]">
                  <Select label="Apply status to all" value={bulkPlayerStatus} onChange={(e) => setBulkPlayerStatus(e.target.value)}>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button onClick={handleMarkAllPlayers} loading={markAllPlayersMutation.isPending}>
                  Mark All Players
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <span className="font-medium text-slate-900">
                            {p.firstName} {p.lastName}
                          </span>
                          <Badge variant="info" className="ml-2">
                            {p.playerId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{p.phone || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              className="w-36"
                              value={playerStatusMap[p.id] ?? 'present'}
                              onChange={(e) => handlePlayerStatusChange(p.id, e.target.value)}
                            >
                              {ATTENDANCE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" loading={savingPlayerId === p.id} onClick={() => handleMarkPlayer(p)}>
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Attendance Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input label="From" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
            <Input label="To" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
            <div className="min-w-[200px]">
              <Select label="Batch" value={reportBatch} onChange={(e) => setReportBatch(e.target.value)}>
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={handleExportReport} disabled={reportRows.length === 0}>
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {reportLoading ? (
            <SkeletonTable rows={6} columns={6} />
          ) : reportRows.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-12 w-12" />} title="No report data" description="Adjust the date range or batch filter to view the report." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((r, i) => {
                    const total = getNum(r, ['sessionsTotal', 'totalSessions', 'sessions', 'total']);
                    const present = getNum(r, ['present', 'presentCount']);
                    const late = getNum(r, ['late', 'lateCount']);
                    const absent = getNum(r, ['absent', 'absentCount']);
                    const percentage =
                      getNum(r, ['percentage', 'attendancePercentage']) || (total > 0 ? Math.round((present / total) * 1000) / 10 : 0);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-slate-900">{getStudentName(r)}</TableCell>
                        <TableCell className="text-sm">{total}</TableCell>
                        <TableCell className="text-sm text-green-600">{present}</TableCell>
                        <TableCell className="text-sm text-amber-600">{late}</TableCell>
                        <TableCell className="text-sm text-red-600">{absent}</TableCell>
                        <TableCell>
                          <Badge variant={percentage >= 75 ? 'success' : percentage >= 50 ? 'warning' : 'danger'}>
                            {percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}