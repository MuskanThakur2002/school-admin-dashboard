import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X, Phone, Users as UsersIcon, Pencil, Trash2, Mail } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUserStore } from '@/stores/user.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user.types';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function UsersPage() {
  const users = useUserStore((s) => s.users);
  const total = useUserStore((s) => s.total);
  const page = useUserStore((s) => s.page);
  const limit = useUserStore((s) => s.limit);
  const loading = useUserStore((s) => s.loading);
  const fetchUsers = useUserStore((s) => s.fetchUsers);
  const createUser = useUserStore((s) => s.createUser);
  const updateUser = useUserStore((s) => s.updateUser);
  const deleteUser = useUserStore((s) => s.deleteUser);

  const roles = useSettingsStore((s) => s.roles);
  const fetchRoles = useSettingsStore((s) => s.fetchRoles);

  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers(1, 25);
  }, [fetchUsers]);

  useEffect(() => {
    if (roles.length === 0) fetchRoles();
  }, [roles.length, fetchRoles]);

  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    roles.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [roles]);

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    users.forEach((u) => (u.isActive ? active++ : inactive++));
    return { all: users.length, active, inactive };
  }, [users]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (!q) return true;
      const name = u.name?.toLowerCase() ?? '';
      const email = u.email?.toLowerCase() ?? '';
      const phone = u.phoneNumber?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [users, search, statusFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };
  const openEdit = (u: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(u);
    setModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete user ${name}?`)) return;
    try {
      await deleteUser(id);
      showToast({ type: 'info', title: 'User deleted', message: name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete user', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Users</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} user accounts in this school</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Total Users" value={total} icon={UsersIcon} tint="bg-blue-50 text-blue-600" />
        <MetricCard label="Active" value={counts.active} icon={UsersIcon} tint="bg-emerald-50 text-emerald-600" />
        <MetricCard label="Inactive" value={counts.inactive} icon={UsersIcon} tint="bg-amber-50 text-amber-600" />
      </div>

      {/* Status tabs + search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex p-1 bg-[var(--card-bg)] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {(['active', 'inactive', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-[0.75rem] font-semibold capitalize transition-all',
                statusFilter === s
                  ? 'bg-[#002c98] text-white shadow-[0_1px_2px_rgba(0,44,152,0.2)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              )}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
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
        <div className="grid grid-cols-[2.2fr_2fr_1.2fr_1.2fr_1fr_0.6fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Name', 'Email', 'Phone', 'Role', 'Status', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading users...</p>
          </div>
        )}

        {!loading && filteredData.map((u, idx) => {
          const name = u.name || '—';
          const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('') || '?';
          const roleName = roleMap.get(u.roleId) ?? u.role?.name ?? '—';
          return (
            <div
              key={u.id}
              className={cn(
                'grid grid-cols-[2.2fr_2fr_1.2fr_1.2fr_1fr_0.6fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)]',
                idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.625rem] font-bold">{initials}</span>
                </div>
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{name}</p>
              </div>

              <div className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--text-secondary)] min-w-0">
                <Mail className="w-3 h-3 text-[var(--text-muted)] shrink-0" strokeWidth={1.8} />
                <span className="truncate">{u.email || '—'}</span>
              </div>

              <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
                <Phone className="w-3 h-3" strokeWidth={1.8} />
                <span>{u.phoneNumber || '—'}</span>
              </div>

              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[0.6875rem] font-semibold text-blue-700 w-fit">
                {roleName}
              </span>

              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold w-fit',
                  u.isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-[var(--border-subtle)] text-[var(--text-muted)]',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', u.isActive ? 'bg-emerald-500' : 'bg-[var(--text-muted)]')} />
                {u.isActive ? 'Active' : 'Inactive'}
              </span>

              <div className="flex items-center gap-1 justify-self-end">
                <button
                  onClick={(e) => openEdit(u, e)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)] transition-colors"
                  aria-label="Edit user"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, u.id, name)}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Delete user"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No users found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first user to get started'}</p>
          </div>
        )}

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={(p) => fetchUsers(p, limit)}
          onLimitChange={(l) => fetchUsers(1, l)}
          label="users"
        />
      </div>

      <UserFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editingUser={editingUser}
        roleOptions={roles.map((r) => ({ value: r.id, label: r.name }))}
        onCreate={createUser}
        onUpdate={updateUser}
        onSuccess={(name, mode) =>
          showToast({
            type: 'success',
            title: mode === 'create' ? 'User created' : 'User updated',
            message: name,
          })
        }
        onError={(message, mode) =>
          showToast({
            type: 'error',
            title: mode === 'create' ? 'Failed to create user' : 'Failed to update user',
            message,
          })
        }
      />
    </div>
  );
}

// ─── Metric card ─────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
}

function MetricCard({ label, value, icon: Icon, tint }: MetricCardProps) {
  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', tint)}>
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
      <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{value}</p>
    </div>
  );
}

// ─── User form modal (create + edit) ─────────────────────────

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: User | null;
  roleOptions: { value: string; label: string }[];
  onCreate: (input: CreateUserDto) => Promise<User>;
  onUpdate: (id: string, input: UpdateUserDto) => Promise<User>;
  onSuccess: (name: string, mode: 'create' | 'edit') => void;
  onError: (message: string, mode: 'create' | 'edit') => void;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  whatsapp: string;
  address: string;
  roleId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  whatsapp: '',
  address: '',
  roleId: '',
  isActive: true,
};

function UserFormModal({
  open,
  onOpenChange,
  editingUser,
  roleOptions,
  onCreate,
  onUpdate,
  onSuccess,
  onError,
}: UserFormModalProps) {
  const mode: 'create' | 'edit' = editingUser ? 'edit' : 'create';
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingUser) {
      setForm({
        name: editingUser.name ?? '',
        email: editingUser.email ?? '',
        password: '',
        phoneNumber: editingUser.phoneNumber ?? '',
        whatsapp: editingUser.whatsapp ?? '',
        address: editingUser.address ?? '',
        roleId: editingUser.roleId ?? '',
        isActive: editingUser.isActive,
      });
    } else {
      setForm({ ...EMPTY_FORM, roleId: roleOptions[0]?.value ?? '' });
    }
  }, [open, editingUser, roleOptions]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.name.trim() &&
    form.email.trim() &&
    form.roleId &&
    (mode === 'edit' || form.password.trim());

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        await onCreate({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phoneNumber: form.phoneNumber.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          address: form.address.trim() || undefined,
          roleId: form.roleId,
          isActive: form.isActive,
        });
      } else if (editingUser) {
        const patch: UpdateUserDto = {
          name: form.name.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          address: form.address.trim() || undefined,
          roleId: form.roleId,
          isActive: form.isActive,
        };
        if (form.password.trim()) patch.password = form.password;
        await onUpdate(editingUser.id, patch);
      }
      onSuccess(form.name.trim(), mode);
      onOpenChange(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong', mode);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Add User' : 'Edit User'}
      description={
        mode === 'create'
          ? 'Create a user account and assign a role.'
          : 'Update profile details, role, or status. Leave password blank to keep it unchanged.'
      }
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            {mode === 'create' ? 'Create User' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Profile</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full name *" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g., Asha Mehta" />
            <Input label="Email *" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="user@school.edu" />
            <Input
              label={mode === 'create' ? 'Password *' : 'Password (leave blank to keep)'}
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder={mode === 'create' ? 'Initial password' : '••••••'}
            />
            <Input label="Phone" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} placeholder="9876543210" />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="9876543210" />
            <div className="md:col-span-2">
              <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, city, state" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Access</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <Select
              label="Role *"
              value={form.roleId}
              onChange={(e) => update('roleId', e.target.value)}
              options={roleOptions}
              placeholder={roleOptions.length === 0 ? 'No roles defined' : 'Choose a role'}
              disabled={roleOptions.length === 0}
            />
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none px-1 py-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-subtle)] text-[#002c98] focus:ring-[#002c98]"
              />
              <span className="text-[0.8125rem] font-semibold text-[var(--text-secondary)]">Account active</span>
            </label>
          </div>
          {roleOptions.length === 0 && (
            <p className="text-[0.6875rem] text-amber-600 mt-2">
              No roles have been created. Add one under Settings → Roles & Permissions first.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
