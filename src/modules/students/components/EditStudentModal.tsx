import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useStudentsStore } from '@/stores/students.store';
import type { Student, StudentGender, UpdateStudentDto } from '@/types/student.types';

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  onUpdated: (s: Student) => void;
}

interface FormState {
  name: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: StudentGender;
  status: string;
  enrollmentDate: string;
  transportRoute: string;
  medicalNotes: string;
}

interface FieldErrors {
  name?: string;
  admissionNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  status?: string;
}

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

function buildInitialForm(s: Student): FormState {
  return {
    name: s.name ?? '',
    admissionNumber: s.admissionNumber ?? '',
    dateOfBirth: s.dateOfBirth ?? '',
    gender: s.gender,
    status: s.status ?? 'active',
    enrollmentDate: s.enrollmentDate ?? '',
    transportRoute: s.transportRoute ?? '',
    medicalNotes: s.medicalNotes ?? '',
  };
}

export function EditStudentModal({ open, onOpenChange, student, onUpdated }: EditStudentModalProps) {
  const updateStudent = useStudentsStore((s) => s.updateStudent);

  const [form, setForm] = useState<FormState>(() => buildInitialForm(student));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(student));
      setErrors({});
      setSubmitError(null);
    }
  }, [open, student]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.admissionNumber.trim()) next.admissionNumber = 'Admission number is required';
    if (!form.dateOfBirth) next.dateOfBirth = 'Date of birth is required';
    if (!form.gender) next.gender = 'Gender is required';
    if (!form.status) next.status = 'Status is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const dto: UpdateStudentDto = {
      name: form.name.trim(),
      admissionNumber: form.admissionNumber.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      status: form.status,
      enrollmentDate: form.enrollmentDate || null,
      transportRoute: form.transportRoute.trim() || null,
      medicalNotes: form.medicalNotes.trim() || null,
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await updateStudent(student.id, dto);
      onUpdated(updated);
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
      title="Edit Student"
      description="Update student details. Required fields are marked."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name}
          />
          <Input
            label="Admission Number *"
            value={form.admissionNumber}
            onChange={(e) => update('admissionNumber', e.target.value)}
            error={errors.admissionNumber}
          />
          <Input
            label="Date of Birth *"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
            error={errors.dateOfBirth}
          />
          <Select
            label="Gender *"
            value={form.gender}
            onChange={(e) => update('gender', e.target.value as StudentGender)}
            options={GENDER_OPTIONS}
            error={errors.gender}
          />
          <Select
            label="Status *"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            options={STATUS_OPTIONS}
            error={errors.status}
          />
          <Input
            label="Enrolment Date"
            type="date"
            value={form.enrollmentDate}
            onChange={(e) => update('enrollmentDate', e.target.value)}
          />
          <Input
            label="Transport Route"
            value={form.transportRoute}
            onChange={(e) => update('transportRoute', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="medical-notes"
            className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            Medical Notes
          </label>
          <textarea
            id="medical-notes"
            value={form.medicalNotes}
            onChange={(e) => update('medicalNotes', e.target.value)}
            rows={3}
            className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none transition-all duration-200 font-body shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] resize-none"
          />
        </div>

        {submitError && (
          <div className="rounded-xl bg-red-50 px-4 py-2.5 text-[0.75rem] font-medium text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="tertiary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
