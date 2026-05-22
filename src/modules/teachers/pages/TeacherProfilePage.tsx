import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, Calendar, Phone, Mail, Briefcase, Pencil,
} from 'lucide-react';
import { useTeacherStore } from '@/stores/teacher.store';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { isSuperAdmin } from '@/types/auth.types';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import type { Teacher } from '@/types/teacher.types';
import type { User as UserModel } from '@/types/user.types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5">
      <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-[0.8125rem] text-[var(--text-primary)] font-medium">{value || '—'}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" strokeWidth={2} />
        </div>
        <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getTeacher = useTeacherStore((s) => s.getTeacher);
  const updateTeacher = useTeacherStore((s) => s.updateTeacher);
  const showToast = useUIStore((s) => s.showToast);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getTeacher(id)
      .then((t) => setTeacher(t))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getTeacher]);

  if (loading) {
    return (
      <div className="max-w-[1280px]">
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="max-w-[1280px]">
        <button
          onClick={() => navigate('/teachers')}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teachers
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] font-semibold text-red-600 mb-1">Teacher not found</p>
          <p className="text-[0.75rem] text-[var(--text-muted)]">{error || `No teacher found with ID: ${id}`}</p>
        </div>
      </div>
    );
  }

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
    <div className="max-w-[1280px]">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/teachers')}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teachers
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <span className="font-display text-[1.5rem] font-extrabold text-white">{initials}</span>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em] mb-1">
              {name}
            </h1>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {teacher.employeeId}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[0.75rem] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {phone}</span>
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {email}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined: {teacher.hireDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Account" icon={User}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Name" value={name} />
            <Field label="Email" value={email} />
            <Field label="Phone" value={phone} />
          </div>
        </SectionCard>
        <SectionCard title="Employment" icon={Briefcase}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Employee ID" value={teacher.employeeId} />
            <Field label="Hire Date" value={teacher.hireDate} />
            <Field label="Created" value={teacher.createdAt?.split('T')[0] ?? ''} />
            <Field label="Updated" value={teacher.updatedAt?.split('T')[0] ?? ''} />
          </div>
        </SectionCard>
      </div>

      <EditTeacherModal
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={teacher}
        onSave={async (input) => {
          const updated = await updateTeacher(teacher.id, input);
          setTeacher(updated);
          showToast({ type: 'success', title: 'Teacher updated', message: updated.user?.name ?? '' });
        }}
        onError={(message) => showToast({ type: 'error', title: 'Failed to update teacher', message })}
      />
    </div>
  );
}

// ─── Edit Teacher modal ────────────────────────────────────────

interface EditTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
  onSave: (input: {
    userId: string;
    user?: { name?: string; email?: string; phoneNumber?: string; whatsapp?: string; address?: string };
    teacher?: { employeeId?: string; hireDate?: string };
  }) => Promise<void>;
  onError: (message: string) => void;
}

function EditTeacherModal({ open, onOpenChange, teacher, onSave, onError }: EditTeacherModalProps) {
  const authUser = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const schoolId = isSuperAdmin(authUser) ? activeSchoolId : authUser?.schoolId ?? null;

  const [form, setForm] = useState({
    name: '', email: '', phoneNumber: '', whatsapp: '', address: '',
    employeeId: '', hireDate: '',
  });
  const [initial, setInitial] = useState(form);
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !schoolId) return;
    setLoadingUser(true);
    usersApi.getById(schoolId, teacher.userId)
      .then((u: UserModel) => {
        const next = {
          name: u.name ?? '',
          email: u.email ?? '',
          phoneNumber: u.phoneNumber ?? '',
          whatsapp: u.whatsapp ?? '',
          address: u.address ?? '',
          employeeId: teacher.employeeId ?? '',
          hireDate: teacher.hireDate ?? '',
        };
        setForm(next);
        setInitial(next);
      })
      .catch((err) => onError((err as Error).message))
      .finally(() => setLoadingUser(false));
  }, [open, schoolId, teacher.userId, teacher.employeeId, teacher.hireDate, onError]);

  const update = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.name.trim() &&
    form.employeeId.trim() &&
    form.hireDate.trim() &&
    !loadingUser;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const userPatch: Record<string, string> = {};
      if (form.name.trim() !== initial.name) userPatch.name = form.name.trim();
      if (form.email.trim() !== initial.email) userPatch.email = form.email.trim();
      if (form.phoneNumber.trim() !== initial.phoneNumber) userPatch.phoneNumber = form.phoneNumber.trim();
      if (form.whatsapp.trim() !== initial.whatsapp) userPatch.whatsapp = form.whatsapp.trim();
      if (form.address.trim() !== initial.address) userPatch.address = form.address.trim();

      const teacherPatch: { employeeId?: string; hireDate?: string } = {};
      if (form.employeeId.trim() !== initial.employeeId) teacherPatch.employeeId = form.employeeId.trim();
      if (form.hireDate.trim() !== initial.hireDate) teacherPatch.hireDate = form.hireDate.trim();

      await onSave({
        userId: teacher.userId,
        user: Object.keys(userPatch).length ? userPatch : undefined,
        teacher: Object.keys(teacherPatch).length ? teacherPatch : undefined,
      });
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
      title="Edit Teacher"
      description="Update the teacher's account and employment details."
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            Save changes
          </Button>
        </>
      }
    >
      {loadingUser ? (
        <p className="text-[0.8125rem] text-[var(--text-muted)] py-6 text-center">Loading teacher details...</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">User account</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full name *" value={form.name} onChange={(e) => update('name', e.target.value)} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
              <Input label="Phone" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} />
              <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />
              <div className="md:col-span-2">
                <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Employment</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Employee ID *" value={form.employeeId} onChange={(e) => update('employeeId', e.target.value)} />
              <Input label="Hire date *" type="date" value={form.hireDate} onChange={(e) => update('hireDate', e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
