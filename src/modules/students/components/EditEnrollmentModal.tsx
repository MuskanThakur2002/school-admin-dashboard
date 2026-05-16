import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { useAcademicStore } from '@/stores/academic.store';
import type {
  StudentEnrollment,
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
} from '@/types/student.types';

interface EditEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  enrollment: StudentEnrollment | null; // null = create mode
  onSaved: (e: StudentEnrollment) => void;
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Transferred', value: 'transferred' },
  { label: 'Withdrawn', value: 'withdrawn' },
  { label: 'Graduated', value: 'graduated' },
];

interface FormState {
  classSectionId: string;
  academicYearId: string;
  rollNumber: string;
  status: string;
  joinedAt: string;
  leftAt: string;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function buildInitialForm(
  enrollment: StudentEnrollment | null,
  defaultYearId: string,
): FormState {
  if (!enrollment) {
    return {
      classSectionId: '',
      academicYearId: defaultYearId,
      rollNumber: '',
      status: 'active',
      joinedAt: todayIso(),
      leftAt: '',
    };
  }
  return {
    classSectionId: enrollment.classSectionId,
    academicYearId: enrollment.academicYearId,
    rollNumber: String(enrollment.rollNumber ?? ''),
    status: enrollment.status || 'active',
    joinedAt: enrollment.joinedAt ?? '',
    leftAt: enrollment.leftAt ?? '',
  };
}

export function EditEnrollmentModal({
  open,
  onOpenChange,
  studentId,
  enrollment,
  onSaved,
}: EditEnrollmentModalProps) {
  const createEnrollment = useEnrollmentStore((s) => s.createEnrollment);
  const updateEnrollment = useEnrollmentStore((s) => s.updateEnrollment);

  const years = useAcademicStore((s) => s.years);
  const classes = useAcademicStore((s) => s.classes);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const activeYear = useMemo(() => years.find((y) => y.isCurrent) ?? years[0] ?? null, [years]);
  const isEdit = enrollment !== null;

  const [form, setForm] = useState<FormState>(() => buildInitialForm(enrollment, activeYear?.id ?? ''));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (years.length === 0) fetchYears();
    if (classes.length === 0) fetchClasses();
  }, [open, years.length, classes.length, fetchYears, fetchClasses]);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(enrollment, activeYear?.id ?? ''));
      setSubmitError(null);
    }
  }, [open, enrollment, activeYear?.id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const sectionOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: 'Select class-section…', value: '' }];
    for (const cls of classes) {
      for (const s of cls.sections) {
        opts.push({ label: `${cls.name} – ${s.name}`, value: s.id });
      }
    }
    return opts;
  }, [classes]);

  const yearOptions = useMemo(
    () => years.map((y) => ({ label: y.isCurrent ? `${y.name} (current)` : y.name, value: y.id })),
    [years],
  );

  const canSubmit =
    form.classSectionId.trim() &&
    form.academicYearId.trim() &&
    form.status.trim() &&
    form.joinedAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const rollNum = form.rollNumber.trim() ? Number(form.rollNumber) : 0;
      const joinedAt = form.joinedAt.includes('T')
        ? form.joinedAt
        : new Date(`${form.joinedAt}T00:00:00.000Z`).toISOString();
      const leftAt = form.leftAt
        ? form.leftAt.includes('T')
          ? form.leftAt
          : new Date(`${form.leftAt}T00:00:00.000Z`).toISOString()
        : null;

      let saved: StudentEnrollment;
      if (isEdit && enrollment) {
        const dto: UpdateEnrollmentDto = {
          classSectionId: form.classSectionId,
          academicYearId: form.academicYearId,
          rollNumber: rollNum,
          status: form.status,
          joinedAt,
          leftAt,
        };
        saved = await updateEnrollment(enrollment.id, dto);
      } else {
        const dto: CreateEnrollmentDto = {
          studentId,
          classSectionId: form.classSectionId,
          academicYearId: form.academicYearId,
          rollNumber: rollNum,
          status: form.status,
          joinedAt,
          leftAt,
        };
        saved = await createEnrollment(dto);
      }
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit enrollment' : 'Enroll student'}
      description={isEdit ? 'Update class-section, roll number, or tenure.' : 'Assign this student to a class-section.'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Class & Section *"
            value={form.classSectionId}
            onChange={(e) => update('classSectionId', e.target.value)}
            options={sectionOptions}
          />
          <Select
            label="Academic Year *"
            value={form.academicYearId}
            onChange={(e) => update('academicYearId', e.target.value)}
            options={yearOptions.length === 0 ? [{ label: 'Loading…', value: '' }] : yearOptions}
          />
          <Input
            label="Roll number"
            type="number"
            min={0}
            value={form.rollNumber}
            onChange={(e) => update('rollNumber', e.target.value)}
            placeholder="e.g., 12"
          />
          <Select
            label="Status *"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Input
            label="Joined on *"
            type="date"
            value={form.joinedAt.split('T')[0]}
            onChange={(e) => update('joinedAt', e.target.value)}
          />
          <Input
            label="Left on"
            type="date"
            value={form.leftAt ? form.leftAt.split('T')[0] : ''}
            onChange={(e) => update('leftAt', e.target.value)}
            hint="Leave empty for active enrollments"
          />
        </div>

        {submitError && (
          <div className="rounded-xl bg-red-50 px-4 py-2.5 text-[0.75rem] font-medium text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="tertiary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
            {isEdit ? 'Save changes' : 'Enroll'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
