import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useAttendanceStore } from '@/stores/attendance.store';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance.types';

interface EditAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AttendanceRecord | null;
  studentLabel?: string;
  onUpdated: (r: AttendanceRecord) => void;
}

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
  { label: 'Present', value: 'Present' },
  { label: 'Absent', value: 'Absent' },
  { label: 'Late', value: 'Late' },
  { label: 'Leave', value: 'Leave' },
];

export function EditAttendanceModal({
  open,
  onOpenChange,
  record,
  studentLabel,
  onUpdated,
}: EditAttendanceModalProps) {
  const updateAttendance = useAttendanceStore((s) => s.updateAttendance);

  const [status, setStatus] = useState<string>('Present');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open && record) {
      setStatus(record.status || 'Present');
      setRemarks(record.remarks ?? '');
      setSubmitError(null);
    }
  }, [open, record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await updateAttendance(record.id, {
        studentEnrollmentId: record.studentEnrollmentId,
        date: record.date,
        markedById: record.markedById,
        status,
        remarks: remarks.trim() || null,
      });
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
      title="Fix attendance"
      description={studentLabel ? `${studentLabel} · ${record.date}` : `Record from ${record.date}`}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS}
        />

        <div className="space-y-1.5">
          <label
            htmlFor="attendance-remarks"
            className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide"
          >
            Remarks
          </label>
          <textarea
            id="attendance-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Optional context (e.g., bus late, medical leave)"
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
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
