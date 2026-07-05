import { useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Users,
  Wallet,
  IndianRupee,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import { ROLES } from '@/constants/permissions';
import { ParentDashboard } from '@/modules/dashboard/components/ParentDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { studentsApi } from '@/services/modules/students.api';
import { paymentApi } from '@/services/modules/payment.api';
import { ledgerApi } from '@/services/modules/ledger.api';
import { applicationsApi } from '@/services/modules/applications.api';
import { enquiriesApi } from '@/services/modules/enquiries.api';
import type { Payment } from '@/types/payment.types';
import type { LedgerEntry } from '@/types/ledger.types';
import type { Application, Enquiry } from '@/types/admissions.types';

// ─── Helpers ─────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// Treats a payment as collected unless explicitly failed/cancelled/refunded —
// matches how ReceiptListPage shows it.
function isCollected(status: string): boolean {
  const s = (status || '').toLowerCase();
  return s !== 'failed' && s !== 'cancelled' && s !== 'refunded';
}

// ─── Metric Card (inline) ─────────────────────────────────────

interface MetricProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
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
        {change ? (
          <div className={cn(
            'inline-flex items-center gap-1 text-[0.75rem] font-semibold',
            trend === 'up' ? 'text-emerald-600' : 'text-red-500',
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{change}</span>
          </div>
        ) : <span />}
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

// ─── Aggregation helpers ────────────────────────────────────

// Build a 9-month bar series ending at the current month.
function buildCollectionSeries(payments: Payment[]): { month: string; amount: number }[] {
  const now = new Date();
  const buckets: { key: string; label: string; amount: number }[] = [];
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTH_LABELS[d.getMonth()],
      amount: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const p of payments) {
    if (!isCollected(p.status) || !p.paidAt) continue;
    const d = new Date(p.paidAt);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const b = byKey.get(key);
    if (b) b.amount += Number(p.amount) || 0;
  }
  return buckets.map((b) => ({ month: b.label, amount: b.amount }));
}

// 6-week pipeline: enquiry + application counts grouped by week start.
function buildAdmissionPipeline(
  enquiries: Enquiry[],
  applications: Application[],
): { week: string; enquiries: number; applications: number }[] {
  const now = new Date();
  // Start of current week (Mon) — anchor to midnight.
  const anchor = new Date(now);
  anchor.setHours(0, 0, 0, 0);
  const day = anchor.getDay();
  const offsetToMonday = (day + 6) % 7;
  anchor.setDate(anchor.getDate() - offsetToMonday);

  const buckets: { start: number; end: number; label: string; enquiries: number; applications: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(anchor);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      start: start.getTime(),
      end: end.getTime(),
      label: `W${6 - i}`,
      enquiries: 0,
      applications: 0,
    });
  }

  for (const e of enquiries) {
    const t = new Date(e.date).getTime();
    if (isNaN(t)) continue;
    const b = buckets.find((b) => t >= b.start && t < b.end);
    if (b) b.enquiries++;
  }
  for (const a of applications) {
    const t = new Date(a.appliedDate).getTime();
    if (isNaN(t)) continue;
    const b = buckets.find((b) => t >= b.start && t < b.end);
    if (b) b.applications++;
  }
  return buckets.map((b) => ({ week: b.label, enquiries: b.enquiries, applications: b.applications }));
}

// ─── Admin Dashboard ────────────────────────────────────────

function AdminDashboard() {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tooltipStyle = getTooltipStyle(isDark);
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;

  const [loading, setLoading] = useState(true);
  const [studentTotal, setStudentTotal] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch in parallel — limit 500 is enough for a dashboard snapshot on
      // most schools; if a school exceeds this we accept first-page bias and
      // wait for backend summary endpoints to ship.
      const [studentsRes, paymentsRes, ledgersRes, applicationsRes, enquiriesRes] = await Promise.all([
        studentsApi.list(schoolId, { page: 1, limit: 1 }).catch(() => ({ total: 0, data: [], page: 1, limit: 1 })),
        paymentApi.list(schoolId, { page: 1, limit: 500 }).catch(() => ({ data: [], total: 0, page: 1, limit: 0 })),
        ledgerApi.list(schoolId, { page: 1, limit: 500 }).catch(() => ({ data: [], total: 0, page: 1, limit: 0 })),
        applicationsApi.list(schoolId, { page: 1, limit: 500 }).catch(() => ({ data: [], total: 0, page: 1, limit: 0 })),
        enquiriesApi.list(schoolId, { page: 1, limit: 500 }).catch(() => ({ data: [], total: 0, page: 1, limit: 0 })),
      ]);
      if (cancelled) return;
      setStudentTotal(studentsRes.total);
      setPayments(paymentsRes.data);
      setLedgers(ledgersRes.data);
      setApplications(applicationsRes.data);
      setEnquiries(enquiriesRes.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [schoolId]);

  // ─── Derived metrics ──────────────────────────────────────
  const { feeCollectionThisMonth, newAdmissionsThisMonth, outstanding } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const collected = payments.reduce((sum, p) => {
      if (!isCollected(p.status) || !p.paidAt) return sum;
      const d = new Date(p.paidAt);
      if (d.getFullYear() !== year || d.getMonth() !== month) return sum;
      return sum + (Number(p.amount) || 0);
    }, 0);

    const admissions = applications.filter((a) => {
      if (!a.appliedDate) return false;
      const d = new Date(a.appliedDate);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    let debit = 0;
    let credit = 0;
    for (const l of ledgers) {
      const v = Number(l.amount) || 0;
      if (l.entryType === 'Debit') debit += v;
      else credit += v;
    }
    return {
      feeCollectionThisMonth: collected,
      newAdmissionsThisMonth: admissions,
      outstanding: Math.max(0, debit - credit),
    };
  }, [payments, ledgers, applications]);

  const collectionData = useMemo(() => buildCollectionSeries(payments), [payments]);
  const admissionTrend = useMemo(() => buildAdmissionPipeline(enquiries, applications), [enquiries, applications]);

  const pendingActions = useMemo(() => {
    const items: { id: string; text: string; priority: 'high' | 'medium' | 'low'; route: string }[] = [];
    const submitted = applications.filter((a) => a.status === 'submitted').length;
    const underReview = applications.filter((a) => a.status === 'under_review').length;
    const newEnquiries = enquiries.filter((e) => e.status === 'new').length;
    if (underReview > 0) items.push({
      id: 'under-review', text: `${underReview} application${underReview === 1 ? '' : 's'} under review`, priority: 'high', route: '/admissions/approvals',
    });
    if (submitted > 0) items.push({
      id: 'submitted', text: `${submitted} application${submitted === 1 ? '' : 's'} awaiting verification`, priority: 'high', route: '/admissions/applications',
    });
    if (newEnquiries > 0) items.push({
      id: 'new-enquiries', text: `${newEnquiries} new enquir${newEnquiries === 1 ? 'y' : 'ies'} to follow up`, priority: 'medium', route: '/admissions',
    });
    return items;
  }, [applications, enquiries]);

  // ─── Render ───────────────────────────────────────────────

  if (!schoolId) {
    return (
      <div className="max-w-[1280px]">
        <div className="mb-8">
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Dashboard</h1>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Select a school to view dashboard data.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[1280px]">
        <div className="mb-8">
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Dashboard</h1>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)] mx-auto" />
        </div>
      </div>
    );
  }

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
          value={String(studentTotal)}
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
          onClick={() => navigate('/students')}
          delay={0}
        />
        <MetricCard
          label="New Admissions"
          value={String(newAdmissionsThisMonth)}
          change="this month"
          trend="up"
          icon={UserPlus}
          iconBg="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/admissions/applications')}
          delay={50}
        />
        <MetricCard
          label="Fee Collection"
          value={fmt(feeCollectionThisMonth)}
          change="this month"
          trend="up"
          icon={IndianRupee}
          iconBg="bg-violet-50 text-violet-600"
          onClick={() => navigate('/receipts')}
          delay={100}
        />
        <MetricCard
          label="Outstanding"
          value={fmt(outstanding)}
          icon={Wallet}
          iconBg="bg-amber-50 text-amber-600"
          onClick={() => navigate('/ledger')}
          delay={150}
        />
      </div>

      {/* ── Fee Collection Chart (full width) ── */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-8">
        <SectionTitle>Fee Collection</SectionTitle>
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

      {/* ── Bottom Row: Pipeline + Pending Actions ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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
          <div className="h-[200px]">
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
          {pendingActions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[0.8125rem] text-[var(--text-muted)]">All caught up — nothing pending.</p>
            </div>
          ) : (
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
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--text-ghost)] group-hover:text-[var(--text-tertiary)] transition-colors mt-1 shrink-0" />
                </div>
              ))}
            </div>
          )}
          {pendingActions.length > 0 && (
            <button
              onClick={() => navigate('/admissions/approvals')}
              className="w-full mt-3 py-2 rounded-xl text-[0.8125rem] font-semibold text-[#002c98] hover:bg-[var(--border-subtle)] transition-colors"
            >
              View all actions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page (role switch) ───────────────────────────

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  // Parents and teachers each get a focused, role-scoped home; everyone else
  // (admins, accountants, managers, super admins) keeps the admin/finance overview.
  if (!isSuperAdmin(user)) {
    if (user?.roleName === ROLES.PARENT) return <ParentDashboard />;
    if (user?.roleName === ROLES.TEACHER) return <TeacherDashboard />;
  }
  return <AdminDashboard />;
}

export default DashboardPage;
