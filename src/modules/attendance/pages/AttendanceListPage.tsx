import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Plane, Calendar, Users, ClipboardList, MinusCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useAttendanceStore } from '@/stores/attendance.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { isKnownAttendanceStatus, type AttendanceRecord, type AttendanceStatus } from '@/types/attendance.types';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

type DraftStatus = '' | AttendanceStatus;

interface Draft {
  enrollmentId: string;
  status: DraftStatus;
  remarks: string;
  // null when no record exists yet for this student+date
  recordId: string | null;
  // snapshot of the saved state — used to detect "dirty" rows
  savedStatus: DraftStatus;
  savedRemarks: string;
  // preserve the original marker if a record exists so admin corrections
  // don't overwrite the audit trail
  markedById: string | null;
  // raw backend status when it's outside the four values this UI knows.
  // The row is presented as "unmarked" for editing, but the chip warns the
  // admin that a real (foreign) value is on the server, and the dirty check
  // ensures we don't clobber it unless they explicitly pick a known status.
  unsupportedStatus: string | null;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeBg: string; activeText: string; idleText: string; dot: string }[] = [
  { value: 'Present', label: 'P',  activeBg: 'bg-emerald-500', activeText: 'text-white', idleText: 'text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'Absent',  label: 'A',  activeBg: 'bg-red-500',     activeText: 'text-white', idleText: 'text-red-700',     dot: 'bg-red-500' },
  { value: 'Late',    label: 'L',  activeBg: 'bg-amber-500',   activeText: 'text-white', idleText: 'text-amber-700',   dot: 'bg-amber-500' },
  { value: 'Leave',   label: 'Lv', activeBg: 'bg-blue-500',    activeText: 'text-white', idleText: 'text-blue-700',    dot: 'bg-blue-500' },
];

export default function AttendanceListPage() {
  const records = useAttendanceStore((s) => s.records);
  const loading = useAttendanceStore((s) => s.loading);
  const error = useAttendanceStore((s) => s.error);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);
  const markAttendance = useAttendanceStore((s) => s.markAttendance);
  const updateAttendance = useAttendanceStore((s) => s.updateAttendance);
  const deleteAttendance = useAttendanceStore((s) => s.deleteAttendance);

  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);

  const years = useAcademicStore((s) => s.years);
  const classes = useAcademicStore((s) => s.classes);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const showToast = useUIStore((s) => s.showToast);

  const [date, setDate] = useState(today());
  const [classSectionId, setClassSectionId] = useState<string>('');
  const [drafts, setDrafts] = useState<Map<string, Draft>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (years.length === 0) fetchYears();
    if (classes.length === 0) fetchClasses();
  }, [years.length, classes.length, fetchYears, fetchClasses]);

  const activeYear = useMemo(() => years.find((y) => y.isCurrent) ?? null, [years]);

  // Fetch the roster for the chosen section (all enrollments) — gives us the
  // full list of students to mark, including those without an existing record.
  useEffect(() => {
    if (classSectionId && activeYear?.id) {
      fetchEnrollments({ classSectionId, academicYearId: activeYear.id, limit: 500 });
    }
  }, [classSectionId, activeYear?.id, fetchEnrollments]);

  // Fetch existing attendance for the date + section — feeds the "pre-fill" branch.
  useEffect(() => {
    if (classSectionId) {
      fetchAttendance({ date, classSectionId, limit: 500 });
    }
  }, [date, classSectionId, fetchAttendance]);

  const rosterEnrollments = useMemo(
    () =>
      enrollments
        .filter((e) => e.classSectionId === classSectionId)
        .sort((a, b) => a.rollNumber - b.rollNumber),
    [enrollments, classSectionId],
  );

  // Rebuild drafts whenever roster or existing records change. Preserves
  // in-progress edits by re-keying off enrollmentId — but only when the user
  // hasn't already touched a row (dirty rows keep their draft state).
  useEffect(() => {
    setDrafts((prev) => {
      const next = new Map<string, Draft>();
      const recordByEnrollment = new Map<string, AttendanceRecord>();
      for (const r of records) {
        if (r.date === date) recordByEnrollment.set(r.studentEnrollmentId, r);
      }
      for (const e of rosterEnrollments) {
        const existing = recordByEnrollment.get(e.id);
        // Narrow the backend status: known → editable; anything else lands in
        // unsupportedStatus so the chip surfaces it and dirty=false keeps it
        // from being overwritten unless the admin explicitly picks a pill.
        const known = isKnownAttendanceStatus(existing?.status);
        const savedStatus: DraftStatus = known ? (existing!.status as AttendanceStatus) : '';
        const unsupportedStatus = existing && !known && existing.status ? existing.status : null;
        const savedRemarks = existing?.remarks ?? '';
        const prevDraft = prev.get(e.id);
        // Keep an in-progress draft only if it diverges from the server snapshot
        // AND the server snapshot itself hasn't changed (record id is stable).
        const keepDraft =
          prevDraft &&
          prevDraft.recordId === (existing?.id ?? null) &&
          (prevDraft.status !== prevDraft.savedStatus || prevDraft.remarks !== prevDraft.savedRemarks);
        next.set(e.id, {
          enrollmentId: e.id,
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
  }, [rosterEnrollments, records, date]);

  const sectionOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    for (const cls of classes) {
      for (const s of cls.sections) {
        opts.push({ label: `${cls.name} – ${s.name}`, value: s.id });
      }
    }
    return opts;
  }, [classes]);

  const enrollmentMeta = useMemo(() => {
    const map = new Map<string, { name: string; className: string; section: string; roll: number }>();
    for (const e of rosterEnrollments) {
      const className = classes.find((c) => c.id === e.classSection?.classMasterId)?.name ?? '—';
      map.set(e.id, {
        name: e.student?.name ?? `Enrollment ${e.id.slice(0, 6)}…`,
        className,
        section: e.classSection?.section ?? '—',
        roll: e.rollNumber,
      });
    }
    return map;
  }, [rosterEnrollments, classes]);

  const counts = useMemo(() => {
    const c = { total: drafts.size, marked: 0, unmarked: 0, present: 0, absent: 0, late: 0, leave: 0, dirty: 0 };
    for (const d of drafts.values()) {
      if (d.status === '') c.unmarked += 1;
      else {
        c.marked += 1;
        if (d.status === 'Present') c.present += 1;
        else if (d.status === 'Absent') c.absent += 1;
        else if (d.status === 'Late') c.late += 1;
        else if (d.status === 'Leave') c.leave += 1;
      }
      const dirty = d.status !== d.savedStatus || d.remarks !== d.savedRemarks;
      if (dirty && d.status !== '') c.dirty += 1;
    }
    return c;
  }, [drafts]);

  const setDraftStatus = (enrollmentId: string, status: DraftStatus) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const d = next.get(enrollmentId);
      if (d) next.set(enrollmentId, { ...d, status });
      return next;
    });
  };

  const setDraftRemarks = (enrollmentId: string, remarks: string) => {
    setDrafts((prev) => {
      const next = new Map(prev);
      const d = next.get(enrollmentId);
      if (d) next.set(enrollmentId, { ...d, remarks });
      return next;
    });
  };

  const handleDelete = async (recordId: string, studentName: string) => {
    const ok = window.confirm(
      `Delete attendance record for ${studentName || 'this student'} on ${date}? This cannot be undone.`,
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
    if (!classSectionId || counts.dirty === 0) return;
    if (!currentUserId) {
      showToast({
        type: 'error',
        title: 'Not signed in',
        message: 'Your session is missing — refresh and sign in again before saving.',
      });
      return;
    }
    setSaving(true);
    const tasks: Promise<void>[] = [];
    let okCount = 0;
    let failCount = 0;

    for (const d of drafts.values()) {
      const dirty = d.status !== d.savedStatus || d.remarks !== d.savedRemarks;
      if (!dirty || d.status === '') continue;

      const remarks = d.remarks.trim() || null;
      if (d.recordId) {
        // Existing record → PUT, preserve original markedById for audit.
        tasks.push(
          updateAttendance(d.recordId, {
            studentEnrollmentId: d.enrollmentId,
            date,
            status: d.status,
            remarks,
            markedById: d.markedById ?? currentUserId,
          })
            .then(() => { okCount += 1; })
            .catch(() => { failCount += 1; }),
        );
      } else {
        tasks.push(
          markAttendance({
            studentEnrollmentId: d.enrollmentId,
            date,
            status: d.status,
            remarks,
            markedById: currentUserId,
          })
            .then(() => { okCount += 1; })
            .catch(() => { failCount += 1; }),
        );
      }
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
    fetchAttendance({ date, classSectionId, limit: 500 });
  };

  const sectionPicked = !!classSectionId;

  return (
    <div className="max-w-[1280px] pb-24">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.5rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">
            Attendance
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mt-1">
            Pick a date and section to mark or correct attendance for the whole class.
          </p>
        </div>
      </div>

      {!activeYear && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          <div>
            <p className="text-[0.8125rem] font-semibold text-amber-900">No active academic year</p>
            <p className="text-[0.75rem] text-amber-700 mt-0.5">
              Mark one year as current under Academic Setup → Years before marking attendance.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="space-y-1.5">
          <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" strokeWidth={2} />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!activeYear}
              className="bg-[var(--card-bg)] rounded-xl pl-10 pr-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="min-w-[260px]">
          <Select
            label="Class & Section"
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            options={[{ label: 'Select a section…', value: '' }, ...sectionOptions]}
            disabled={!activeYear}
          />
        </div>
      </div>

      {sectionPicked && (
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total',     value: counts.total,    icon: Users,         color: 'bg-slate-50 text-slate-600' },
            { label: 'Marked',    value: counts.marked,   icon: ClipboardList, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Unmarked',  value: counts.unmarked, icon: MinusCircle,   color: 'bg-zinc-50 text-zinc-500' },
            { label: 'Present',   value: counts.present,  icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Absent',    value: counts.absent,   icon: XCircle,       color: 'bg-red-50 text-red-600' },
            { label: 'Late',      value: counts.late,     icon: Clock,         color: 'bg-amber-50 text-amber-600' },
            { label: 'Leave',     value: counts.leave,    icon: Plane,         color: 'bg-blue-50 text-blue-600' },
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
      )}

      {!sectionPicked && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-20 text-center">
          <Users className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">Pick a class & section to begin</p>
          <p className="text-[0.75rem] text-[var(--text-muted)] mt-1">
            Once selected, you'll see the full roster — mark each student Present, Absent, Late, or Leave.
          </p>
        </div>
      )}

      {sectionPicked && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[0.5fr_2fr_1.4fr_2fr_2fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Roll', 'Student', 'Class/Section', 'Status', 'Remarks'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>

          {loading && (
            <div className="py-16 text-center">
              <p className="text-[0.875rem] text-[var(--text-muted)]">Loading roster…</p>
            </div>
          )}

          {!loading && error && (
            <div className="py-12 text-center">
              <p className="text-[0.875rem] font-semibold text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && rosterEnrollments.map((e, idx) => {
            const meta = enrollmentMeta.get(e.id);
            const d = drafts.get(e.id);
            if (!d) return null;
            const dirty = d.status !== d.savedStatus || d.remarks !== d.savedRemarks;
            return (
              <div
                key={e.id}
                className={cn(
                  'grid grid-cols-[0.5fr_2fr_1.4fr_2fr_2fr] gap-4 items-center px-6 py-3.5 transition-colors',
                  idx < rosterEnrollments.length - 1 && 'border-b border-[var(--border-subtle)]',
                  dirty && 'bg-amber-50/40',
                )}
              >
                <span className="text-[0.75rem] font-bold text-[#002c98]">#{meta?.roll ?? '—'}</span>

                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                  {meta?.name ?? '—'}
                </p>

                <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
                  {meta ? `${meta.className} – ${meta.section}` : '—'}
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
                  <div className="inline-flex gap-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const active = d.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDraftStatus(e.id, active ? '' : opt.value)}
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
                    onChange={(ev) => setDraftRemarks(e.id, ev.target.value)}
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

          {!loading && !error && rosterEnrollments.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
              <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No students enrolled in this section</p>
            </div>
          )}
        </div>
      )}

      {sectionPicked && rosterEnrollments.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-subtle)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
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
