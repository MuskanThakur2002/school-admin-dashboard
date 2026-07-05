import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotebookPen, ClipboardCheck, ListChecks, Calendar, CalendarDays, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import { useAcademicStore } from '@/stores/academic.store';
import { teacherApi } from '@/services/modules/teacher.api';
import { homeworkApi } from '@/services/modules/homework.api';
import { attendanceApi } from '@/services/modules/attendance.api';
import { assessmentsApi } from '@/services/modules/assessments.api';
import type { Homework } from '@/types/homework.types';
import type { AttendanceRecord } from '@/types/attendance.types';
import type { Assessment } from '@/types/assessment.types';

// How many rows to surface per card before "View all".
const MAX_ROWS = 6;

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Teacher home page — a focused, teacher-scoped view shown instead of the
 * admin/finance dashboard.
 *
 * The homework, attendance, and assessment list endpoints are teacher-scoped
 * on the backend (see backend `teacherScope.ts`), so everything here is already
 * "this teacher's own" — no client-side filtering needed. We still resolve the
 * teacher's own record once, purely to detect an unlinked account and show a
 * helpful hint rather than a silently empty page.
 */
export function TeacherDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  const userId = user?.id ?? null;

  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  // True when the user has no linked Teacher record — we show a hint instead of
  // an empty dashboard, since every scoped list would come back empty anyway.
  const [noTeacherRecord, setNoTeacherRecord] = useState(false);

  useEffect(() => {
    if (classes.length === 0) fetchClasses();
  }, [classes.length, fetchClasses]);

  useEffect(() => {
    if (!schoolId || !userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNoTeacherRecord(false);
      // Identity check only — confirm a Teacher record exists for this user
      // (default Teacher role holds READ_TEACHER). Data is scoped server-side.
      const teachersRes = await teacherApi
        .list(schoolId, { page: 1, limit: 500 })
        .catch(() => ({ data: [], total: 0, page: 1, limit: 0 }));
      const me = teachersRes.data.find((t) => t.userId === userId);
      if (!me) {
        if (!cancelled) {
          setNoTeacherRecord(true);
          setHomework([]);
          setAttendance([]);
          setAssessments([]);
          setLoading(false);
        }
        return;
      }
      const [hw, att, exams] = await Promise.allSettled([
        homeworkApi.list(schoolId, { page: 1, limit: 100 }),
        attendanceApi.list(schoolId, { page: 1, limit: 200 }),
        assessmentsApi.list(schoolId, { page: 1, limit: 50 }),
      ]);
      if (cancelled) return;
      if (hw.status === 'fulfilled') setHomework(hw.value.data);
      if (att.status === 'fulfilled') setAttendance(att.value.data);
      if (exams.status === 'fulfilled') setAssessments(exams.value.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, userId]);

  const sectionLabel = (id?: string | null): string => {
    if (!id) return '—';
    for (const cls of classes) {
      const s = cls.sections.find((sec) => sec.id === id);
      if (s) return `${cls.name} – ${s.name}`;
    }
    return '—';
  };

  const recentHomework = useMemo(() => homework.slice(0, MAX_ROWS), [homework]);

  const attendancePct = useMemo(() => {
    if (attendance.length === 0) return null;
    const present = attendance.filter((r) => r.status.toLowerCase() === 'present').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  // Exams sorted by start date ascending (undated last) — soonest first.
  const upcomingExams = useMemo(() => {
    const withTime = assessments.map((a) => ({
      a,
      t: a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY,
    }));
    withTime.sort((x, y) => x.t - y.t);
    return withTime.slice(0, MAX_ROWS).map((x) => x.a);
  }, [assessments]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  if (loading) {
    return (
      <div className="max-w-[1280px]">
        <div className="mb-8">
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
            Welcome, {firstName}
          </h1>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)] mx-auto" />
        </div>
      </div>
    );
  }

  if (noTeacherRecord) {
    return (
      <div className="max-w-[1280px]">
        <div className="mb-8">
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
            Welcome, {firstName}
          </h1>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <NotebookPen className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">
            We couldn't find your teacher profile
          </p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
            Ask an administrator to link your account to a teacher record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
          Welcome, {firstName}
        </h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">
          Here's a snapshot of your classes
        </p>
      </div>

      {/* My Homework */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <NotebookPen className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </div>
            <h2 className="font-display text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
              My Homework
            </h2>
          </div>
          <button
            onClick={() => navigate('/homework')}
            className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[#002c98] hover:underline"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentHomework.length === 0 ? (
          <div className="py-14 text-center">
            <NotebookPen className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No homework yet</p>
            <button
              onClick={() => navigate('/homework')}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
            >
              Assign homework
            </button>
          </div>
        ) : (
          recentHomework.map((h, idx) => (
            <div
              key={h.id}
              onClick={() => navigate(`/homework/${h.id}`)}
              className={cn(
                'grid grid-cols-[2fr_1.4fr_1.2fr_1fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < recentHomework.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{h.title}</p>
                {h.description && (
                  <p className="text-[0.75rem] text-[var(--text-muted)] truncate mt-0.5">{h.description}</p>
                )}
              </div>
              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">{sectionLabel(h.classSectionId)}</span>
              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">{h.subject?.name ?? '—'}</span>
              <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)] justify-self-end">
                <Calendar className="w-3 h-3" strokeWidth={1.8} />
                <span>{h.dueDate}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom row: Attendance summary + Upcoming Exams */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Attendance */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ClipboardCheck className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </div>
              <h2 className="font-display text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
                Attendance
              </h2>
            </div>
            <button
              onClick={() => navigate('/attendance')}
              className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[#002c98] hover:underline"
            >
              View <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {attendance.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-6 text-center">
              No attendance records yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-display text-[1.875rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">
                  {attendancePct}%
                </p>
                <p className="text-[0.75rem] text-[var(--text-muted)] mt-1.5">Present rate</p>
              </div>
              <div>
                <p className="font-display text-[1.875rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">
                  {attendance.length}
                </p>
                <p className="text-[0.75rem] text-[var(--text-muted)] mt-1.5">Class records</p>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <ListChecks className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </div>
              <h2 className="font-display text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">
                Upcoming Exams
              </h2>
            </div>
            <button
              onClick={() => navigate('/assessments')}
              className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[#002c98] hover:underline"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-6 text-center">
              No exams scheduled.
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingExams.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--card-bg-hover)] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{a.name}</p>
                    <p className="text-[0.75rem] text-[var(--text-muted)] truncate">{sectionLabel(a.classSectionId)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)] shrink-0">
                    <CalendarDays className="w-3 h-3" strokeWidth={1.8} />
                    <span>{formatDate(a.startDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
