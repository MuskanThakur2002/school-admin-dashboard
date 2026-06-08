import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search, X, Phone, Users, Calendar, Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTeacherStore, type CreateTeacherFlowDto } from '@/stores/teacher.store';
import type { Teacher } from '@/types/teacher.types';
import { useUIStore } from '@/stores/ui.store';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';

export default function TeacherListPage() {
  const navigate = useNavigate();
  const teachers = useTeacherStore((s) => s.teachers);
  const total = useTeacherStore((s) => s.total);
  const page = useTeacherStore((s) => s.page);
  const limit = useTeacherStore((s) => s.limit);
  const loading = useTeacherStore((s) => s.loading);
  const fetchTeachers = useTeacherStore((s) => s.fetchTeachers);
  const createTeacher = useTeacherStore((s) => s.createTeacher);
  const deleteTeacher = useTeacherStore((s) => s.deleteTeacher);

  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchTeachers(1, 25);
  }, [fetchTeachers]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter((t) => {
      const name = t.user?.name?.toLowerCase() ?? '';
      const email = t.user?.email?.toLowerCase() ?? '';
      const empId = t.employeeId?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q) || empId.includes(q);
    });
  }, [teachers, search]);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete teacher ${name}?`)) return;
    try {
      await deleteTeacher(id);
      showToast({ type: 'info', title: 'Teacher deleted', message: name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete teacher', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Teachers</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} teachers on staff</p>
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
            Add Teacher
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Total Teachers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{total}</p>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Showing</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Search className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{filteredData.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, employee ID, email..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_2.5fr_2fr_1.2fr_1fr_0.4fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Emp. ID', 'Teacher', 'Email', 'Phone', 'Hire Date', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading teachers...</p>
          </div>
        )}

        {!loading && filteredData.map((teacher, idx) => {
          const name = teacher.user?.name ?? '—';
          const email = teacher.user?.email ?? '—';
          const phone = teacher.user?.phoneNumber ?? '—';
          const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('') || '?';
          return (
            <div
              key={teacher.id}
              onClick={() => navigate(`/teachers/${teacher.id}`)}
              className={cn(
                'grid grid-cols-[1.2fr_2.5fr_2fr_1.2fr_1fr_0.4fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide">{teacher.employeeId}</span>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.625rem] font-bold">{initials}</span>
                </div>
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{name}</p>
              </div>

              <span className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{email}</span>

              <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
                <Phone className="w-3 h-3" strokeWidth={1.8} />
                <span>{phone}</span>
              </div>

              <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
                <Calendar className="w-3 h-3" strokeWidth={1.8} />
                <span>{teacher.hireDate}</span>
              </div>

              <button
                onClick={(e) => handleDelete(e, teacher.id, name)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors justify-self-end"
                aria-label="Delete teacher"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No teachers found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">{search ? 'Try adjusting your search' : 'Add your first teacher to get started'}</p>
          </div>
        )}

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={(p) => fetchTeachers(p, limit)}
          onLimitChange={(l) => fetchTeachers(1, l)}
          label="teachers"
        />
      </div>

      <AddTeacherModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={createTeacher}
        onSuccess={(name) => showToast({ type: 'success', title: 'Teacher added', message: name })}
        onError={(message) => showToast({ type: 'error', title: 'Failed to add teacher', message })}
      />
    </div>
  );
}

// ─── Add Teacher modal ────────────────────────────────────────

interface AddTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateTeacherFlowDto) => Promise<Teacher>;
  onSuccess: (name: string) => void;
  onError: (message: string) => void;
}

function AddTeacherModal({ open, onOpenChange, onCreate, onSuccess, onError }: AddTeacherModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
    whatsapp: '',
    employeeId: '',
    hireDate: today,
  });
  const [saving, setSaving] = useState(false);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);

  const reset = () => {
    setForm({
      name: '', email: '', password: '', phoneNumber: '', address: '', whatsapp: '',
      employeeId: '', hireDate: today,
    });
    setWhatsappSameAsPhone(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const update = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Phone & WhatsApp accept digits only (max 10). When "same as phone" is on,
  // WhatsApp mirrors the phone number.
  const updatePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({
      ...f,
      phoneNumber: digits,
      ...(whatsappSameAsPhone ? { whatsapp: digits } : {}),
    }));
  };

  const toggleWhatsappSame = (checked: boolean) => {
    setWhatsappSameAsPhone(checked);
    if (checked) setForm((f) => ({ ...f, whatsapp: f.phoneNumber }));
  };

  const canSubmit =
    form.name.trim() &&
    form.password.trim() &&
    form.employeeId.trim() &&
    form.hireDate;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onCreate({
        user: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phoneNumber: form.phoneNumber.trim() || undefined,
          address: form.address.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          isActive: true,
        },
        teacher: {
          employeeId: form.employeeId.trim(),
          hireDate: form.hireDate,
        },
      });
      onSuccess(form.name.trim());
      handleClose(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Add Teacher"
      description="Creates a user account, then links them as a teacher."
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => handleClose(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            Create Teacher
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">User account</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full name *" value={form.name} onChange={(e) => update('name', e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="e.g., Pramod Kumar" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="teacher@school.edu" />
            <Input label="Password *" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Initial password" />
            <Input label="Phone" inputMode="numeric" value={form.phoneNumber} onChange={(e) => updatePhone(e.target.value)} placeholder="9311314401" />
            <div>
              <Input label="WhatsApp" inputMode="numeric" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9311314401" disabled={whatsappSameAsPhone} />
              <label className="mt-1.5 flex items-center gap-2 text-[0.75rem] text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatsappSameAsPhone}
                  onChange={(e) => toggleWhatsappSame(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[var(--border-default)] accent-[#002c98] cursor-pointer"
                />
                Same as phone number
              </label>
            </div>
            <div className="md:col-span-2">
              <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, city, state" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Teacher details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Employee ID *" value={form.employeeId} onChange={(e) => update('employeeId', e.target.value.toUpperCase())} placeholder="EMP-001" />
            <Input label="Hire date *" type="date" value={form.hireDate} onChange={(e) => update('hireDate', e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
