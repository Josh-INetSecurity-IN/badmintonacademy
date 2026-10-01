import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleError } from '@/services/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatINR, formatDate, downloadCSV } from '@/utils/format';
import {
  getRevenueReport,
  getExpenseReport,
  getNetIncome,
  getOutstandingReport,
  getOperationalReport,
  getCollectedVsPending,
} from '@/services/reports';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Tab = 'financial' | 'operational';
const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('financial');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateParams = {
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  };

  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['reports', 'revenue', dateParams],
    queryFn: () => getRevenueReport(dateParams),
  });

  const { data: expenseData, isLoading: loadingExpense } = useQuery({
    queryKey: ['reports', 'expense', dateParams],
    queryFn: () => getExpenseReport(dateParams),
  });

  const { data: netIncomeData, isLoading: loadingNet } = useQuery({
    queryKey: ['reports', 'net-income', dateParams],
    queryFn: () => getNetIncome(dateParams),
  });

  const { data: outstandingData, isLoading: loadingOutstanding } = useQuery({
    queryKey: ['reports', 'outstanding'],
    queryFn: getOutstandingReport,
  });

  const { data: operationalData, isLoading: loadingOperational } = useQuery({
    queryKey: ['reports', 'operational'],
    queryFn: getOperationalReport,
  });

  const { data: collectedVsPending, isLoading: loadingCVP } = useQuery({
    queryKey: ['reports', 'collected-vs-pending', dateParams],
    queryFn: () => getCollectedVsPending(dateParams),
  });

  const monthlyRevenue = (revenueData?.byMonth as { month: string; value: number }[] | undefined) ?? [];
  const expensesByCategory = (expenseData?.byCategory as { category: string; value: number }[] | undefined) ?? [];
  const paymentMethods = (revenueData?.byPaymentMethod as { method: string; value: number }[] | undefined) ?? [];
  const cvpRows = (collectedVsPending?.items as Record<string, unknown>[] | undefined) ?? [];

  const handleExportFinancial = () => {
    const headers = ['Month', 'Revenue'];
    const rows = monthlyRevenue.map((r) => [r.month, r.value]);
    downloadCSV('revenue-report.csv', headers, rows);
  };

  const handleExportOperational = () => {
    if (!operationalData) return;
    const headers = ['Metric', 'Value'];
    const rows = Object.entries(operationalData).map(([k, v]) => [k, String(v)]);
    downloadCSV('operational-report.csv', headers, rows);
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Financial and operational reports"
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" onClick={tab === 'financial' ? handleExportFinancial : handleExportOperational}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(['financial', 'operational'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'financial' ? 'Financial' : 'Operational'}
          </button>
        ))}
      </div>

      {tab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Revenue"
              value={formatINR(revenueData?.total as number ?? 0)}
              color="green"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
            />
            <StatCard
              title="Expenses"
              value={formatINR(expenseData?.total as number ?? 0)}
              color="red"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
            <StatCard
              title="Net Income"
              value={formatINR(netIncomeData?.total as number ?? 0)}
              color="blue"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <StatCard
              title="Outstanding"
              value={formatINR(outstandingData?.total as number ?? 0)}
              color="amber"
              icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRevenue ? (
                  <SkeletonTable rows={3} columns={4} />
                ) : monthlyRevenue.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatINR(value)} />
                      <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingExpense ? (
                  <SkeletonTable rows={3} columns={4} />
                ) : expensesByCategory.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expensesByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatINR(value)} />
                      <Bar dataKey="value" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRevenue ? (
                  <SkeletonTable rows={3} columns={4} />
                ) : paymentMethods.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        nameKey="method"
                        label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentMethods.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatINR(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collected vs Pending</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingCVP ? (
                  <SkeletonTable rows={3} columns={4} />
                ) : cvpRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No data available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cvpRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{String(row.invoiceNumber ?? row.id ?? '')}</TableCell>
                          <TableCell>{String(row.student ?? row.name ?? '')}</TableCell>
                          <TableCell>{formatINR(row.amount as number ?? 0)}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'collected' ? 'success' : row.status === 'pending' ? 'warning' : 'default'}>
                              {String(row.status ?? '')}
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
        </div>
      )}

      {tab === 'operational' && (
        <div className="space-y-6">
          {loadingOperational ? (
            <SkeletonTable rows={4} columns={4} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Students" value={String(operationalData?.totalStudents ?? 0)} color="blue" />
                <StatCard title="Active Regular Players" value={String(operationalData?.activeRegularPlayers ?? 0)} color="green" />
                <StatCard title="Guest Bookings (Month)" value={String(operationalData?.guestBookingsThisMonth ?? 0)} color="amber" />
                <StatCard title="Attendance %" value={`${operationalData?.attendanceRate ?? 0}%`} color="blue" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="New Admissions" value={String(operationalData?.newAdmissions ?? 0)} color="green" />
                <StatCard title="Subscriptions Renewed" value={String(operationalData?.subscriptionsRenewed ?? 0)} color="blue" />
                <StatCard title="Expired Memberships" value={String(operationalData?.expiredMemberships ?? 0)} color="red" />
                <StatCard title="Low Stock Products" value={String(operationalData?.lowStockProducts ?? 0)} color="amber" />
              </div>

              {Array.isArray(operationalData?.studentsByBatch) && operationalData.studentsByBatch.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Students by Batch</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={operationalData.studentsByBatch as { name: string; count: number }[]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" name="Students" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
