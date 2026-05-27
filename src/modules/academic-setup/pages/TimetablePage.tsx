import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useTeacherStore } from '@/stores/teacher.store';
import { academicApi } from '@/services/modules/academic.api';
import type { TimetableSlot, DayOfWeek } from '@/types/academic.types';

const days: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const subjectColors: Record<string, string> = {
  ENG: 'bg-blue-50 text-blue-700',
  HIN: 'bg-amber-50 text-amber-700',
  MAT: 'bg-violet-50 text-violet-700',
  SCI: 'bg-emerald-50 text-emerald-700',
  PHY: 'bg-indigo-50 text-indigo-700',
  CHE: 'bg-teal-50 text-teal-700',
  BIO: 'bg-green-50 text-green-700',
  SST: 'bg-red-50 text-red-700',
  CS: 'bg-violet-50 text-violet-700',
  PE: 'bg-amber-50 text-amber-700',
  ART: 'bg-emerald-50 text-emerald-700',
  MUS: 'bg-blue-50 text-blue-700',
};

const getSubjectColor = (code: string) => subjectColors[code] || 'bg-slate-50 text-slate-600';

/** Add `mins` to an "HH:MM" time, clamped within a single day. */
const addMinutes = (t: string, mins: number): string => {
  const [h, m] = t.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export default function TimetablePage() {
  const navigate = useNavigate();
  const classes = useAcademicStore((s) => s.classes);
  const subjects = useAcademicStore((s) => s.subjects);
  const years = useAcademicStore((s) => s.years);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const setTimetableSlot = useAcademicStore((s) => s.setTimetableSlot);
  const clearTimetableSlot = useAcademicStore((s) => s.clearTimetableSlot);
  const teachers = useTeacherStore((s) => s.teachers);
  const fetchTeachers = useTeacherStore((s) => s.fetchTeachers);
  const showToast = useUIStore((s) => s.showToast);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [extraRows, setExtraRows] = useState<{ start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDay, setEditorDay] = useState<DayOfWeek>('monday');
  const [editorStart, setEditorStart] = useState('09:00');
  const [editorEnd, setEditorEnd] = useState('09:45');
  const [editorExistingId, setEditorExistingId] = useState<string | undefined>(undefined);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const defaultPeriods = useMemo(() => academicApi.getDefaultPeriods(), []);
  const activeYear = useMemo(() => years.find((y) => y.isCurrent), [years]);

  // Grid rows are derived from the default period times, the real start/end
  // times of the section's slots, and any rows the user just added — deduped
  // by start time and sorted. This guarantees every slot lands on a row.
  const periodRows = useMemo(() => {
    const byStart = new Map<string, { start: string; end: string }>();
    for (const p of defaultPeriods) byStart.set(p.start, { start: p.start, end: p.end });
    for (const s of slots) if (!byStart.has(s.startTime)) byStart.set(s.startTime, { start: s.startTime, end: s.endTime });
    for (const r of extraRows) if (!byStart.has(r.start)) byStart.set(r.start, r);
    return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
  }, [defaultPeriods, slots, extraRows]);

  // Initial fetch
  useEffect(() => {
    if (classes.length === 0) fetchClasses();
    if (subjects.length === 0) fetchSubjects();
    if (years.length === 0) fetchYears();
    if (teachers.length === 0) fetchTeachers(1, 200);
  }, [classes.length, subjects.length, years.length, teachers.length, fetchClasses, fetchSubjects, fetchYears, fetchTeachers]);

  // Auto-pick first class + section
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
      setSelectedSectionId(classes[0].sections[0]?.id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length]);

  // Fetch timetable when selection changes
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId) {
      setSlots([]);
      setExtraRows([]);
      return;
    }
    setLoading(true);
    academicApi.getTimetable(selectedSectionId)
      .then((rows) => {
        setSlots(rows);
        setExtraRows([]);
      })
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSectionId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSection = selectedClass?.sections.find((s) => s.id === selectedSectionId);
  const availableSubjects = subjects;

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    setSelectedSectionId(cls?.sections[0]?.id || '');
  };

  const findSlot = (day: DayOfWeek, start: string) =>
    slots.find((s) => s.day === day && s.startTime === start);

  const openEditor = (day: DayOfWeek, start: string, end: string) => {
    const existing = findSlot(day, start);
    setEditorDay(day);
    setEditorStart(start);
    setEditorEnd(end);
    setEditorExistingId(existing?.id);
    setFormSubjectId(existing?.subjectId || '');
    setFormTeacherId(existing?.teacherId || '');
    setEditorOpen(true);
  };

  const handleAddPeriod = () => {
    const last = periodRows[periodRows.length - 1];
    let start = last ? last.end : '09:00';
    if (periodRows.some((r) => r.start === start)) start = addMinutes(start, 45);
    setExtraRows((prev) => [...prev, { start, end: addMinutes(start, 45) }]);
  };

  const handleSave = async () => {
    if (!editorStart || !editorEnd) {
      showToast({ type: 'error', title: 'Time required', message: 'Set a start and end time' });
      return;
    }
    if (editorEnd <= editorStart) {
      showToast({ type: 'error', title: 'Invalid time', message: 'End time must be after start time' });
      return;
    }
    if (!formSubjectId || !formTeacherId) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Subject and teacher are required' });
      return;
    }
    if (!activeYear) {
      showToast({ type: 'error', title: 'No active year', message: 'Set an academic year as current first' });
      return;
    }
    const subject = subjects.find((s) => s.id === formSubjectId);
    if (!subject) {
      showToast({ type: 'error', title: 'Subject not found', message: 'Pick a valid subject' });
      return;
    }
    const teacher = teachers.find((t) => t.id === formTeacherId);
    if (!teacher) {
      showToast({ type: 'error', title: 'Teacher not found', message: 'Pick a valid teacher' });
      return;
    }
    setSubmitting(true);
    try {
      await setTimetableSlot({
        sectionId: selectedSectionId,
        day: editorDay,
        startTime: editorStart, endTime: editorEnd,
        subjectId: formSubjectId, subjectName: subject.name,
        teacher: teacher.user?.name ?? '',
        teacherId: formTeacherId,
        academicYearId: activeYear.id,
        existingId: editorExistingId,
      });
      const fresh = await academicApi.getTimetable(selectedSectionId);
      setSlots(fresh);
      setExtraRows([]);
      showToast({ type: 'success', title: 'Slot updated' });
      setEditorOpen(false);
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!editorExistingId) return;
    setSubmitting(true);
    try {
      await clearTimetableSlot(editorExistingId);
      const fresh = await academicApi.getTimetable(selectedSectionId);
      setSlots(fresh);
      setExtraRows([]);
      showToast({ type: 'info', title: 'Slot cleared' });
      setEditorOpen(false);
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1280px]">
      <button
        onClick={() => navigate('/academic')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Academic Setup
      </button>

      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Timetable</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Configure weekly periods and subject assignment per class</p>
      </div>

      {!activeYear && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
          <div>
            <p className="text-[0.8125rem] font-semibold text-amber-900">No active academic year</p>
            <p className="text-[0.75rem] text-amber-700 mt-0.5">
              Mark one year as current under Academic Setup → Years before editing the timetable.
            </p>
          </div>
        </div>
      )}

      {/* Class + Section selectors */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Class"
              options={classes.map((c) => ({ label: c.name, value: c.id }))}
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={!activeYear}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Section"
              options={(selectedClass?.sections || []).map((s) => ({ label: `Section ${s.name}`, value: s.id }))}
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={!activeYear}
            />
          </div>
          {selectedSection && selectedSection.classTeacher.trim() && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--card-bg-hover)]">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[0.6875rem] text-[var(--text-muted)]">Class Teacher</p>
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{selectedSection.classTeacher}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timetable grid */}
      {loading ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading timetable...</p>
        </div>
      ) : !selectedClassId || !selectedSectionId ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Clock className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" />
          <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">Select a class and section</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              {/* Header row: days */}
              <div
                className="grid gap-px bg-[var(--border-subtle)]"
                style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}
              >
                <div className="bg-[var(--card-bg-hover)] px-3 py-3">
                  <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">Period</span>
                </div>
                {days.map((d) => (
                  <div key={d.id} className="bg-[var(--card-bg-hover)] px-3 py-3 text-center">
                    <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">{d.short}</p>
                    <p className="text-[0.625rem] text-[var(--text-ghost)] mt-0.5 hidden md:block">{d.label}</p>
                  </div>
                ))}
              </div>

              {/* Period rows */}
              {periodRows.map((row, i) => (
                <div
                  key={row.start}
                  className="grid gap-px bg-[var(--border-subtle)]"
                  style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}
                >
                  {/* Period label */}
                  <div className="bg-[var(--card-bg)] px-3 py-3 flex flex-col justify-center">
                    <p className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">P{i + 1}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)]">{row.start} – {row.end}</p>
                  </div>

                  {/* Day cells */}
                  {days.map((d) => {
                    const slot = findSlot(d.id, row.start);
                    const sub = slot ? subjects.find((s) => s.id === slot.subjectId) : null;
                    const colorClass = sub ? getSubjectColor(sub.code) : '';
                    return (
                      <button
                        key={`${d.id}-${row.start}`}
                        onClick={() => openEditor(d.id, row.start, row.end)}
                        disabled={!activeYear}
                        title={!activeYear ? 'Mark an academic year as current to edit slots' : undefined}
                        className={cn(
                          'bg-[var(--card-bg)] px-2 py-2 text-left transition-colors hover:bg-[var(--card-bg-hover)] min-h-[64px] group',
                          !activeYear && 'cursor-not-allowed opacity-60 hover:bg-[var(--card-bg)]',
                        )}
                      >
                        {slot ? (
                          <div>
                            <span className={cn('inline-block px-1.5 py-0.5 rounded text-[0.5625rem] font-bold mb-1', colorClass)}>
                              {sub?.code || slot.subjectName}
                            </span>
                            <p className="text-[0.6875rem] font-semibold text-[var(--text-primary)] truncate">{slot.subjectName}</p>
                            <p className="text-[0.5625rem] text-[var(--text-muted)] truncate">{slot.teacher}</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Add period row */}
          <div className="px-5 py-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={handleAddPeriod}
              disabled={!activeYear}
              className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#002c98] hover:text-[#001f6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Add period
            </button>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 bg-[var(--card-bg-hover)] flex flex-wrap items-center gap-3">
            <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mr-2">Subjects:</span>
            {availableSubjects.slice(0, 8).map((s) => (
              <span key={s.id} className={cn('inline-flex items-center px-2 py-0.5 rounded text-[0.625rem] font-bold', getSubjectColor(s.code))}>
                {s.code} <span className="ml-1 opacity-70">{s.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Slot Editor Modal */}
      <Modal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        title={`${editorStart}–${editorEnd} · ${days.find((d) => d.id === editorDay)?.label}`}
        description={selectedClass ? `${selectedClass.name} ${selectedSection ? `· Section ${selectedSection.name}` : ''}` : ''}
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            {editorExistingId ? (
              <button
                onClick={handleClear}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Slot
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="tertiary" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} loading={submitting}>Save</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="time"
                label="Start *"
                value={editorStart}
                onChange={(e) => setEditorStart(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                label="End *"
                value={editorEnd}
                onChange={(e) => setEditorEnd(e.target.value)}
              />
            </div>
          </div>
          <Select
            label="Subject *"
            options={availableSubjects.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
            value={formSubjectId}
            onChange={(e) => setFormSubjectId(e.target.value)}
            placeholder={availableSubjects.length === 0 ? 'No subjects yet' : 'Select subject'}
          />
          <Select
            label="Teacher *"
            options={teachers.map((t) => ({
              label: t.user?.name || t.employeeId,
              value: t.id,
            }))}
            value={formTeacherId}
            onChange={(e) => setFormTeacherId(e.target.value)}
            placeholder={teachers.length === 0 ? 'No teachers yet' : 'Select teacher'}
          />
        </div>
      </Modal>
    </div>
  );
}
