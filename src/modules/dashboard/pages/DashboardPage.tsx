import {
  UserPlus,
  Users,
  Wallet,
  IndianRupee,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme.store';

// ─── Mock Data ───────────────────────────────────────────────

const collectionData = [
  { month: 'Jul', amount: 420000 },
  { month: 'Aug', amount: 580000 },
  { month: 'Sep', amount: 510000 },
  { month: 'Oct', amount: 670000 },
  { month: 'Nov', amount: 490000 },
  { month: 'Dec', amount: 720000 },
  { month: 'Jan', amount: 650000 },
  { month: 'Feb', amount: 810000 },
  { month: 'Mar', amount: 730000 },
];

const attendanceData = [
  { name: 'Present', value: 847, color: '#0d7c66' },
  { name: 'Absent', value: 53, color: '#dc2626' },
  { name: 'Late', value: 32, color: '#f59e0b' },
];

const admissionTrend = [
  { week: 'W1', enquiries: 12, applications: 8 },
  { week: 'W2', enquiries: 18, applications: 14 },
  { week: 'W3', enquiries: 15, applications: 11 },
  { week: 'W4', enquiries: 22, applications: 17 },
  { week: 'W5', enquiries: 28, applications: 21 },
  { week: 'W6', enquiries: 25, applications: 19 },
];

const pendingActions = [
  { id: 1, text: '5 applications awaiting verification', priority: 'high' as const, time: '2h ago', route: '/admissions/approvals' },
  { id: 2, text: '12 bounced cheques need resolution', priority: 'high' as const, time: '4h ago', route: '/receipts/reconciliation' },
  { id: 3, text: '3 failed SMS deliveries to retry', priority: 'medium' as const, time: '6h ago', route: '/notifications/logs' },
  { id: 4, text: 'Timetable for Class X-B incomplete', priority: 'low' as const, time: '1d ago', route: '/academic/timetable' },
];

const recentActivity = [
  { id: 1, title: 'Fee reminder sent', desc: 'Class IX — 45 parents notified', time: '10m', ok: true, route: '/notifications/logs' },
  { id: 2, title: 'Admission approved', desc: 'Riya Sharma — Class VII-A', time: '25m', ok: true, route: '/admissions/applications' },
  { id: 3, title: 'SMS delivery failed', desc: '3 messages to parent contacts', time: '1h', ok: false, route: '/notifications/logs' },
  { id: 4, title: 'Fee payment received', desc: 'Arjun Patel — INR 45,000', time: '2h', ok: true, route: '/ledger' },
  { id: 5, title: 'New enquiry captured', desc: 'Walk-in — Class III interest', time: '3h', ok: true, route: '/admissions' },
];

// ─── Helpers ─────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
};

const getTooltipStyle = (isDark: boolean): React.CSSProperties => ({
  background: isDark ? 'rgba(20, 23, 31, 0.95)' : 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(16px)',
  borderRadius: '10px',
  border: 'none',
  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  fontFamily: "'Inter', sans-serif",
  fontSize: '12px',
  padding: '8px 12px',
  lineHeight: '1.4',
  color: isDark ? '#f1f5f9' : '#0f172a',
});

// ─── Metric Card (inline, one per card) ─────────────────────

interface MetricProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ElementType;
  iconBg: string;
  onClick?: () => void;
  delay?: number;
}

function MetricCard({ label, value, change, trend, icon: Icon, iconBg, onClick, delay = 0 }: MetricProps) {
  return (
    <div
      onClick={onClick}
      className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[0.75rem] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.06em]">
          {label}
        </span>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </div>
      </div>
      <p className="font-display text-[1.875rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none mb-2">
        {value}
      </p>
      <div className="flex items-center justify-between">
        <div className={cn(
          'inline-flex items-center gap-1 text-[0.75rem] font-semibold',
          trend === 'up' ? 'text-emerald-600' : 'text-red-500',
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{change}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-[var(--text-ghost)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
        {children}
      </h2>
      {action}
    </div>
  );
}

// ─── Dashboard Page ─────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tooltipStyle = getTooltipStyle(isDark);
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  const attendanceTotal = attendanceData.reduce((s, d) => s + d.value, 0);
  const presentPct = Math.round((attendanceData[0].value / attendanceTotal) * 100);

  return (
    <div className="max-w-[1280px]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
          Dashboard
        </h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">
          Here's what's happening at your school today
        </p>
      </div>

      {/* ── Metric Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Students"
          value="932"
          change="+24 this month"
          trend="up"
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate('/students')}
          delay={0}
        />
        <MetricCard
          label="New Admissions"
          value="47"
          change="+12% vs last month"
          trend="up"
          icon={UserPlus}
          iconBg="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/admissions/applications')}
          delay={50}
        />
        <MetricCard
          label="Fee Collection"
          value={fmt(810000)}
          change="+8.2% vs last month"
          trend="up"
          icon={IndianRupee}
          iconBg="bg-violet-50 text-violet-600"
          onClick={() => navigate('/receipts')}
          delay={100}
        />
        <MetricCard
          label="Outstanding"
          value={fmt(245000)}
          change="-15% vs last month"
          trend="down"
          icon={Wallet}
          iconBg="bg-amber-50 text-amber-600"
          onClick={() => navigate('/ledger')}
          delay={150}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-8">
        {/* Fee Collection — Bar Chart */}
        <div className="xl:col-span-2 bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SectionTitle
            action={
              <select className="text-[0.75rem] text-[var(--text-muted)] bg-transparent outline-none font-medium cursor-pointer">
                <option>This Year</option>
                <option>Last Year</option>
              </select>
            }
          >
            Fee Collection
          </SectionTitle>
          <div className="h-[260px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionData} barSize={28} barGap={4}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 11, fontFamily: 'Inter' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: axisColor, fontSize: 11, fontFamily: 'Inter' }}
                  tickFormatter={(v: number) => fmtShort(v)}
                  width={45}
                />
                <Tooltip
                  formatter={(value) => [fmt(Number(value)), 'Collection']}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(0,44,152,0.03)' }}
                />
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#002c98" />
                    <stop offset="100%" stopColor="#3b6cf5" />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="amount"
                  fill="url(#barFill)"
                  radius={[8, 8, 4, 4]}
                  animationDuration={800}
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Attendance — Donut */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SectionTitle>Attendance</SectionTitle>
          <div className="flex flex-col items-center">
            <div className="relative h-[180px] w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    animationDuration={1000}
                  >
                    {attendanceData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[2rem] font-extrabold text-[var(--text-primary)] leading-none">
                  {presentPct}%
                </span>
                <span className="text-[0.6875rem] text-[var(--text-muted)] mt-0.5">present</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex gap-5 mt-4">
              {attendanceData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[0.6875rem] text-[var(--text-tertiary)] font-medium">
                    {item.name}
                  </span>
                  <span className="text-[0.6875rem] text-[var(--text-muted)]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Admission Pipeline — Area */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SectionTitle>Admission Pipeline</SectionTitle>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#002c98]" />
              <span className="text-[0.6875rem] text-[var(--text-tertiary)]">Enquiries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0d7c66]" />
              <span className="text-[0.6875rem] text-[var(--text-tertiary)]">Applications</span>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={admissionTrend}>
                <defs>
                  <linearGradient id="enquiryG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#002c98" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#002c98" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="appG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d7c66" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#0d7c66" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: axisColor, fontSize: 11 }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="enquiries" stroke="#002c98" fill="url(#enquiryG)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="applications" stroke="#0d7c66" fill="url(#appG)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SectionTitle
            action={
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-red-50 text-[0.625rem] font-bold text-red-500">
                {pendingActions.length}
              </span>
            }
          >
            Pending Actions
          </SectionTitle>
          <div className="space-y-1">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                onClick={() => navigate(action.route)}
                className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-[var(--card-bg-hover)] transition-colors cursor-pointer group"
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  action.priority === 'high' ? 'bg-red-50' : 'bg-slate-50',
                )}>
                  {action.priority === 'high' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] text-[var(--text-secondary)] leading-snug">{action.text}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] mt-0.5">{action.time}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-ghost)] group-hover:text-[var(--text-tertiary)] transition-colors mt-1 shrink-0" />
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/admissions/approvals')}
            className="w-full mt-3 py-2 rounded-xl text-[0.8125rem] font-semibold text-[#002c98] hover:bg-[var(--border-subtle)] transition-colors"
          >
            View all actions
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <SectionTitle
            action={
              <Bell className="w-4 h-4 text-[var(--text-ghost)]" strokeWidth={1.8} />
            }
          >
            Recent Activity
          </SectionTitle>
          <div className="space-y-0.5">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(item.route)}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--card-bg-hover)] transition-colors cursor-pointer"
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  item.ok ? 'bg-emerald-50' : 'bg-red-50',
                )}>
                  <CheckCircle2
                    className={cn('w-3.5 h-3.5', item.ok ? 'text-emerald-500' : 'text-red-400')}
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] text-[var(--text-secondary)] font-medium leading-snug truncate">
                    {item.title}
                  </p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">{item.desc}</p>
                </div>
                <span className="text-[0.625rem] text-[var(--text-ghost)] font-medium whitespace-nowrap mt-0.5">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
