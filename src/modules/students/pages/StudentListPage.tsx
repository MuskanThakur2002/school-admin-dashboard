import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search, X, Users, GraduationCap, UserCheck, Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStudentsStore } from '@/stores/students.store';
import { useParentStore } from '@/stores/parent.store';
import { useUIStore } from '@/stores/ui.store';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import type { CreateStudentDto, StudentGender } from '@/types/student.types';

const genderOptions: { label: string; value: StudentGender }[] = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

const statusStyle: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  inactive: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

function statusBadge(status: string) {
  const key = status?.toLowerCase();
  return statusStyle[key] ?? { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' };
}

export default function StudentListPage() {
  const navigate = useNavigate();
  const students = useStudentsStore((s) => s.students);
  const total = useStudentsStore((s) => s.total);
  const loading = useStudentsStore((s) => s.loading);
  const fetchStudents = useStudentsStore((s) => s.fetchStudents);
  const deleteStudent = useStudentsStore((s) => s.deleteStudent);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchStudents(1, 50);
  }, [fetchStudents]);

  const activeCount = useMemo(
    () => students.filter((s) => s.status?.toLowerCase() === 'active').length,
    [students],
  );

  const filteredData = useMemo(() => {
    return students.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || s.status?.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete student ${name}?`)) return;
    try {
      await deleteStudent(id);
      showToast({ type: 'info', title: 'Student deleted', message: name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete student', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Students</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} students enrolled</p>
        </div>
        <div className="flex gap-2.5">
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
            <Download className="w-4 h-4" strokeWidth={2} />
            Export
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Students', value: total, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: activeCount, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Showing', value: filteredData.length, icon: GraduationCap, color: 'bg-violet-50 text-violet-600' },
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or admission no..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 ml-auto">
          {[
            { v: '', label: 'All Status' },
            { v: 'active', label: 'Active' },
            { v: 'inactive', label: 'Inactive' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setStatusFilter(s.v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
                statusFilter === s.v
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_2.5fr_1fr_1fr_1fr_0.4fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Adm. No.', 'Student', 'DOB', 'Gender', 'Status', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading students...</p>
          </div>
        )}

        {!loading && filteredData.map((student, idx) => {
          const st = statusBadge(student.status);
          const initials = (student.name || '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('') || '?';
          return (
            <div
              key={student.id}
              onClick={() => navigate(`/students/${student.id}`)}
              className={cn(
                'grid grid-cols-[1.2fr_2.5fr_1fr_1fr_1fr_0.4fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide">{student.admissionNumber}</span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.625rem] font-bold">{initials}</span>
                </div>
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{student.name}</p>
              </div>

              <span className="text-[0.8125rem] text-[var(--text-secondary)]">{student.dateOfBirth || '—'}</span>

              <span className="text-[0.8125rem] text-[var(--text-secondary)]">{student.gender}</span>

              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{student.status}</span>
              </div>

              <button
                onClick={(e) => handleDelete(e, student.id, student.name)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors justify-self-end"
                aria-label="Delete student"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No students found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">{search ? 'Try adjusting your search' : 'Add your first student to get started'}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filteredData.length} of {total} students</p>
        </div>
      </div>

      <AddStudentModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

// ─── Add Student modal ────────────────────────────────────────

interface AddStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddStudentModal({ open, onOpenChange }: AddStudentModalProps) {
  const createStudent = useStudentsStore((s) => s.createStudent);
  const parents = useParentStore((s) => s.parents);
  const fetchParents = useParentStore((s) => s.fetchParents);
  const showToast = useUIStore((s) => s.showToast);

  const [form, setForm] = useState({
    name: '',
    admissionNumber: '',
    dateOfBirth: '',
    gender: 'Male' as StudentGender,
    parentId: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && parents.length === 0) fetchParents(1, 100);
  }, [open, parents.length, fetchParents]);

  const reset = () =>
    setForm({ name: '', admissionNumber: '', dateOfBirth: '', gender: 'Male', parentId: '', status: 'active' });

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const update = <K extends keyof typeof form>(key: K, value: typeof form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.name.trim() &&
    form.admissionNumber.trim() &&
    form.dateOfBirth &&
    form.parentId &&
    form.status.trim();

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const dto: CreateStudentDto = {
        name: form.name.trim(),
        admissionNumber: form.admissionNumber.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parentId: form.parentId,
        status: form.status.trim(),
      };
      await createStudent(dto);
      showToast({ type: 'success', title: 'Student added', message: form.name.trim() });
      handleClose(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to add student', message });
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = parents.map((p) => ({
    label: p.user?.name ? `${p.user.name}${p.user.email ? ` — ${p.user.email}` : ''}` : p.id,
    value: p.id,
  }));

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Add Student"
      description="Enrolls a student under an existing parent."
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => handleClose(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            Create Student
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full name *"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g., Arjun Patel"
          />
          <Input
            label="Admission number *"
            value={form.admissionNumber}
            onChange={(e) => update('admissionNumber', e.target.value)}
            placeholder="e.g., ADM-2026-001"
          />
          <Input
            label="Date of birth *"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
          />
          <Select
            label="Gender *"
            value={form.gender}
            onChange={(e) => update('gender', e.target.value as StudentGender)}
            options={genderOptions}
          />
          <Select
            label="Parent *"
            value={form.parentId}
            onChange={(e) => update('parentId', e.target.value)}
            options={parentOptions}
            placeholder={parents.length === 0 ? 'Loading parents...' : 'Select a parent'}
          />
          <Input
            label="Status *"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            placeholder="active"
          />
        </div>
      </div>
    </Modal>
  );
}
