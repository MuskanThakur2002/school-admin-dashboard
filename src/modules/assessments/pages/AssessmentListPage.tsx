import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ClipboardList, Pencil, Trash2, Search, X, ListChecks, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { useUIStore } from '@/stores/ui.store';
import { useAssessmentStore } from '@/stores/assessment.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { Assessment } from '@/types/assessment.types';
import type { ClassGroup } from '@/types/academic.types';

interface FormState {
  name: string;
  academicYearId: string;
  classMasterId: string;
  classSectionId: string;
  startDate: string;
  endDate: string;
  maxMarks: string;
  description: string;
  imageUrl: string;
}

function emptyForm(activeYearId: string): FormState {
  return {
    name: '',
    academicYearId: activeYearId,
    classMasterId: '',
    classSectionId: '',
    startDate: '',
    endDate: '',
    maxMarks: '100',
    description: '',
    imageUrl: '',
  };
}

export default function AssessmentListPage() {
  const items = useAssessmentStore((s) => s.items);
  const total = useAssessmentStore((s) => s.total);
  const page = useAssessmentStore((s) => s.page);
  const limit = useAssessmentStore((s) => s.limit);
  const loading = useAssessmentStore((s) => s.loading);
  const fetchAssessments = useAssessmentStore((s) => s.fetchAssessments);
  const createAssessment = useAssessmentStore((s) => s.createAssessment);
  const updateAssessment = useAssessmentStore((s) => s.updateAssessment);
  const deleteAssessment = useAssessmentStore((s) => s.deleteAssessment);

  const years = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);

  useEffect(() => {
    if (years.length === 0) fetchYears();
  }, [years.length, fetchYears]);

  useEffect(() => {
    if (classes.length === 0) fetchClasses();
  }, [classes.length, fetchClasses]);

  useEffect(() => {
    fetchAssessments({ page: 1, limit: 25 });
  }, [fetchAssessments]);

  const activeYear = useMemo(
    () => years.find((y) => y.isCurrent) ?? years[0] ?? null,
    [years],
  );

  const yearOptions = useMemo(
    () => years.map((y) => ({ label: y.name, value: y.id })),
    [years],
  );

  const yearLabel = (id: string): string => years.find((y) => y.id === id)?.name ?? '—';

  const filteredData = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((a) => a.name.toLowerCase().includes(q));
  }, [items, search]);

  const handleDelete = async (e: React.MouseEvent, a: Assessment) => {
    e.stopPropagation();
    if (!confirm(`Delete exam "${a.name}"?`)) return;
    try {
      await deleteAssessment(a.id);
      showToast({ type: 'info', title: 'Exam deleted', message: a.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete exam', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
            Exams
          </h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} exams</p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/assessments/marks"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[var(--card-bg-hover)] text-[var(--text-primary)] text-[0.8125rem] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:brightness-95 transition-all"
          >
            <ListChecks className="w-4 h-4" />
            Enter Marks
          </Link>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Exam
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative md:col-span-1">
          <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide mb-1.5">
            Search
          </label>
          <Search className="absolute left-3.5 bottom-3.5 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name..."
            className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 bottom-3.5 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2fr_1.4fr_1fr_0.6fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Name', 'Academic Year', 'Max Marks', ''].map((h) => (
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
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading exams...</p>
          </div>
        )}

        {!loading &&
          filteredData.map((a, idx) => (
            <div
              key={a.id}
              onClick={() => setEditing(a)}
              className={cn(
                'grid grid-cols-[2fr_1.4fr_1fr_0.6fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {a.validImageUrl ? (
                  <img
                    src={a.validImageUrl}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-[var(--card-bg-hover)]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--card-bg-hover)] text-[var(--text-ghost)]">
                    <ImageIcon className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                )}
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                  {a.name}
                </p>
              </div>
              <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
                {yearLabel(a.academicYearId)}
              </span>
              <span className="text-[0.75rem] text-[var(--text-secondary)]">{a.maxMarks}</span>
              <div className="flex gap-1 justify-self-end">
                <Link
                  to={`/assessments/marks?assessmentId=${a.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#002c98] hover:bg-[var(--brand-tint)] transition-colors"
                  aria-label="Enter marks"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(a);
                  }}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[#002c98] hover:bg-[var(--brand-tint)] transition-colors"
                  aria-label="Edit exam"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, a)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Delete exam"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No exams found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
              {search ? 'Try clearing the search' : 'Add the first exam to get started'}
            </p>
          </div>
        )}

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={(p) => fetchAssessments({ page: p, limit })}
          onLimitChange={(l) => fetchAssessments({ page: 1, limit: l })}
          label="exams"
        />
      </div>

      <AssessmentFormModal
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        yearOptions={yearOptions}
        defaultYearId={activeYear?.id ?? ''}
        classes={classes}
        onSubmit={async (form) => {
          if (!form.academicYearId) throw new Error('Academic year is required');
          await createAssessment({
            name: form.name,
            academicYearId: form.academicYearId,
            classMasterId: form.classMasterId,
            classSectionId: form.classSectionId,
            startDate: form.startDate,
            endDate: form.endDate,
            maxMarks: Number(form.maxMarks),
            description: form.description.trim() || undefined,
            imageUrl: form.imageUrl || undefined,
          });
          showToast({ type: 'success', title: 'Exam added', message: form.name });
        }}
        onError={(message) =>
          showToast({ type: 'error', title: 'Failed to add exam', message })
        }
      />

      <AssessmentFormModal
        mode="edit"
        open={editing !== null}
        initial={editing ?? undefined}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        yearOptions={yearOptions}
        defaultYearId={activeYear?.id ?? ''}
        classes={classes}
        onSubmit={async (form) => {
          if (!editing) return;
          await updateAssessment(editing.id, {
            name: form.name,
            academicYearId: form.academicYearId,
            classMasterId: form.classMasterId,
            classSectionId: form.classSectionId,
            startDate: form.startDate,
            endDate: form.endDate,
            maxMarks: Number(form.maxMarks),
            description: form.description.trim() || undefined,
            imageUrl: form.imageUrl || undefined,
          });
          showToast({ type: 'success', title: 'Exam updated', message: form.name });
        }}
        onError={(message) =>
          showToast({ type: 'error', title: 'Failed to update exam', message })
        }
      />
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────

interface AssessmentFormModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  initial?: Assessment;
  onOpenChange: (open: boolean) => void;
  yearOptions: { label: string; value: string }[];
  defaultYearId: string;
  classes: ClassGroup[];
  onSubmit: (form: FormState) => Promise<void>;
  onError: (message: string) => void;
}

function AssessmentFormModal({
  mode,
  open,
  initial,
  onOpenChange,
  yearOptions,
  defaultYearId,
  classes,
  onSubmit,
  onError,
}: AssessmentFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultYearId));
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const uploadImage = useAssessmentStore((s) => s.uploadImage);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name ?? '',
        academicYearId: initial.academicYearId,
        classMasterId: initial.classMasterId ?? '',
        classSectionId: initial.classSectionId ?? '',
        startDate: initial.startDate?.slice(0, 10) ?? '',
        endDate: initial.endDate?.slice(0, 10) ?? '',
        maxMarks: String(initial.maxMarks),
        description: initial.description ?? '',
        imageUrl: initial.imageUrl ?? '',
      });
      setImagePreview(initial.validImageUrl ?? null);
    } else {
      setForm(emptyForm(defaultYearId));
      setImagePreview(null);
    }
  }, [open, initial, defaultYearId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const classOptions = useMemo(
    () => classes.map((c) => ({ label: c.name, value: c.id })),
    [classes],
  );

  const sectionOptions = useMemo(() => {
    const selected = classes.find((c) => c.id === form.classMasterId);
    return (selected?.sections ?? []).map((s) => ({ label: s.name, value: s.id }));
  }, [classes, form.classMasterId]);

  const canSubmit =
    form.name?.trim() &&
    form.academicYearId &&
    form.classMasterId &&
    form.classSectionId &&
    form.startDate &&
    form.endDate &&
    form.maxMarks &&
    Number(form.maxMarks) > 0;

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setUploadingImage(true);
    try {
      const { fileUrl, validUrl } = await uploadImage(file);
      update('imageUrl', fileUrl);
      setImagePreview(validUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    update('imageUrl', '');
    setImagePreview(null);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Add Exam' : 'Edit Exam'}
      description={
        mode === 'create' ? 'Create a new exam for an academic year.' : 'Update exam details.'
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
        <Input
          label="Name *"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g., Term 1 — Midterm"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Max marks *"
            type="number"
            min={1}
            value={form.maxMarks}
            onChange={(e) => update('maxMarks', e.target.value)}
          />
          <Select
            label="Academic year *"
            placeholder="Select year"
            options={yearOptions}
            value={form.academicYearId}
            onChange={(e) => update('academicYearId', e.target.value)}
          />
          <Select
            label="Class *"
            placeholder="Select class"
            options={classOptions}
            value={form.classMasterId}
            onChange={(e) => {
              update('classMasterId', e.target.value);
              update('classSectionId', '');
            }}
          />
          <Select
            label="Section *"
            placeholder={form.classMasterId ? 'Select section' : 'Pick a class first'}
            options={sectionOptions}
            value={form.classSectionId}
            onChange={(e) => update('classSectionId', e.target.value)}
            disabled={!form.classMasterId}
          />
          <Input
            label="Start date *"
            type="date"
            value={form.startDate}
            onChange={(e) => update('startDate', e.target.value)}
          />
          <Input
            label="End date *"
            type="date"
            value={form.endDate}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="exam-description"
            className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            Description
          </label>
          <textarea
            id="exam-description"
            rows={3}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Optional notes about the exam..."
            className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-all resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide">
            Exam image
          </span>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--card-bg-hover)] flex items-center justify-center flex-shrink-0">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-[var(--text-ghost)]" strokeWidth={1.75} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[var(--card-bg-hover)] text-[var(--text-primary)] text-[0.8125rem] font-semibold cursor-pointer hover:brightness-95 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {uploadingImage ? 'Uploading…' : imagePreview ? 'Replace' : 'Upload image'}
              </label>
              {imagePreview && !uploadingImage && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="px-3.5 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
