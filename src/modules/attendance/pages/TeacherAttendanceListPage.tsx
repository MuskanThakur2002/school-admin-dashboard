import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Hourglass, Calendar, Users, ClipboardList, MinusCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button/Button';
import { useTeacherAttendanceStore } from '@/stores/teacherAttendance.store';
import { useTeacherStore } from '@/stores/teacher.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import {
  isKnownTeacherAttendanceStatus,
  type TeacherAttendanceRecord,
  type TeacherAttendanceStatus,
  type CreateTeacherAttendanceDto,
} from '@/types/teacherAttendance.types';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

type DraftStatus = '' | TeacherAttendanceStatus;

interface Draft {
  teacherId: string;
  status: DraftStatus;
  remarks: string;
  // null when no record exists yet for this teacher+date
  recordId: string | null;
  // snapshot of the saved state — used to detect "dirty" rows
  savedStatus: DraftStatus;
  savedRemarks: string;
  // preserve the original marker on corrections so the audit trail isn't lost
  markedById: string | null;
  // raw backend status when it's outside the values this UI knows.
  unsupportedStatus: string | null;
}

const STATUS_OPTIONS: { value: TeacherAttendanceStatus; label: string; activeBg: string; activeText: string; idleText: string }[] = [
  { value: 'Present',  label: 'P',  activeBg: 'bg-emerald-100 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-400/30', activeText: 'text-emerald-800 dark:text-emerald-300', idleText: 'text-emerald-700 dark:text-emerald-400' },
  { value: 'Absent',   label: 'A',  activeBg: 'bg-red-100 ring-1 ring-inset ring-red-200 dark:bg-red-500/15 dark:ring-red-400/30',                 activeText: 'text-red-800 dark:text-red-300',         idleText: 'text-red-700 dark:text-red-400' },
  { value: 'Late',     label: 'L',  activeBg: 'bg-amber-100 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:ring-amber-400/30',         activeText: 'text-amber-800 dark:text-amber-300',     idleText: 'text-amber-700 dark:text-amber-400' },
  { value: 'Excused',  label: 'E',  activeBg: 'bg-blue-100 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:ring-blue-400/30',             activeText: 'text-blue-800 dark:text-blue-300',       idleText: 'text-blue-700 dark:text-blue-400' },
  { value: 'HalfDay',  label: 'HD', activeBg: 'bg-violet-100 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:ring-violet-400/30',     activeText: 'text-violet-800 dark:text-violet-300',   idleText: 'text-violet-700 dark:text-violet-400' },
];

export default function TeacherAttendanceListPage() {
  const records = useTeacherAttendanceStore((s) => s.records);
  const loading = useTeacherAttendanceStore((s) => s.loading);
  const error = useTeacherAttendanceStore((s) => s.error);
  const fetchAttendance = useTeacherAttendanceStore((s) => s.fetchAttendance);
  const bulkMarkAttendance = useTeacherAttendanceStore((s) => s.bulkMarkAttendance);
  const updateAttendance = useTeacherAttendanceStore((s) => s.updateAttendance);
  const deleteAttendance = useTeacherAttendanceStore((s) => s.deleteAttendance);

  const teachers = useTeacherStore((s) => s.teachers);
  const teachersLoading = useTeacherStore((s) => s.loading);
  const fetchTeachers = useTeacherStore((s) => s.fetchTeachers);

  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const showToast = useUIStore((s) => s.showToast);

  const [date, setDate] = useState(today());
  const [drafts, setDrafts] = useState<Map<string, Draft>>(new Map());
  const [saving, setSaving] = useState(false);

  // Teachers are school-wide, so we load the full roster once.
  useEffect(() => {
    if (teachers.length === 0) fetchTeachers(1, 500);
  }, [teachers.length, fetchTeachers]);

  // Existing attendance for the chosen date feeds the pre-fill branch.
  useEffect(() => {
    fetchAttendance({ date, limit: 500 });
  }, [date, fetchAttendance]);

  const sortedTeachers = useMemo(
    () =>
      [...teachers].sort((a, b) =>
        (a.user?.name ?? a.employeeId).localeCompare(b.user?.name ?? b.employeeId),
      ),
    [teachers],
  );

  // Rebuild drafts whenever roster or existing records change. Preserves
  // in-progress edits by re-keying off teacherId — but only when the user
  // hasn't already touched a row (dirty rows keep their draft state).
  useEffect(() => {
    setDrafts((prev) => {
      const next = new Map<string, Draft>();
      const recordByTeacher = new Map<string, TeacherAttendanceRecord>();
      for (const r of records) {
        if (r.date?.split('T')[0] === date) recordByTeacher.set(r.teacherId, r);
      }
      for (const t of sortedTeachers) {
        const existing = recordByTeacher.get(t.id);
        const known = isKnownTeacherAttendanceStatus(existing?.status);
        const savedStatus: DraftStatus = known ? (existing!.status as TeacherAttendanceStatus) : '';
        const unsupportedStatus = existing && !known && existing.status ? existing.status : null;
        const savedRemarks = existing?.remarks ?? '';
        const prevDraft = prev.get(t.id);
        const keepDraft =
          prevDraft &&
          prevDraft.recordId === (existing?.id ?? null) &&
          (prevDraft.status !== prevDraft.savedStatus || prevDraft.remarks !== prevDraft.savedRemarks);
        next.set(t.id, {
          teacherId: t.id,
          status: keepDraft ? prevDraft!.status : savedStatus,
          remarks: keepDraft ? prevDraft!.remarks : savedRemarks,
          recordId: existing?.id ?? null,
          savedStatus,
          savedRemarks,
          markedById: existing?.markedById ?? null,
          unsupportedStatus,
        });
      }
      return next;
    });
  }, [sortedTeachers, records, date]);

  const teacherMeta = useMemo(() => {
    const map = new Map<string, { name: string; employeeId: string }>();
    for (const t of sortedTeachers) {
      map.set(t.id, {
        name: t.user?.name ?? `Teacher ${t.id.slice(0, 6)}…`,
        employeeId: t.employeeId,
      });
    }
    return map;
  }, [sortedTeachers]);

  const counts = useMemo(() => {
    const c = { total: drafts.size, marked: 0, unmarked: 0, present: 0, absent: 0, late: 0, excused: 0, halfDay: 0, dirty: 0 };
    for (const d of drafts.values()) {
      if (d.status === '') c.unmarked += 1;
      else {
        c.marked += 1;
        if (d.status === 'Present') c.present += 1;
        else if (d.status === 'Absent') c.absent += 1;
        else if (d.status === 'Late') c.late += 1;
        else if (d.status === 'Excused') c.excused += 1;
        else if (d.status === 'HalfDay') c.halfDay += 1;
      }
      const dirty = d.status !== d.savedStatus || d.remarks !== d.savedRemarks;
      if (dirty && d.status !== '') c.dirty += 1;
    }
    return c;
  }, [drafts]);

  const setDraftStatus = (teacherId: string, status: DraftStatus) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const d = next.get(teacherId);
      if (d) next.set(teacherId, { ...d, status });
      return next;
    });
  };

  const setDraftRemarks = (teacherId: string, remarks: string) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const d = next.get(teacherId);
      if (d) next.set(teacherId, { ...d, remarks });
      return next;
    });
  };

  const handleDelete = async (recordId: string, teacherName: string) => {
    const ok = window.confirm(
      `Delete attendance record for ${teacherName || 'this teacher'} on ${date}? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await deleteAttendance(recordId);
      showToast({ type: 'success', title: 'Record deleted' });
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: (err as Error).message });
    }
  };

  const handleSave = async () => {
    if (counts.dirty === 0) return;
    if (!currentUserId) {
      showToast({
        type: 'error',
        title: 'Not signed in',
        message: 'Your session is missing — refresh and sign in again before saving.',
      });
      return;
    }
    setSaving(true);

    // New marks go out in one bulk POST; corrections to existing records go
    // out as individual PUTs (preserving the original markedById for audit).
    const toCreate: CreateTeacherAttendanceDto[] = [];
    const updates: Promise<void>[] = [];
    let okCount = 0;
    let failCount = 0;

    for (const d of drafts.values()) {
      const dirty = d.status !== d.savedStatus || d.remarks !== d.savedRemarks;
      if (!dirty || d.status === '') continue;
      const remarks = d.remarks.trim();

      if (d.recordId) {
        updates.push(
          updateAttendance(d.recordId, {
            teacherId: d.teacherId,
            date,
            status: d.status,
            ...(remarks && { remarks }),
            markedById: d.markedById ?? currentUserId,
          })
            .then(() => { okCount += 1; })
            .catch(() => { failCount += 1; }),
        );
      } else {
        toCreate.push({
          teacherId: d.teacherId,
          date,
          status: d.status,
          ...(remarks && { remarks }),
          markedById: currentUserId,
        });
      }
    }

    const tasks: Promise<void>[] = [...updates];
    if (toCreate.length > 0) {
      tasks.push(
        bulkMarkAttendance(toCreate)
          .then((created) => { okCount += created.length; })
          .catch(() => { failCount += toCreate.length; }),
      );
    }

    await Promise.allSettled(tasks);
    setSaving(false);

    if (failCount === 0) {
      showToast({ type: 'success', title: 'Attendance saved', message: `${okCount} record${okCount === 1 ? '' : 's'} updated` });
    } else if (okCount === 0) {
      showToast({ type: 'error', title: 'Save failed', message: `${failCount} record${failCount === 1 ? '' : 's'} could not be saved` });
    } else {
      showToast({ type: 'info', title: 'Partial save', message: `${okCount} saved, ${failCount} failed` });
    }

    // Refresh from server to snap drafts back to the saved state.
    fetchAttendance({ date, limit: 500 });
  };

  const rosterLoading = loading || teachersLoading;

  return (
    <div className="max-w-[1280px] pb-24">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.5rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">
            Staff Attendance
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mt-1">
            Pick a date and mark or correct attendance for teaching staff.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="space-y-1.5">
          <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" strokeWidth={2} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[var(--card-bg)] rounded-xl pl-10 pr-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-shadow"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'Total',    value: counts.total,    icon: Users,         color: 'bg-slate-50 text-slate-600' },
          { label: 'Marked',   value: counts.marked,   icon: ClipboardList, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Unmarked', value: counts.unmarked, icon: MinusCircle,   color: 'bg-zinc-50 text-zinc-500' },
          { label: 'Present',  value: counts.present,  icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Absent',   value: counts.absent,   icon: XCircle,       color: 'bg-red-50 text-red-600' },
          { label: 'Late',     value: counts.late,     icon: Clock,         color: 'bg-amber-50 text-amber-600' },
          { label: 'Excused',  value: counts.excused,  icon: ShieldCheck,   color: 'bg-blue-50 text-blue-600' },
          { label: 'Half Day', value: counts.halfDay,  icon: Hourglass,     color: 'bg-violet-50 text-violet-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.375rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2fr_1.4fr_2.4fr_2fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Teacher', 'Employee ID', 'Status', 'Remarks'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {rosterLoading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading roster…</p>
          </div>
        )}

        {!rosterLoading && error && (
          <div className="py-12 text-center">
            <p className="text-[0.875rem] font-semibold text-red-600">{error}</p>
          </div>
        )}

        {!rosterLoading && !error && sortedTeachers.map((t, idx) => {
          const meta = teacherMeta.get(t.id);
          const d = drafts.get(t.id);
          if (!d) return null;
          const dirty = d.status !== d.savedStatus || d.remarks !== d.savedRemarks;
          return (
            <div
              key={t.id}
              className={cn(
                'grid grid-cols-[2fr_1.4fr_2.4fr_2fr] gap-4 items-center px-6 py-3.5 transition-colors',
                idx < sortedTeachers.length - 1 && 'border-b border-[var(--border-subtle)]',
                dirty && 'bg-amber-50/40',
              )}
            >
              <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                {meta?.name ?? '—'}
              </p>

              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
                {meta?.employeeId ?? '—'}
              </span>

              <div className="flex flex-col gap-1.5">
                {d.unsupportedStatus && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.625rem] font-bold uppercase tracking-[0.06em] bg-amber-50 text-amber-700 self-start"
                    title={`Server stores "${d.unsupportedStatus}" — pick a pill to override, leave alone to preserve.`}
                  >
                    <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                    Server: {d.unsupportedStatus}
                  </span>
                )}
                <div className="inline-flex gap-1.5 flex-wrap">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = d.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftStatus(t.id, active ? '' : opt.value)}
                        title={opt.value}
                        className={cn(
                          'min-w-[36px] px-2.5 py-1.5 rounded-lg text-[0.75rem] font-bold transition-all',
                          active
                            ? cn(opt.activeBg, opt.activeText, 'shadow-sm')
                            : cn('bg-[var(--card-bg-hover)] hover:bg-white', opt.idleText, 'hover:shadow-sm'),
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={d.remarks}
                  onChange={(ev) => setDraftRemarks(t.id, ev.target.value)}
                  placeholder={d.status === '' ? 'Pick a status first…' : 'Optional remark'}
                  disabled={d.status === '' && !d.unsupportedStatus}
                  className="flex-1 min-w-0 bg-[var(--card-bg-hover)] rounded-lg px-3 py-1.5 text-[0.75rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {d.recordId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(d.recordId!, meta?.name ?? '')}
                    title="Delete this attendance record"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!rosterLoading && !error && sortedTeachers.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No teachers found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Add staff under Teachers before marking attendance.</p>
          </div>
        )}
      </div>

      {sortedTeachers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--card-bg)] shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.4)]">
          <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
            <p className="text-[0.8125rem] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{counts.dirty}</span> change{counts.dirty === 1 ? '' : 's'} pending
              <span className="text-[var(--text-muted)]"> · {counts.marked} of {counts.total} marked</span>
            </p>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={counts.dirty === 0 || saving || !currentUserId}
              loading={saving}
              title={!currentUserId ? 'Sign in to save attendance' : undefined}
            >
              Save attendance
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
