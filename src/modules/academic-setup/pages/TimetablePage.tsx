import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Plus, Trash2, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Select } from '@/components/ui/Select/Select';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import { academicApi } from '@/services/modules/academic.api';
import type { TimetableSlot, DayOfWeek } from '@/types/academic.types';

const days: { id: DayOfWeek; label: string; short: string }[] = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
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

export default function TimetablePage() {
  const navigate = useNavigate();
  const classes = useAcademicStore((s) => s.classes);
  const subjects = useAcademicStore((s) => s.subjects);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);
  const setTimetableSlot = useAcademicStore((s) => s.setTimetableSlot);
  const clearTimetableSlot = useAcademicStore((s) => s.clearTimetableSlot);
  const showToast = useUIStore((s) => s.showToast);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDay, setEditorDay] = useState<DayOfWeek>('monday');
  const [editorPeriod, setEditorPeriod] = useState(1);
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const periods = useMemo(() => academicApi.getPeriods(), []);

  // Initial fetch
  useEffect(() => {
    if (classes.length === 0) fetchClasses();
    if (subjects.length === 0) fetchSubjects();
  }, [classes.length, subjects.length, fetchClasses, fetchSubjects]);

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
      return;
    }
    setLoading(true);
    academicApi.getTimetable(selectedClassId, selectedSectionId)
      .then(setSlots)
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSectionId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSection = selectedClass?.sections.find((s) => s.id === selectedSectionId);
  const availableSubjects = useMemo(
    () => (selectedClass ? subjects.filter((s) => s.classes.includes(selectedClass.shortName)) : []),
    [subjects, selectedClass],
  );

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    setSelectedSectionId(cls?.sections[0]?.id || '');
  };

  const findSlot = (day: DayOfWeek, period: number) =>
    slots.find((s) => s.day === day && s.period === period);

  const openEditor = (day: DayOfWeek, period: number) => {
    const existing = findSlot(day, period);
    setEditorDay(day);
    setEditorPeriod(period);
    setFormSubjectId(existing?.subjectId || '');
    setFormTeacher(existing?.teacher || '');
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!formSubjectId || !formTeacher) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Subject and teacher are required' });
      return;
    }
    setSubmitting(true);
    try {
      await setTimetableSlot({
        classId: selectedClassId, sectionId: selectedSectionId,
        day: editorDay, period: editorPeriod,
        subjectId: formSubjectId, teacher: formTeacher,
      });
      const fresh = await academicApi.getTimetable(selectedClassId, selectedSectionId);
      setSlots(fresh);
      showToast({ type: 'success', title: 'Slot updated' });
      setEditorOpen(false);
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    const existing = findSlot(editorDay, editorPeriod);
    if (!existing) return;
    setSubmitting(true);
    try {
      await clearTimetableSlot(existing.id);
      const fresh = await academicApi.getTimetable(selectedClassId, selectedSectionId);
      setSlots(fresh);
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

      {/* Class + Section selectors */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <Select
              label="Class"
              options={classes.map((c) => ({ label: c.name, value: c.id }))}
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Select
              label="Section"
              options={(selectedClass?.sections || []).map((s) => ({ label: `Section ${s.name}`, value: s.id }))}
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
            />
          </div>
          {selectedSection && (
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
            <div className="min-w-[800px]">
              {/* Header row: days */}
              <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-px bg-[var(--border-subtle)]">
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
              {periods.map((p) => (
                <div key={p.period} className="grid grid-cols-[100px_repeat(5,1fr)] gap-px bg-[var(--border-subtle)]">
                  {/* Period label */}
                  <div className="bg-[var(--card-bg)] px-3 py-3 flex flex-col justify-center">
                    <p className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">P{p.period}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)]">{p.start} – {p.end}</p>
                  </div>

                  {/* Day cells */}
                  {days.map((d) => {
                    const slot = findSlot(d.id, p.period);
                    const sub = slot ? subjects.find((s) => s.id === slot.subjectId) : null;
                    const colorClass = sub ? getSubjectColor(sub.code) : '';
                    return (
                      <button
                        key={`${d.id}-${p.period}`}
                        onClick={() => openEditor(d.id, p.period)}
                        className={cn(
                          'bg-[var(--card-bg)] px-2 py-2 text-left transition-colors hover:bg-[var(--card-bg-hover)] min-h-[64px] group',
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
        title={`Period ${editorPeriod} — ${days.find((d) => d.id === editorDay)?.label}`}
        description={selectedClass ? `${selectedClass.name} ${selectedSection ? `· Section ${selectedSection.name}` : ''}` : ''}
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            {findSlot(editorDay, editorPeriod) ? (
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
          <Select
            label="Subject *"
            options={availableSubjects.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id }))}
            value={formSubjectId}
            onChange={(e) => setFormSubjectId(e.target.value)}
            placeholder={availableSubjects.length === 0 ? 'No subjects assigned to this class' : 'Select subject'}
          />
          <Input
            label="Teacher *"
            value={formTeacher}
            onChange={(e) => setFormTeacher(e.target.value)}
            placeholder="e.g. Mr. Amit Verma"
          />
        </div>
      </Modal>
    </div>
  );
}
