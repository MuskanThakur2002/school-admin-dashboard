import { useState, useEffect, type KeyboardEvent } from 'react';
import { Shield, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { Role } from '@/stores/settings.store';

export default function RolesPage() {
  const roles = useSettingsStore((s) => s.roles);
  const fetchRoles = useSettingsStore((s) => s.fetchRoles);
  const createRole = useSettingsStore((s) => s.createRole);
  const updateRole = useSettingsStore((s) => s.updateRole);
  const deleteRole = useSettingsStore((s) => s.deleteRole);

  useEffect(() => { if (roles.length === 0) fetchRoles(); }, [roles.length, fetchRoles]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const [permInput, setPermInput] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  const openCreate = () => { setEditingRole(null); setFormName(''); setFormPerms([]); setPermInput(''); setModalOpen(true); };
  const openEdit = (role: Role) => { setEditingRole(role); setFormName(role.name); setFormPerms([...role.permissions]); setPermInput(''); setModalOpen(true); };

  const commitPermInput = () => {
    const v = permInput.trim();
    if (!v) return;
    if (!formPerms.includes(v)) setFormPerms((prev) => [...prev, v]);
    setPermInput('');
  };
  const handlePermKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitPermInput(); }
    else if (e.key === 'Backspace' && !permInput && formPerms.length) {
      setFormPerms((prev) => prev.slice(0, -1));
    }
  };
  const removePerm = (p: string) => setFormPerms((prev) => prev.filter((x) => x !== p));

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formName.trim() || saving) return;
    const perms = permInput.trim() && !formPerms.includes(permInput.trim())
      ? [...formPerms, permInput.trim()]
      : formPerms;
    setSaving(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, { name: formName, permissions: perms });
        showToast({ type: 'success', title: 'Role updated', message: formName });
      } else {
        await createRole({ name: formName, permissions: perms });
        showToast({ type: 'success', title: 'Role created', message: formName });
      }
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: editingRole ? 'Failed to update role' : 'Failed to create role', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    try {
      await deleteRole(role.id);
      showToast({ type: 'info', title: 'Role deleted', message: role.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete role', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Roles & Permissions</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage user roles and access control</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Shield className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{role.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(role)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 6).map((perm) => (
                <span key={perm} className="px-2 py-0.5 rounded-md bg-[var(--border-subtle)] text-[0.625rem] font-semibold text-[var(--text-tertiary)]">{perm}</span>
              ))}
              {role.permissions.length > 6 && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[0.625rem] font-bold text-blue-600">+{role.permissions.length - 6}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editingRole ? 'Edit Role' : 'Create Role'} description="Define the role name and assign permissions" size="lg"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingRole ? 'Save Changes' : 'Create Role'}</Button></>}>
        <div className="space-y-5">
          <Input label="Role Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Principal" />
          <div>
            <p className="text-[0.8125rem] font-semibold text-[var(--text-secondary)] mb-2">Permissions</p>
            <p className="text-[0.75rem] text-[var(--text-muted)] mb-2">Type a permission and press Enter or comma to add (e.g. <code className="px-1 rounded bg-[var(--border-subtle)]">CREATE_STUDENT</code>).</p>
            <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--border-subtle)] focus-within:border-[#002c98] transition-colors">
              {formPerms.map((perm) => (
                <span key={perm} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#002c98] text-white text-[0.6875rem] font-semibold">
                  {perm}
                  <button type="button" onClick={() => removePerm(perm)} className="hover:opacity-80"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input
                value={permInput}
                onChange={(e) => setPermInput(e.target.value)}
                onKeyDown={handlePermKey}
                onBlur={commitPermInput}
                placeholder={formPerms.length ? '' : 'CREATE_STUDENT'}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
