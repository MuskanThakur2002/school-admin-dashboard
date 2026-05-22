import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Search, X, Users, ClipboardList, Percent, IndianRupee, UsersRound,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useFeeStore } from '@/stores/fee.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useUIStore } from '@/stores/ui.store';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { FeeEngineNav } from '@/modules/fee-engine/components/FeeEngineNav';
import type { FeeAssignment, FeeStructure } from '@/types/fee.types';
import type { StudentEnrollment } from '@/types/student.types';
import type { ClassGroup } from '@/types/academic.types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

function enrollmentLabel(e: StudentEnrollment): string {
  const name = e.student?.name ?? 'Unknown student';
  const adm = e.student?.admissionNumber ? ` — ${e.student.admissionNumber}` : '';
  const cls = e.classSection?.section ? ` · ${e.classSection.section}` : '';
  return `${name}${adm}${cls}`;
}

export default function AssignmentsPage() {
  const assignments = useFeeStore((s) => s.assignments);
  const assignmentsPage = useFeeStore((s) => s.assignmentsPage);
  const assignmentsLimit = useFeeStore((s) => s.assignmentsLimit);
  const assignmentsTotal = useFeeStore((s) => s.assignmentsTotal);
  const loading = useFeeStore((s) => s.assignmentsLoading);
  const structures = useFeeStore((s) => s.structures);
  const fetchAssignments = useFeeStore((s) => s.fetchAssignments);
  const fetchStructures = useFeeStore((s) => s.fetchStructures);
  const createAssignment = useFeeStore((s) => s.createAssignment);
  const updateAssignment = useFeeStore((s) => s.updateAssignment);
  const deleteAssignment = useFeeStore((s) => s.deleteAssignment);
  const bulkAssignByClass = useFeeStore((s) => s.bulkAssignByClass);

  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);

  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [filterEnrollmentId, setFilterEnrollmentId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<FeeAssignment | null>(null);

  useEffect(() => {
    fetchAssignments(1, 25);
    // Bulk-load structures (used to display structure name on assignment rows).
    fetchStructures(1, 100);
    if (enrollments.length === 0) fetchEnrollments();
    if (classes.length === 0) fetchClasses();
  }, [fetchAssignments, fetchStructures, fetchEnrollments, fetchClasses, enrollments.length, classes.length]);

  const handlePageChange = (newPage: number) =>
    fetchAssignments(newPage, assignmentsLimit, {
      studentEnrollmentId: filterEnrollmentId || undefined,
    });

  const handleLimitChange = (newLimit: number) =>
    fetchAssignments(1, newLimit, {
      studentEnrollmentId: filterEnrollmentId || undefined,
    });

  const handleFilterChange = (newFilter: string) => {
    setFilterEnrollmentId(newFilter);
    fetchAssignments(1, assignmentsLimit, {
      studentEnrollmentId: newFilter || undefined,
    });
  };

  const enrollmentById = useMemo(() => {
    const m = new Map<string, StudentEnrollment>();
    enrollments.forEach((e) => m.set(e.id, e));
    return m;
  }, [enrollments]);

  const structureById = useMemo(() => {
    const m = new Map<string, string>();
    structures.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [structures]);

  // Enrollment filter is applied server-side via the fetch params (see
  // handleFilterChange). Text search is client-side and only searches the
  // currently loaded page.
  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const q = search.toLowerCase();
    return assignments.filter((a) => {
      const e = enrollmentById.get(a.studentEnrollmentId);
      const studentName = e?.student?.name?.toLowerCase() ?? '';
      const adm = e?.student?.admissionNumber?.toLowerCase() ?? '';
      const structureName = (a.feeStructure?.name ?? structureById.get(a.feeStructureId) ?? '').toLowerCase();
      return studentName.includes(q) || adm.includes(q) || structureName.includes(q);
    });
  }, [assignments, search, enrollmentById, structureById]);

  const withConcessionCount = assignments.filter((a) => Number(a.concessionPercent || 0) > 0).length;
  const totalScholarship = assignments.reduce((sum, a) => sum + Number(a.scholarshipAmount || 0), 0);

  const handleDelete = async (a: FeeAssignment) => {
    const enrollment = enrollmentById.get(a.studentEnrollmentId);
    const who = enrollment?.student?.name ?? 'this student';
    if (!confirm(`Remove fee assignment for ${who}?`)) return;
    try {
      await deleteAssignment(a.id);
      showToast({ type: 'info', title: 'Assignment removed', message: who });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete assignment.';
      showToast({ type: 'error', title: 'Delete failed', message });
    }
  };

  const enrollmentFilterOptions = [
    { label: 'All students', value: '' },
    ...enrollments.map((e) => ({ label: enrollmentLabel(e), value: e.id })),
  ];

  return (
    <div className="max-w-[1280px]">
      <FeeEngineNav description="An assignment links a student enrollment to a fee structure. Use per-student concessions (%) or scholarship amounts to give individual discounts on top of the structure." />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Fee Assignments</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Link students to fee structures with per-student concessions and scholarships</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Refresh classes so newly-created sections show up in the picker.
              fetchClasses();
              setBulkOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white text-[#002c98] text-[0.8125rem] font-semibold border border-[#002c98]/20 hover:bg-[#002c98]/5 transition-all"
          >
            <UsersRound className="w-4 h-4" /> Bulk Assign by Class
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" /> Assign Fees
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Assignments', value: assignments.length, icon: ClipboardList, color: 'bg-blue-50 text-blue-600' },
          { label: 'With Concession', value: withConcessionCount, icon: Percent, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Scholarship', value: fmt(totalScholarship), icon: IndianRupee, color: 'bg-violet-50 text-violet-600' },
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

      {/* Filters row */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, admission #, or structure..."
              className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="md:w-72">
            <Select
              label=""
              options={enrollmentFilterOptions}
              value={filterEnrollmentId}
              onChange={(e) => handleFilterChange(e.target.value)}
            />
          </div>
        </div>
        {search && (
          <p className="text-[0.6875rem] text-[var(--text-muted)] mt-1.5 pl-1">
            Searches the current page only ({assignments.length} of {assignmentsTotal} loaded). Use the student filter to narrow across all assignments.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1.5fr_2fr_1fr_1fr_0.4fr_0.4fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Student', 'Class', 'Fee Structure', 'Concession', 'Scholarship', '', ''].map((h, i) => (
            <span key={i} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading assignments...</p>
          </div>
        )}

        {!loading && filtered.map((a, idx) => {
          const enrollment = enrollmentById.get(a.studentEnrollmentId);
          const studentName = enrollment?.student?.name ?? '—';
          const adm = enrollment?.student?.admissionNumber ?? '';
          const classLabel = enrollment?.classSection?.section ?? '—';
          const structureName = a.feeStructure?.name ?? structureById.get(a.feeStructureId) ?? a.feeStructureId.slice(0, 8);
          const concessionPct = Number(a.concessionPercent || 0);
          const scholarship = Number(a.scholarshipAmount || 0);
          const initials = studentName
            .split(/\s+/).filter(Boolean).slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
          return (
            <div
              key={a.id}
              className={cn(
                'grid grid-cols-[2.5fr_1.5fr_2fr_1fr_1fr_0.4fr_0.4fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)]',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.625rem] font-bold">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{studentName}</p>
                  {adm && <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">{adm}</p>}
                </div>
              </div>

              <span className="text-[0.8125rem] text-[var(--text-secondary)]">{classLabel}</span>

              <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{structureName}</span>

              <div className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md w-fit',
                concessionPct > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500',
              )}>
                <Percent className="w-3 h-3" />
                <span className="text-[0.6875rem] font-semibold">{concessionPct}%</span>
              </div>

              <span className="font-display text-[0.8125rem] font-bold text-[var(--text-primary)]">{fmt(scholarship)}</span>

              <button
                onClick={() => setEditing(a)}
                className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all justify-self-end"
                aria-label="Edit assignment"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDelete(a)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all justify-self-end"
                aria-label="Delete assignment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No assignments found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
              {search || filterEnrollmentId ? 'Try clearing filters' : 'Assign a fee structure to a student to get started'}
            </p>
          </div>
        )}

        <Pagination
          page={assignmentsPage}
          limit={assignmentsLimit}
          total={assignmentsTotal}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          label="assignments"
        />
      </div>

      {/* Create modal */}
      <AssignmentFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        enrollments={enrollments}
        structures={structures}
        onSubmit={async (dto) => {
          const created = await createAssignment(dto);
          const enrollment = enrollmentById.get(created.studentEnrollmentId);
          showToast({
            type: 'success',
            title: 'Fees assigned',
            message: enrollment?.student?.name ?? 'Student',
          });
        }}
      />

      {/* Edit modal */}
      <AssignmentFormModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        enrollments={enrollments}
        structures={structures}
        initial={editing ? {
          studentEnrollmentId: editing.studentEnrollmentId,
          feeStructureId: editing.feeStructureId,
          concessionPercent: Number(editing.concessionPercent || 0),
          scholarshipAmount: Number(editing.scholarshipAmount || 0),
        } : undefined}
        onSubmit={async (dto) => {
          if (!editing) return;
          await updateAssignment(editing.id, dto);
          showToast({ type: 'success', title: 'Assignment updated', message: 'Changes saved' });
          setEditing(null);
        }}
      />

      {/* Bulk-class modal */}
      <BulkClassAssignModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        classes={classes}
        structures={structures}
        onSubmit={async ({ classSectionId, academicYearId, feeStructureId }) => {
          const created = await bulkAssignByClass({ classSectionId, academicYearId, feeStructureId });
          showToast({
            type: 'success',
            title: 'Bulk assignment complete',
            message: `${created} student${created === 1 ? '' : 's'} linked to fee structure.`,
          });
          // Jump to page 1 — new rows are prepended server-side, so the user
          // wouldn't see them if they were on page 2+ when bulk-assigning.
          fetchAssignments(1, assignmentsLimit);
        }}
      />
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────

interface AssignmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollments: StudentEnrollment[];
  structures: { id: string; name: string }[];
  initial?: {
    studentEnrollmentId: string;
    feeStructureId: string;
    concessionPercent: number;
    scholarshipAmount: number;
  };
  onSubmit: (dto: {
    studentEnrollmentId: string;
    feeStructureId: string;
    concessionPercent: number;
    scholarshipAmount: number;
  }) => Promise<void>;
}

function AssignmentFormModal({
  open,
  onOpenChange,
  enrollments,
  structures,
  initial,
  onSubmit,
}: AssignmentFormModalProps) {
  const [studentEnrollmentId, setStudentEnrollmentId] = useState(initial?.studentEnrollmentId ?? '');
  const [feeStructureId, setFeeStructureId] = useState(initial?.feeStructureId ?? '');
  const [concessionPercent, setConcessionPercent] = useState(String(initial?.concessionPercent ?? 0));
  const [scholarshipAmount, setScholarshipAmount] = useState(String(initial?.scholarshipAmount ?? 0));
  const [saving, setSaving] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (open) {
      setStudentEnrollmentId(initial?.studentEnrollmentId ?? '');
      setFeeStructureId(initial?.feeStructureId ?? '');
      setConcessionPercent(String(initial?.concessionPercent ?? 0));
      setScholarshipAmount(String(initial?.scholarshipAmount ?? 0));
    }
  }, [open, initial?.studentEnrollmentId, initial?.feeStructureId, initial?.concessionPercent, initial?.scholarshipAmount]);

  const enrollmentOptions = [
    { label: 'Select student...', value: '' },
    ...enrollments.map((e) => ({ label: enrollmentLabel(e), value: e.id })),
  ];

  const structureOptions = [
    { label: 'Select fee structure...', value: '' },
    ...structures.map((s) => ({ label: s.name, value: s.id })),
  ];

  const concessionNum = Number(concessionPercent);
  const scholarshipNum = Number(scholarshipAmount);
  const concessionInvalid = Number.isNaN(concessionNum) || concessionNum < 0 || concessionNum > 100;
  const scholarshipInvalid = Number.isNaN(scholarshipNum) || scholarshipNum < 0;
  const canSubmit =
    !!studentEnrollmentId
    && !!feeStructureId
    && !concessionInvalid
    && !scholarshipInvalid;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        studentEnrollmentId,
        feeStructureId,
        concessionPercent: concessionNum,
        scholarshipAmount: scholarshipNum,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save assignment.';
      showToast({ type: 'error', title: 'Save failed', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Edit Fee Assignment' : 'Assign Fees to Student'}
      description="Choose a student enrollment and a fee structure. Concession and scholarship apply per-student."
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={saving || !canSubmit}>
            {initial ? 'Save Changes' : 'Assign Fees'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Student *"
          options={enrollmentOptions}
          value={studentEnrollmentId}
          onChange={(e) => setStudentEnrollmentId(e.target.value)}
        />
        <Select
          label="Fee Structure *"
          options={structureOptions}
          value={feeStructureId}
          onChange={(e) => setFeeStructureId(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Concession (%) *"
              type="number"
              value={concessionPercent}
              onChange={(e) => setConcessionPercent(e.target.value)}
              placeholder="0"
            />
            {concessionInvalid && (
              <p className="text-[0.6875rem] text-red-500 mt-1">Must be between 0 and 100.</p>
            )}
          </div>
          <div>
            <Input
              label="Scholarship (INR) *"
              type="number"
              value={scholarshipAmount}
              onChange={(e) => setScholarshipAmount(e.target.value)}
              placeholder="0"
            />
            {scholarshipInvalid && (
              <p className="text-[0.6875rem] text-red-500 mt-1">Must be 0 or greater.</p>
            )}
          </div>
        </div>
        {enrollments.length === 0 && (
          <p className="text-[0.6875rem] text-amber-600">
            No student enrollments found. Create enrollments first.
          </p>
        )}
        {structures.length === 0 && (
          <p className="text-[0.6875rem] text-amber-600">
            No fee structures available. Create a structure in the Fee Engine first.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Bulk-class assignment modal ──────────────────────────────

interface SectionOption {
  classSectionId: string;
  academicYearId: string;
  label: string;
}

interface BulkClassAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassGroup[];
  structures: FeeStructure[];
  onSubmit: (dto: {
    classSectionId: string;
    academicYearId: string;
    feeStructureId: string;
  }) => Promise<void>;
}

function BulkClassAssignModal({
  open, onOpenChange, classes, structures, onSubmit,
}: BulkClassAssignModalProps) {
  const [sectionKey, setSectionKey] = useState('');
  const [feeStructureId, setFeeStructureId] = useState('');
  const [saving, setSaving] = useState(false);
  const showToast = useUIStore((s) => s.showToast);
  const structuresLoading = useFeeStore((s) => s.structuresLoading);

  // Flatten classes → sections. Skip sections missing an academicYearId, since
  // the backend requires it on the bulk-class payload.
  const sectionOptions: SectionOption[] = useMemo(() => {
    const out: SectionOption[] = [];
    for (const cls of classes) {
      for (const sec of cls.sections) {
        if (!sec.academicYearId) continue;
        out.push({
          classSectionId: sec.id,
          academicYearId: sec.academicYearId,
          label: `${cls.name} · Section ${sec.name}`,
        });
      }
    }
    return out;
  }, [classes]);

  const selectedSection = sectionOptions.find((s) => s.classSectionId === sectionKey) ?? null;

  // Only fee structures matching the picked section's academic year are eligible.
  const eligibleStructures = useMemo(() => {
    if (!selectedSection) return [];
    return structures.filter((s) => s.academicYearId === selectedSection.academicYearId);
  }, [structures, selectedSection]);

  useEffect(() => {
    if (open) {
      setSectionKey('');
      setFeeStructureId('');
    }
  }, [open]);

  // Clear the structure pick if the chosen one isn't valid for the new section's year.
  useEffect(() => {
    if (feeStructureId && !eligibleStructures.some((s) => s.id === feeStructureId)) {
      setFeeStructureId('');
    }
  }, [eligibleStructures, feeStructureId]);

  const sectionDropdownOptions = [
    { label: sectionOptions.length ? 'Select a class section...' : 'No class sections found', value: '' },
    ...sectionOptions.map((s) => ({ label: s.label, value: s.classSectionId })),
  ];

  const structureDropdownOptions = [
    {
      label: !selectedSection
        ? 'Pick a class section first'
        : structuresLoading
          ? 'Loading fee structures...'
          : eligibleStructures.length
            ? 'Select a fee structure...'
            : 'No structures for this academic year',
      value: '',
    },
    ...eligibleStructures.map((s) => ({ label: s.name, value: s.id })),
  ];

  const canSubmit = !!selectedSection && !!feeStructureId;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedSection || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        classSectionId: selectedSection.classSectionId,
        academicYearId: selectedSection.academicYearId,
        feeStructureId,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not assign fees.';
      showToast({ type: 'error', title: 'Bulk assign failed', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Assign Fees by Class"
      description="Assigns one fee structure to every enrollment in the chosen class section. Concession and scholarship default to 0 — adjust per-student afterwards if needed."
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={saving || !canSubmit}>
            Assign to Class
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Class Section *"
          options={sectionDropdownOptions}
          value={sectionKey}
          onChange={(e) => setSectionKey(e.target.value)}
          disabled={sectionOptions.length === 0}
        />
        <Select
          label="Fee Structure *"
          options={structureDropdownOptions}
          value={feeStructureId}
          onChange={(e) => setFeeStructureId(e.target.value)}
          disabled={!selectedSection || structuresLoading || eligibleStructures.length === 0}
        />
        {sectionOptions.length === 0 && (
          <p className="text-[0.6875rem] text-amber-600">
            No class sections found. Create sections in Academic Setup first.
          </p>
        )}
        {selectedSection && eligibleStructures.length === 0 && (
          <p className="text-[0.6875rem] text-amber-600">
            No fee structures exist for this section's academic year. Create one in Fee Structures.
          </p>
        )}
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-[0.6875rem] text-blue-700 leading-relaxed">
            Every student currently enrolled in this section will be linked to the chosen structure. Students enrolled later are not linked automatically.
          </p>
        </div>
      </div>
    </Modal>
  );
}
