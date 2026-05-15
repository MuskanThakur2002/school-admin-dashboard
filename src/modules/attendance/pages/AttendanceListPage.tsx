import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Plane, Calendar, Users, Pencil } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Select } from '@/components/ui/Select/Select';
import { useAttendanceStore } from '@/stores/attendance.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { useAcademicStore } from '@/stores/academic.store';
import { EditAttendanceModal } from '@/modules/attendance/components/EditAttendanceModal';
import type { AttendanceRecord } from '@/types/attendance.types';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  Present:  { label: 'Present', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Absent:   { label: 'Absent',  bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500' },
  Late:     { label: 'Late',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  Leave:    { label: 'Leave',   bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500' },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status || 'Unknown', bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400' };
}

export default function AttendanceListPage() {
  const records = useAttendanceStore((s) => s.records);
  const loading = useAttendanceStore((s) => s.loading);
  const error = useAttendanceStore((s) => s.error);
  const fetchAttendance = useAttendanceStore((s) => s.fetchAttendance);

  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);

  const years = useAcademicStore((s) => s.years);
  const classes = useAcademicStore((s) => s.classes);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const [date, setDate] = useState(today());
  const [classSectionId, setClassSectionId] = useState<string>('');
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Bootstrap academic context (years + classes), needed for filter dropdown
  // and to resolve the active year for the enrollments-map.
  useEffect(() => {
    if (years.length === 0) fetchYears();
    if (classes.length === 0) fetchClasses();
  }, [years.length, classes.length, fetchYears, fetchClasses]);

  const activeYear = useMemo(() => years.find((y) => y.isCurrent) ?? years[0] ?? null, [years]);

  // Fetch all enrollments for the active year once — used to resolve names
  // and class/section labels on the attendance rows. One extra call,
  // joined in-memory.
  useEffect(() => {
    if (activeYear?.id) {
      fetchEnrollments({ academicYearId: activeYear.id, limit: 500 });
    }
  }, [activeYear?.id, fetchEnrollments]);

  // Fetch attendance whenever date or class-section filter changes.
  useEffect(() => {
    fetchAttendance({
      date,
      ...(classSectionId ? { classSectionId } : {}),
      limit: 200,
    });
  }, [date, classSectionId, fetchAttendance]);

  // enrollmentId → { studentName, className, section, rollNumber }
  const enrollmentMap = useMemo(() => {
    const map = new Map<string, { studentName: string; className: string; section: string; rollNumber: number }>();
    for (const e of enrollments) {
      const className =
        classes.find((c) => c.id === e.classSection?.classMasterId)?.name ?? '—';
      map.set(e.id, {
        studentName: e.student?.name ?? 'Unknown student',
        className,
        section: e.classSection?.section ?? '—',
        rollNumber: e.rollNumber,
      });
    }
    return map;
  }, [enrollments, classes]);

  // Section options for the filter dropdown. Flattens class → sections.
  const sectionOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    for (const cls of classes) {
      for (const s of cls.sections) {
        opts.push({ label: `${cls.name} – ${s.name}`, value: s.id });
      }
    }
    return opts;
  }, [classes]);

  // If a class-section filter is set AND the backend ignored it, fall back to
  // client-side filtering. (We optimistically pass classSectionId to the
  // server; if it still returns the unfiltered set, we trim here.)
  const rows = useMemo(() => {
    if (!classSectionId) return records;
    const enrollmentIdsInSection = new Set(
      enrollments
        .filter((e) => e.classSectionId === classSectionId)
        .map((e) => e.id),
    );
    return records.filter((r) => enrollmentIdsInSection.has(r.studentEnrollmentId));
  }, [records, classSectionId, enrollments]);

  // Summary counts
  const counts = useMemo(() => {
    const c = { total: rows.length, present: 0, absent: 0, late: 0, leave: 0 };
    for (const r of rows) {
      if (r.status === 'Present') c.present += 1;
      else if (r.status === 'Absent') c.absent += 1;
      else if (r.status === 'Late') c.late += 1;
      else if (r.status === 'Leave') c.leave += 1;
    }
    return c;
  }, [rows]);

  const openEdit = (record: AttendanceRecord) => {
    setEditing(record);
    setEditOpen(true);
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.5rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">
            Attendance
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mt-1">
            Daily attendance recorded by teachers. Admins can correct entries if needed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total',   value: counts.total,   icon: Users,         color: 'bg-blue-50 text-blue-600' },
          { label: 'Present', value: counts.present, icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Absent',  value: counts.absent,  icon: XCircle,       color: 'bg-red-50 text-red-600' },
          { label: 'Late',    value: counts.late,    icon: Clock,         color: 'bg-amber-50 text-amber-600' },
          { label: 'Leave',   value: counts.leave,   icon: Plane,         color: 'bg-violet-50 text-violet-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="space-y-1.5">
          <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide">
            Date
          </label>
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

        <div className="min-w-[220px]">
          <Select
            label="Class & Section"
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            options={[{ label: 'All classes', value: '' }, ...sectionOptions]}
          />
        </div>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[0.6fr_2fr_1.5fr_1fr_2fr_0.4fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Roll', 'Student', 'Class/Section', 'Status', 'Remarks', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading attendance...</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center">
            <p className="text-[0.875rem] font-semibold text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && rows.map((r, idx) => {
          const meta = enrollmentMap.get(r.studentEnrollmentId);
          const st = statusMeta(r.status);
          return (
            <div
              key={r.id}
              onClick={() => openEdit(r)}
              className={cn(
                'grid grid-cols-[0.6fr_2fr_1.5fr_1fr_2fr_0.4fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < rows.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <span className="text-[0.75rem] font-bold text-[#002c98]">
                {meta ? `#${meta.rollNumber}` : '—'}
              </span>

              <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                {meta?.studentName ?? r.studentEnrollmentId.slice(0, 8) + '…'}
              </p>

              <span className="text-[0.8125rem] text-[var(--text-secondary)]">
                {meta ? `${meta.className} – ${meta.section}` : '—'}
              </span>

              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold', st.text)}>{st.label}</span>
              </div>

              <span className="text-[0.75rem] text-[var(--text-tertiary)] truncate">
                {r.remarks || '—'}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#002c98] hover:bg-blue-50 transition-colors justify-self-end"
                aria-label="Edit attendance"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {!loading && !error && rows.length === 0 && (
          <div className="py-16 text-center">
            <Calendar className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No attendance recorded</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
              Teachers mark attendance from the teacher app — records will appear here once submitted.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{rows.length} record{rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <EditAttendanceModal
        open={editOpen}
        onOpenChange={setEditOpen}
        record={editing}
        studentLabel={editing ? enrollmentMap.get(editing.studentEnrollmentId)?.studentName : undefined}
        onUpdated={() => { /* store already updated; nothing extra needed */ }}
      />
    </div>
  );
}
