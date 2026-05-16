import { useEffect, useMemo, useState } from 'react';
import { Plus, Calendar, NotebookPen, Pencil, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { useUIStore } from '@/stores/ui.store';
import { useHomeworkStore } from '@/stores/homework.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useTeacherStore } from '@/stores/teacher.store';
import type { Homework } from '@/types/homework.types';

interface FormState {
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: string;
}

function emptyForm(): FormState {
  return {
    classSectionId: '',
    subjectId: '',
    teacherId: '',
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
  };
}

export default function HomeworkListPage() {
  const items = useHomeworkStore((s) => s.items);
  const total = useHomeworkStore((s) => s.total);
  const page = useHomeworkStore((s) => s.page);
  const limit = useHomeworkStore((s) => s.limit);
  const loading = useHomeworkStore((s) => s.loading);
  const filters = useHomeworkStore((s) => s.filters);
  const fetchHomework = useHomeworkStore((s) => s.fetchHomework);
  const createHomework = useHomeworkStore((s) => s.createHomework);
  const updateHomework = useHomeworkStore((s) => s.updateHomework);
  const deleteHomework = useHomeworkStore((s) => s.deleteHomework);

  const years = useAcademicStore((s) => s.years);
  const classes = useAcademicStore((s) => s.classes);
  const subjects = useAcademicStore((s) => s.subjects);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);

  const teachers = useTeacherStore((s) => s.teachers);
  const fetchTeachers = useTeacherStore((s) => s.fetchTeachers);

  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);

  useEffect(() => {
    if (years.length === 0) fetchYears();
    if (classes.length === 0) fetchClasses();
    if (subjects.length === 0) fetchSubjects();
    if (teachers.length === 0) fetchTeachers(1, 100);
  }, [years.length, classes.length, subjects.length, teachers.length, fetchYears, fetchClasses, fetchSubjects, fetchTeachers]);

  useEffect(() => {
    fetchHomework({ page: 1, limit: 25 });
  }, [fetchHomework]);

  const activeYear = useMemo(() => years.find((y) => y.isCurrent) ?? years[0] ?? null, [years]);

  const sectionOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    for (const cls of classes) {
      for (const s of cls.sections) {
        opts.push({ label: `${cls.name} – ${s.name}`, value: s.id });
      }
    }
    return opts;
  }, [classes]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id })),
    [subjects],
  );

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ label: t.user?.name ?? t.employeeId, value: t.id })),
    [teachers],
  );

  const sectionLabel = (id: string): string => {
    for (const cls of classes) {
      const s = cls.sections.find((sec) => sec.id === id);
      if (s) return `${cls.name} – ${s.name}`;
    }
    return '—';
  };

  const subjectLabel = (id: string): string => subjects.find((s) => s.id === id)?.name ?? '—';
  const teacherLabel = (id: string): string =>
    teachers.find((t) => t.id === id)?.user?.name ?? teachers.find((t) => t.id === id)?.employeeId ?? '—';

  const filteredData = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((h) =>
      h.title.toLowerCase().includes(q) || h.description.toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleDelete = async (e: React.MouseEvent, h: Homework) => {
    e.stopPropagation();
    if (!confirm(`Delete homework "${h.title}"?`)) return;
    try {
      await deleteHomework(h.id);
      showToast({ type: 'info', title: 'Homework deleted', message: h.title });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete homework', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Homework</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} assignments</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Homework
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select
          label="Class / Section"
          options={[{ label: 'All classes', value: '' }, ...sectionOptions]}
          value={filters.classSectionId ?? ''}
          onChange={(e) => fetchHomework({ page: 1, classSectionId: e.target.value || undefined })}
        />
        <Select
          label="Subject"
          options={[{ label: 'All subjects', value: '' }, ...subjectOptions]}
          value={filters.subjectId ?? ''}
          onChange={(e) => fetchHomework({ page: 1, subjectId: e.target.value || undefined })}
        />
        <div className="relative">
          <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide mb-1.5">Search</label>
          <Search className="absolute left-3.5 bottom-3.5 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or description..."
            className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 bottom-3.5 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2fr_1.4fr_1.2fr_1.4fr_1fr_0.6fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Title', 'Class', 'Subject', 'Teacher', 'Due', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading homework...</p>
          </div>
        )}

        {!loading && filteredData.map((h, idx) => (
          <div
            key={h.id}
            onClick={() => setEditing(h)}
            className={cn(
              'grid grid-cols-[2fr_1.4fr_1.2fr_1.4fr_1fr_0.6fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
              idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
            )}
          >
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{h.title}</p>
              {h.description && (
                <p className="text-[0.75rem] text-[var(--text-muted)] truncate mt-0.5">{h.description}</p>
              )}
            </div>
            <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">{sectionLabel(h.classSectionId)}</span>
            <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
              {h.subject?.name ?? subjectLabel(h.subjectId)}
            </span>
            <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">{teacherLabel(h.teacherId)}</span>
            <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
              <Calendar className="w-3 h-3" strokeWidth={1.8} />
              <span>{h.dueDate}</span>
            </div>
            <div className="flex gap-1 justify-self-end">
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(h); }}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#002c98] hover:bg-[var(--brand-tint)] transition-colors"
                aria-label="Edit homework"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => handleDelete(e, h)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Delete homework"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center">
            <NotebookPen className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No homework found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
              {search || filters.classSectionId || filters.subjectId
                ? 'Try clearing filters'
                : 'Add the first assignment to get started'}
            </p>
          </div>
        )}

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={(p) => fetchHomework({ page: p, limit })}
          onLimitChange={(l) => fetchHomework({ page: 1, limit: l })}
          label="homework"
        />
      </div>

      <HomeworkFormModal
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        sectionOptions={sectionOptions}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
        onSubmit={async (form) => {
          if (!activeYear?.id) throw new Error('No active academic year');
          await createHomework({
            classSectionId: form.classSectionId,
            subjectId: form.subjectId,
            teacherId: form.teacherId,
            academicYearId: activeYear.id,
            title: form.title,
            description: form.description,
            dueDate: form.dueDate,
            attachments: {},
          });
          showToast({ type: 'success', title: 'Homework added', message: form.title });
        }}
        onError={(message) => showToast({ type: 'error', title: 'Failed to add homework', message })}
      />

      <HomeworkFormModal
        mode="edit"
        open={editing !== null}
        initial={editing ?? undefined}
        onOpenChange={(next) => { if (!next) setEditing(null); }}
        sectionOptions={sectionOptions}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
        onSubmit={async (form) => {
          if (!editing) return;
          await updateHomework(editing.id, {
            classSectionId: form.classSectionId,
            subjectId: form.subjectId,
            teacherId: form.teacherId,
            title: form.title,
            description: form.description,
            dueDate: form.dueDate,
          });
          showToast({ type: 'success', title: 'Homework updated', message: form.title });
        }}
        onError={(message) => showToast({ type: 'error', title: 'Failed to update homework', message })}
      />
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────

interface HomeworkFormModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  initial?: Homework;
  onOpenChange: (open: boolean) => void;
  sectionOptions: { label: string; value: string }[];
  subjectOptions: { label: string; value: string }[];
  teacherOptions: { label: string; value: string }[];
  onSubmit: (form: FormState) => Promise<void>;
  onError: (message: string) => void;
}

function HomeworkFormModal({
  mode, open, initial, onOpenChange, sectionOptions, subjectOptions, teacherOptions, onSubmit, onError,
}: HomeworkFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        classSectionId: initial.classSectionId,
        subjectId: initial.subjectId,
        teacherId: initial.teacherId,
        title: initial.title,
        description: initial.description,
        dueDate: initial.dueDate?.split('T')[0] ?? '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.classSectionId &&
    form.subjectId &&
    form.teacherId &&
    form.title.trim() &&
    form.dueDate;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Add Homework' : 'Edit Homework'}
      description={mode === 'create' ? 'Assign new homework to a class.' : 'Update homework details.'}
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            {mode === 'create' ? 'Create' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Class / Section *"
            placeholder="Select class"
            options={sectionOptions}
            value={form.classSectionId}
            onChange={(e) => update('classSectionId', e.target.value)}
          />
          <Select
            label="Subject *"
            placeholder="Select subject"
            options={subjectOptions}
            value={form.subjectId}
            onChange={(e) => update('subjectId', e.target.value)}
          />
          <Select
            label="Teacher *"
            placeholder="Select teacher"
            options={teacherOptions}
            value={form.teacherId}
            onChange={(e) => update('teacherId', e.target.value)}
          />
          <Input
            label="Due date *"
            type="date"
            value={form.dueDate}
            onChange={(e) => update('dueDate', e.target.value)}
          />
        </div>
        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g., Chapter 4 — Problems 1 to 10"
        />
        <div className="space-y-1.5">
          <label
            htmlFor="homework-description"
            className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            Description
          </label>
          <textarea
            id="homework-description"
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Instructions for students..."
            className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-all resize-y"
          />
        </div>
      </div>
    </Modal>
  );
}
