import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, ClipboardCheck, NotebookPen, Award, Wallet, CalendarDays, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { studentsApi } from '@/services/modules/students.api';
import { attendanceApi } from '@/services/modules/attendance.api';
import { homeworkApi } from '@/services/modules/homework.api';
import type { Student, ChildEnrollment } from '@/types/student.types';
import type { AttendanceRecord } from '@/types/attendance.types';
import type { Homework } from '@/types/homework.types';

// Parent-only consolidated hub for a parent's own child/children. All data is
// parent-scoped on the backend; we filter per selected child client-side using
// the enrollment/class info embedded in the scoped students response.

function activeEnrollment(child: Student): ChildEnrollment | undefined {
  const list = child.enrollments ?? [];
  return list.find((e) => (e.status ?? '').toLowerCase() === 'active') ?? list[0];
}

function classLabel(enr?: ChildEnrollment): string {
  if (!enr?.classSection) return '—';
  const cls = enr.classSection.classMaster?.name ?? '';
  const sec = enr.classSection.section ?? '';
  return [cls, sec].filter(Boolean).join(' - ') || '—';
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function MyChildPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? null;

  const [children, setChildren] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      studentsApi.list(schoolId, { page: 1, limit: 50 }),
      attendanceApi.list(schoolId, { page: 1, limit: 300 }),
      homeworkApi.list(schoolId, { page: 1, limit: 100 }),
    ]).then(([s, a, h]) => {
      if (cancelled) return;
      if (s.status === 'fulfilled') setChildren(s.value.data);
      if (a.status === 'fulfilled') setAttendance(a.value.data);
      if (h.status === 'fulfilled') setHomework(h.value.data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedId) ?? children[0] ?? null,
    [children, selectedId],
  );
  const enrollment = selectedChild ? activeEnrollment(selectedChild) : undefined;

  const childAttendance = useMemo(
    () => (enrollment ? attendance.filter((a) => a.studentEnrollmentId === enrollment.id) : []),
    [attendance, enrollment],
  );
  const attendancePct = useMemo(() => {
    if (childAttendance.length === 0) return null;
    const present = childAttendance.filter((r) => r.status.toLowerCase() === 'present').length;
    return Math.round((present / childAttendance.length) * 100);
  }, [childAttendance]);
  const recentAttendance = useMemo(
    () => [...childAttendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [childAttendance],
  );

  const childHomework = useMemo(
    () =>
      (enrollment
        ? homework.filter((h) => h.classSectionId === enrollment.classSectionId)
        : []
      )
        .slice()
        .sort((a, b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
        .slice(0, 6),
    [homework, enrollment],
  );

  if (!loading && children.length === 0) {
    return (
      <div className="p-page">
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">No child linked to your account yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[#002c98]">
          <UserRound className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-[1.375rem] font-display font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            My Child
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-muted)]">Attendance, homework & class details</p>
        </div>
      </div>

      {/* Child selector (only when more than one child) */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {children.map((c) => {
            const active = c.id === (selectedChild?.id ?? '');
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[0.8125rem] font-semibold transition-colors',
                  active
                    ? 'bg-[#002c98] text-white shadow-[0_2px_8px_rgba(0,44,152,0.3)]'
                    : 'bg-[var(--card-bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading...</p>
        </div>
      )}

      {!loading && selectedChild && (
        <div className="space-y-5">
          {/* Overview */}
          <div className="bg-[var(--card-bg)] rounded-2xl px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand-tint)] flex items-center justify-center text-[#002c98] text-[1.25rem] font-display font-extrabold">
                {selectedChild.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-bold text-[var(--text-primary)] truncate">{selectedChild.name}</p>
                <p className="text-[0.8125rem] text-[var(--text-muted)]">
                  {classLabel(enrollment)} · Adm #{selectedChild.admissionNumber || '—'}
                </p>
              </div>
              <span className="ml-auto text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                {selectedChild.status}
              </span>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Attendance', value: attendancePct === null ? '—' : `${attendancePct}%`, icon: ClipboardCheck, tone: 'text-[var(--text-primary)]' },
              { label: 'Homework', value: String(childHomework.length), icon: NotebookPen, tone: 'text-[var(--text-primary)]' },
              { label: 'Results', value: 'View', icon: Award, tone: 'text-[#002c98]', to: '/results' },
              { label: 'Fees', value: 'View', icon: Wallet, tone: 'text-[#002c98]', to: '/my-fees' },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => c.to && navigate(c.to)}
                disabled={!c.to}
                className={cn(
                  'text-left bg-[var(--card-bg)] rounded-2xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
                  c.to && 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[#002c98]">
                    <c.icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
                  </div>
                  {c.to && <ArrowRight className="w-4 h-4 text-[var(--text-ghost)]" />}
                </div>
                <p className={cn('text-[1.25rem] font-display font-extrabold', c.tone)}>{c.value}</p>
                <p className="text-[0.75rem] text-[var(--text-muted)]">{c.label}</p>
              </button>
            ))}
          </div>

          {/* Recent attendance + homework */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Attendance */}
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <p className="text-[0.9375rem] font-bold text-[var(--text-primary)]">Recent Attendance</p>
              </div>
              {recentAttendance.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[0.8125rem] text-[var(--text-muted)]">No attendance records.</p>
                </div>
              ) : (
                recentAttendance.map((r, idx) => (
                  <div
                    key={r.id}
                    className={cn(
                      'flex items-center justify-between px-6 py-3',
                      idx < recentAttendance.length - 1 && 'border-b border-[var(--border-subtle)]',
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[0.75rem] text-[var(--text-muted)]">
                      <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {formatDate(r.date)}
                    </span>
                    <span
                      className={cn(
                        'text-[0.6875rem] font-semibold uppercase tracking-wide',
                        r.status.toLowerCase() === 'present' ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Homework */}
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <p className="text-[0.9375rem] font-bold text-[var(--text-primary)]">Recent Homework</p>
              </div>
              {childHomework.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[0.8125rem] text-[var(--text-muted)]">No homework assigned.</p>
                </div>
              ) : (
                childHomework.map((h, idx) => (
                  <div
                    key={h.id}
                    className={cn(
                      'flex items-center justify-between gap-4 px-6 py-3',
                      idx < childHomework.length - 1 && 'border-b border-[var(--border-subtle)]',
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
