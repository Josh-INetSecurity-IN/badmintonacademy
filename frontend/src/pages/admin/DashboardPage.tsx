import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserRound,
  CalendarCheck2,
  IndianRupee,
  AlertCircle,
  TrendingUp,
  Trophy,
  Inbox,
  Layers,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { getDashboardSummary, getDashboardCharts } from '@/services/dashboard';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatINR, formatDateTime, getMonthLabel } from '@/utils/format';
import { Select } from '@/components/ui/Select';

const PIE_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];

const RANGE_OPTIONS = [
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'thisYear', label: 'This Year' },
];

export default function DashboardPage() {
  const [range, setRange] = useState('thisMonth');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => getDashboardSummary(),
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts', range],
    queryFn: () => getDashboardCharts({ range }),
  });

  if (summaryLoading || chartsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const s = summary as Record<string, unknown>;
  const c = charts as Record<string, unknown>;

  const monthlyRevenue = Array.isArray(c.monthlyRevenue) ? c.monthlyRevenue as { month: string; value: number }[] : [];
  const monthlyExpenses = Array.isArray(c.monthlyExpenses) ? c.monthlyExpenses as { month: string; value: number }[] : [];
  const netIncome = Array.isArray(c.netIncome) ? c.netIncome as { month: string; value: number }[] : [];
  const studentsByBatch = Array.isArray(c.studentsByBatch) ? c.studentsByBatch as { batch: string; count: number }[] : [];
  const subscriptionStatus = (c.subscriptionStatus as Record<string, number>) || {};
  const feeCollectionStatus = (c.feeCollectionStatus as Record<string, number>) || {};
  const revenueByCategory = (c.revenueByCategory as Record<string, number>) || {};
  const paymentMethods = (c.paymentMethods as Record<string, number>) || {};
  const recentPayments = Array.isArray(s.recentPayments) ? s.recentPayments as {
    receiptNumber: string; finalAmount: string; paymentMethod: string; paymentDate: string;
    student?: { firstName: string; lastName: string } | null;
    regularPlayer?: { firstName: string; lastName: string } | null;
  }[] : [];
  const notifications = Array.isArray(s.notifications) ? s.notifications as { id: number; title: string; message: string; createdAt: string }[] : [];

  const revenueData = monthlyRevenue.map((item) => ({
    ...item,
    label: getMonthLabel(item.month),
  }));
  const netIncomeData = netIncome.map((item) => ({
    ...item,
    label: getMonthLabel(item.month),
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Coaching Students"
          value={String(s.totalStudents ?? 0)}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          link="/admin/students"
        />
        <StatCard
          title="Active Regular Players"
          value={String(s.activeRegularPlayers ?? 0)}
          icon={<UserRound className="h-5 w-5" />}
          color="green"
          link="/admin/regular-players"
        />
        <StatCard
          title="Today's Expected"
          value={String(s.todayExpectedPlayers ?? 0)}
          icon={<CalendarCheck2 className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatINR(Number(s.monthlyRevenue ?? 0))}
          icon={<IndianRupee className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Pending Fees"
          value={formatINR(Number(s.pendingFees ?? 0))}
          icon={<AlertCircle className="h-5 w-5" />}
          color="red"
          link="/admin/fees"
        />
        <StatCard
          title="Overdue Payments"
          value={String(s.overduePayments ?? 0)}
          icon={<Wallet className="h-5 w-5" />}
          color="red"
          link="/admin/payments"
        />
        <StatCard
          title="Net Income"
          value={formatINR(Number(s.netIncome ?? 0))}
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Tournaments"
          value={String(s.upcomingTournaments ?? 0)}
          icon={<Trophy className="h-5 w-5" />}
          color="purple"
          link="/admin/tournaments"
        />
        <StatCard
          title="Today's Batches"
          value={String(s.todayBatches ?? 0)}
          icon={<Layers className="h-5 w-5" />}
          color="blue"
          link="/admin/batch-calendar"
        />
        <StatCard
          title="New Enquiries"
          value={String(s.newEnquiries ?? 0)}
          icon={<Inbox className="h-5 w-5" />}
          color="amber"
          link="/admin/enquiries"
        />
        <StatCard
          title="Fees Due Soon"
          value={String(s.dueSoon ?? 0)}
          icon={<AlertCircle className="h-5 w-5" />}
          color="red"
          link="/admin/fees"
        />
      </div>

      {/* Charts */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-slate-900">Analytics</h2>
        <div className="w-48">
          <Select value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#revFill)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Income (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={netIncomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Bar dataKey="value" name="Net Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(revenueByCategory).map(([name, value]) => ({ name, value: Number(value) }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => entry.name.replace(/_/g, ' ')}
                >
                  {Object.keys(revenueByCategory).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatINR(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students by Batch</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentsByBatch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="batch" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Students" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={Object.entries(subscriptionStatus).map(([name, value]) => ({ name, value: Number(value) }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {Object.keys(subscriptionStatus).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Status</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(feeCollectionStatus).map(([name, value]) => ({ name, value: Number(value) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Invoices" radius={[4, 4, 0, 0]}>
                  {['paid'].includes('paid') && <Cell fill="#22c55e" />}
                  {['pending'].includes('pending') && <Cell fill="#eab308" />}
                  {['partial'].includes('partial') && <Cell fill="#3b82f6" />}
                  {['overdue'].includes('overdue') && <Cell fill="#ef4444" />}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent payments + notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Link to="/admin/payments" className="text-sm text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Payer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">No payments yet</td>
                    </tr>
                  )}
                  {recentPayments.map((p, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{p.receiptNumber}</td>
                      <td>
                        {p.student
                          ? `${p.student.firstName} ${p.student.lastName}`
                          : p.regularPlayer
                            ? `${p.regularPlayer.firstName} ${p.regularPlayer.lastName}`
                            : 'Walk-in'}
                      </td>
                      <td className="font-medium">{formatINR(Number(p.finalAmount))}</td>
                      <td className="capitalize">{p.paymentMethod.replace(/_/g, ' ')}</td>
                      <td className="text-xs">{formatDateTime(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <Link to="/admin/notifications" className="text-sm text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {notifications.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No notifications</div>
              )}
              {notifications.map((n) => (
                <div key={n.id} className="px-5 py-3">
                  <div className="font-medium text-sm text-slate-800">{n.title}</div>
                  <div className="text-sm text-slate-500 line-clamp-2">{n.message}</div>
                  <div className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}