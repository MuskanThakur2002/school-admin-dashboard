import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, ClipboardList, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useMarksStore } from '@/stores/marks.store';
import { useAssessmentStore } from '@/stores/assessment.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import type { StudentMark } from '@/types/assessment.types';

interface FormState {
  studentEnrollmentId: string;
  subjectId: string;
  marksObtained: string;
  grade: string;
  remarks: string;
}

function emptyForm(): FormState {
  return {
    studentEnrollmentId: '',
    subjectId: '',
    marksObtained: '',
    grade: '',
    remarks: '',
  };
}

export default function MarksEntryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAssessmentId = searchParams.get('assessmentId') ?? '';
  const initialEnrollmentId = searchParams.get('studentEnrollmentId') ?? '';

  const items = useMarksStore((s) => s.items);
  const total = useMarksStore((s) => s.total);
  const page = useMarksStore((s) => s.page);
  const limit = useMarksStore((s) => s.limit);
  const loading = useMarksStore((s) => s.loading);
  const filters = useMarksStore((s) => s.filters);
  const fetchMarks = useMarksStore((s) => s.fetchMarks);
  const createMark = useMarksStore((s) => s.createMark);
  const updateMark = useMarksStore((s) => s.updateMark);
  const deleteMark = useMarksStore((s) => s.deleteMark);

  const assessments = useAssessmentStore((s) => s.items);
  const fetchAssessments = useAssessmentStore((s) => s.fetchAssessments);

  const subjects = useAcademicStore((s) => s.subjects);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);

  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);

  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StudentMark | null>(null);

  useEffect(() => {
    if (assessments.length === 0) fetchAssessments({ page: 1, limit: 100 });
    if (subjects.length === 0) fetchSubjects();
    if (enrollments.length === 0) fetchEnrollments();
  }, [
    assessments.length,
    subjects.length,
    enrollments.length,
    fetchAssessments,
    fetchSubjects,
    fetchEnrollments,
  ]);

  useEffect(() => {
    fetchMarks({
      page: 1,
      limit: 25,
      assessmentId: initialAssessmentId || undefined,
      studentEnrollmentId: initialEnrollmentId || undefined,
    });
    // Only re-run on URL query param changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssessmentId, initialEnrollmentId]);

  const assessmentOptions = useMemo(
    () => assessments.map((a) => ({ label: `${a.name} (${a.type})`, value: a.id })),
    [assessments],
  );

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ label: `${s.name} (${s.code})`, value: s.id })),
    [subjects],
  );

  const enrollmentOptions = useMemo(
    () =>
      enrollments.map((e) => ({
        label: `${e.student?.name ?? 'Student'} — Roll ${e.rollNumber}`,
        value: e.id,
      })),
    [enrollments],
  );

  const subjectLabel = (id: string): string =>
    subjects.find((s) => s.id === id)?.name ?? '—';

  const enrollmentLabel = (id: string): string => {
    const e = enrollments.find((x) => x.id === id);
    if (!e) return '—';
    return `${e.student?.name ?? 'Student'} — Roll ${e.rollNumber}`;
  };

  const assessmentLabel = (id: string): string =>
    assessments.find((a) => a.id === id)?.name ?? '—';

  const setFilter = (key: 'assessmentId' | 'studentEnrollmentId', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    fetchMarks({ page: 1, [key]: value || undefined } as never);
  };

  const handleDelete = async (e: React.MouseEvent, m: StudentMark) => {
    e.stopPropagation();
    if (!confirm('Delete this mark entry?')) return;
    try {
      await deleteMark(m.id);
      showToast({ type: 'info', title: 'Mark deleted' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete mark', message });
    }
  };

  const activeAssessmentId = filters.assessmentId ?? '';
  const activeEnrollmentId = filters.studentEnrollmentId ?? '';

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            to="/assessments"
            className="inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to exams
          </Link>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
            Marks Entry
          </h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} entries</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setAddOpen(true)}
            disabled={!activeAssessmentId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Mark
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Select
          label="Exam"
          options={[{ label: 'All exams', value: '' }, ...assessmentOptions]}
          value={activeAssessmentId}
          onChange={(e) => setFilter('assessmentId', e.target.value)}
        />
        <Select
          label="Student"
          options={[{ label: 'All students', value: '' }, ...enrollmentOptions]}
          value={activeEnrollmentId}
          onChange={(e) => setFilter('studentEnrollmentId', e.target.value)}
        />
      </div>

      {!activeAssessmentId && (
        <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">
          Pick an exam above to enable adding marks.
        </p>
      )}

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[1.8fr_1.4fr_1fr_0.8fr_1fr_0.6fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Student', 'Subject', 'Exam', 'Marks', 'Grade', ''].map((h) => (
            <span
              key={h}
              className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]"
            >
              {h}
            </span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading marks...</p>
          </div>
        )}

        {!loading &&
          items.map((m, idx) => (
            <div
              key={m.id}
              onClick={() => setEditing(m)}
              className={cn(
                'grid grid-cols-[1.8fr_1.4fr_1fr_0.8fr_1fr_0.6fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < items.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                {enrollmentLabel(m.studentEnrollmentId)}
              </span>
              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
                {m.subject?.name ?? subjectLabel(m.subjectId)}
              </span>
              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
                {assessmentLabel(m.assessmentId)}
              </span>
              <span className="text-[0.75rem] text-[var(--text-secondary)]">{m.marksObtained}</span>
              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">{m.grade}</span>
              <div className="flex gap-1 justify-self-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(m);
                  }}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#002c98] hover:bg-[var(--brand-tint)] transition-colors"
                  aria-label="Edit mark"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, m)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Delete mark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

        {!loading && items.length === 0 && (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No marks found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
              {activeAssessmentId || activeEnrollmentId
                ? 'Try clearing filters or add a mark entry'
                : 'Pick an exam to view or add marks'}
            </p>
          </div>
        )}

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={(p) => fetchMarks({ page: p, limit })}
          onLimitChange={(l) => fetchMarks({ page: 1, limit: l })}
          label="marks"
        />
      </div>

      <MarkFormModal
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        enrollmentOptions={enrollmentOptions}
        subjectOptions={subjectOptions}
        defaultEnrollmentId={activeEnrollmentId}
        onSubmit={async (form) => {
          if (!activeAssessmentId) throw new Error('Pick an exam first');
          if (!user?.id) throw new Error('No active user');
          await createMark({
            studentEnrollmentId: form.studentEnrollmentId,
            assessmentId: activeAssessmentId,
            subjectId: form.subjectId,
            marksObtained: Number(form.marksObtained),
            grade: form.grade,
            remarks: form.remarks,
            enteredById: user.id,
          });
          showToast({ type: 'success', title: 'Mark added' });
        }}
        onError={(message) => showToast({ type: 'error', title: 'Failed to add mark', message })}
      />

      <MarkFormModal
        mode="edit"
        open={editing !== null}
        initial={editing ?? undefined}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        enrollmentOptions={enrollmentOptions}
        subjectOptions={subjectOptions}
        defaultEnrollmentId={activeEnrollmentId}
        onSubmit={async (form) => {
          if (!editing) return;
          await updateMark(editing.id, {
            studentEnrollmentId: form.studentEnrollmentId,
            subjectId: form.subjectId,
            marksObtained: Number(form.marksObtained),
            grade: form.grade,
            remarks: form.remarks,
          });
          showToast({ type: 'success', title: 'Mark updated' });
        }}
        onError={(message) =>
          showToast({ type: 'error', title: 'Failed to update mark', message })
        }
      />
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────

interface MarkFormModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  initial?: StudentMark;
  onOpenChange: (open: boolean) => void;
  enrollmentOptions: { label: string; value: string }[];
  subjectOptions: { label: string; value: string }[];
  defaultEnrollmentId: string;
  onSubmit: (form: FormState) => Promise<void>;
  onError: (message: string) => void;
}

function MarkFormModal({
  mode,
  open,
  initial,
  onOpenChange,
  enrollmentOptions,
  subjectOptions,
  defaultEnrollmentId,
  onSubmit,
  onError,
}: MarkFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        studentEnrollmentId: initial.studentEnrollmentId,
        subjectId: initial.subjectId,
        marksObtained: String(initial.marksObtained),
        grade: initial.grade ?? '',
        remarks: initial.remarks ?? '',
      });
    } else {
      setForm({ ...emptyForm(), studentEnrollmentId: defaultEnrollmentId });
    }
  }, [open, initial, defaultEnrollmentId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.studentEnrollmentId &&
    form.subjectId &&
    form.marksObtained !== '' &&
    !Number.isNaN(Number(form.marksObtained));

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
      title={mode === 'create' ? 'Add Mark' : 'Edit Mark'}
      description={
        mode === 'create' ? 'Record a student mark for the selected exam.' : 'Update mark details.'
      }
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            {mode === 'create' ? 'Create' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Student *"
            placeholder="Select student"
            options={enrollmentOptions}
            value={form.studentEnrollmentId}
            onChange={(e) => update('studentEnrollmentId', e.target.value)}
          />
          <Select
            label="Subject *"
            placeholder="Select subject"
            options={subjectOptions}
            value={form.subjectId}
            onChange={(e) => update('subjectId', e.target.value)}
          />
          <Input
            label="Marks obtained *"
            type="number"
            min={0}
            value={form.marksObtained}
            onChange={(e) => update('marksObtained', e.target.value)}
          />
          <Input
            label="Grade"
            value={form.grade}
            onChange={(e) => update('grade', e.target.value)}
            placeholder="e.g., A, B+, 8"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="mark-remarks"
            className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            Remarks
          </label>
          <textarea
            id="mark-remarks"
            rows={3}
            value={form.remarks}
            onChange={(e) => update('remarks', e.target.value)}
            placeholder="Optional notes..."
            className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-all resize-y"
          />
        </div>
      </div>
    </Modal>
  );
}
