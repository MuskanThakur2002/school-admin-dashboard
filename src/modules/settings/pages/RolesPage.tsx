import { useState, useEffect } from 'react';
import { Shield, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
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
  const permissionGroups = useSettingsStore((s) => s.getPermissionGroups());

  useEffect(() => { if (roles.length === 0) fetchRoles(); }, [roles.length, fetchRoles]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const showToast = useUIStore((s) => s.showToast);

  const openCreate = () => { setEditingRole(null); setFormName(''); setFormDesc(''); setFormPerms(['dashboard.read']); setModalOpen(true); };
  const openEdit = (role: Role) => { setEditingRole(role); setFormName(role.name); setFormDesc(role.description); setFormPerms([...role.permissions]); setModalOpen(true); };
  const togglePerm = (perm: string) => setFormPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);

  const handleSave = () => {
    if (!formName.trim()) return;
    if (editingRole) {
      updateRole(editingRole.id, { name: formName, description: formDesc, permissions: formPerms });
      showToast({ type: 'success', title: 'Role updated', message: formName });
    } else {
      createRole({ name: formName, description: formDesc, permissions: formPerms });
      showToast({ type: 'success', title: 'Role created', message: formName });
    }
    setModalOpen(false);
  };

  const handleDelete = (role: Role) => { deleteRole(role.id); showToast({ type: 'info', title: 'Role deleted', message: role.name }); };

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
                  <p className="text-[0.75rem] text-[var(--text-muted)]">{role.description}</p>
                </div>
              </div>
              {role.isSystem ? (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[0.625rem] font-bold text-blue-600">SYSTEM</span>
              ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(role)} className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(role)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-3 text-[0.75rem] text-[var(--text-muted)]">
              <Users className="w-3.5 h-3.5" /> {role.userCount} user{role.userCount !== 1 ? 's' : ''}
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
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editingRole ? 'Save Changes' : 'Create Role'}</Button></>}>
        <div className="space-y-5">
          <Input label="Role Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Receptionist" />
          <Input label="Description" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description" />
          <div>
            <p className="text-[0.8125rem] font-semibold text-[var(--text-secondary)] mb-3">Permissions</p>
            <div className="space-y-2">
              {permissionGroups.map((group) => (
                <div key={group.group} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--card-bg-hover)]">
                  <span className="text-[0.8125rem] font-medium text-[var(--text-secondary)]">{group.group}</span>
                  <div className="flex gap-1.5">
                    {group.permissions.map((perm) => {
                      const active = formPerms.includes(perm);
                      return (
                        <button key={perm} onClick={() => togglePerm(perm)}
                          className={cn('px-2.5 py-1 rounded-lg text-[0.6875rem] font-semibold transition-all',
                            active ? 'bg-[#002c98] text-white' : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]')}>
                          {perm.split('.')[1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
