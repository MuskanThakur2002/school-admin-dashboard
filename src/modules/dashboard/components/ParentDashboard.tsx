import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ClipboardCheck, NotebookPen, Award, ArrowRight, CalendarDays } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { ledgerApi } from '@/services/modules/ledger.api';
import { attendanceApi } from '@/services/modules/attendance.api';
import { homeworkApi } from '@/services/modules/homework.api';
import type { LedgerEntry } from '@/types/ledger.types';
import type { AttendanceRecord } from '@/types/attendance.types';
import type { Homework } from '@/types/homework.types';

// Parent landing dashboard — a quick read-only summary of their own child's
// fees, attendance and homework. All three endpoints are parent-scoped on the
// backend, so everything here is the parent's child only.

const inr = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function ParentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? null;

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      ledgerApi.list(schoolId, { page: 1, limit: 100 }),
      attendanceApi.list(schoolId, { page: 1, limit: 200 }),
      homeworkApi.list(schoolId, { page: 1, limit: 5 }),
    ]).then(([l, a, h]) => {
      if (cancelled) return;
      if (l.status === 'fulfilled') setLedger(l.value.data);
      if (a.status === 'fulfilled') setAttendance(a.value.data);
      if (h.status === 'fulfilled') setHomework(h.value.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const balance = useMemo(() => {
    let billed = 0;
    let paid = 0;
    for (const e of ledger) {
      if (e.entryType === 'Debit') billed += Number(e.amount);
      else if (e.entryType === 'Credit') paid += Number(e.amount);
    }
    return billed - paid;
  }, [ledger]);

  const attendancePct = useMemo(() => {
    if (attendance.length === 0) return null;
    const present = attendance.filter((r) => r.status.toLowerCase() === 'present').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  const cards = [
    {
      label: 'Fees Balance',
      value: loading ? '…' : inr(balance),
      hint: balance > 0 ? 'Due' : 'All clear',
      tone: balance > 0 ? 'text-red-600' : 'text-emerald-600',
      icon: Wallet,
      to: '/my-fees',
    },
    {
      label: 'Attendance',
      value: loading ? '…' : attendancePct === null ? '—' : `${attendancePct}%`,
      hint: 'Present',
      tone: 'text-[var(--text-primary)]',
      icon: ClipboardCheck,
      to: '/my-child',
    },
    {
      label: 'Homework',
      value: loading ? '…' : String(homework.length),
      hint: 'Recent',
      tone: 'text-[var(--text-primary)]',
      icon: NotebookPen,
      to: '/my-child',
    },
    {
      label: 'Results',
      value: 'View',
      hint: 'Marks',
      tone: 'text-[var(--text-primary)]',
      icon: Award,
      to: '/results',
    },
  ];

  return (
    <div className="p-page">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-display font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
          {user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome'}
        </h1>
        <p className="text-[0.8125rem] text-[var(--text-muted)]">Here's a quick look at your child's progress</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.to)}
            className="text-left bg-[var(--card-bg)] rounded-2xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[#002c98]">
                <c.icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-ghost)]" />
            </div>
            <p className={cn('text-[1.25rem] font-display font-extrabold', c.tone)}>{c.value}</p>
            <p className="text-[0.75rem] text-[var(--text-muted)]">
              {c.label} · {c.hint}
            </p>
          </button>
        ))}
      </div>

      {/* Recent homework */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <p className="text-[0.9375rem] font-bold text-[var(--text-primary)]">Recent Homework</p>
          <button
            onClick={() => navigate('/my-child')}
            className="text-[0.75rem] font-semibold text-[#002c98] hover:underline"
          >
            View all
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading...</p>
          </div>
        )}

        {!loading && homework.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">No homework assigned.</p>
          </div>
        )}

        {!loading &&
          homework.map((h, idx) => (
            <div
              key={h.id}
              className={cn(
                'flex items-center justify-between gap-4 px-6 py-3.5',
                idx < homework.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <span className="text-[0.8125rem] font-medium text-[var(--text-primary)] truncate">{h.title}</span>
              {h.dueDate && (
                <span className="flex items-center gap-1.5 text-[0.75rem] text-[var(--text-muted)] whitespace-nowrap">
                  <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {formatDate(h.dueDate)}
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
