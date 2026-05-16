import { useEffect, useMemo, useState } from 'react';
import { Search, X, Check, Loader2, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Button } from '@/components/ui/Button/Button';
import { cn } from '@/utils/cn';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import { isSuperAdmin } from '@/types/auth.types';
import type { User } from '@/types/user.types';
import type { NotificationTemplate } from '@/types/notification.types';

const channelMeta: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  sms: { icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600', label: 'SMS' },
  email: { icon: Mail, color: 'bg-blue-50 text-blue-600', label: 'Email' },
  push: { icon: Smartphone, color: 'bg-violet-50 text-violet-600', label: 'Push' },
};

interface Props {
  template: NotificationTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendNotificationModal({ template, open, onOpenChange }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const sendBulk = useNotificationsStore((s) => s.sendBulk);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset + load users whenever the modal opens (with the current template).
  useEffect(() => {
    if (!open || !template) return;
    setSelectedIds(new Set());
    setSearch('');
    setRoleFilter('');
    setLoadError(null);

    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      setLoadError('No active school selected');
      setUsers([]);
      return;
    }

    setLoadingUsers(true);
    usersApi
      .list(schoolId, { page: 1, limit: 200 })
      .then((res) => setUsers(res.data))
      .catch((err) => {
        setLoadError((err as Error).message);
        setUsers([]);
      })
      .finally(() => setLoadingUsers(false));
  }, [open, template]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.role?.name) set.add(u.role.name);
    });
    return Array.from(set).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phoneNumber?.toLowerCase().includes(q) ?? false);
      const matchRole = !roleFilter || u.role?.name === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.has(u.id)),
    [users, selectedIds],
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleSend = async () => {
    if (!template || selectedUsers.length === 0) return;
    setSubmitting(true);
    try {
      const { successCount, failureCount } = await sendBulk(
        template.id,
        selectedUsers.map((u) => u.id),
        template.channel,
      );

      if (failureCount === 0) {
        showToast({
          type: 'success',
          title: 'Notifications sent',
          message: `Delivered to ${successCount} recipient${successCount === 1 ? '' : 's'}`,
        });
        onOpenChange(false);
      } else if (successCount === 0) {
        showToast({
          type: 'error',
          title: 'Send failed',
          message: `All ${failureCount} attempts failed`,
        });
      } else {
        showToast({
          type: 'info',
          title: 'Partially sent',
          message: `${successCount} succeeded, ${failureCount} failed`,
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Send failed',
        message: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!template) return null;

  const channel = channelMeta[template.channel] ?? {
    icon: MessageSquare,
    color: 'bg-slate-50 text-slate-600',
    label: template.channel || 'Other',
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Send Notification"
      description="Pick recipients to send this template to"
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={submitting || selectedUsers.length === 0}>
            {submitting
              ? `Sending…`
              : `Send to ${selectedUsers.length} recipient${selectedUsers.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Template summary */}
        <div className="flex items-center gap-3 bg-[var(--card-bg-hover)] rounded-xl p-3.5">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', channel.color)}>
            <channel.icon className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem] font-bold text-[var(--text-primary)] truncate">{template.name}</p>
            <p className="text-[0.6875rem] text-[var(--text-muted)] uppercase tracking-wide font-semibold mt-0.5">
              {channel.label}
            </p>
          </div>
        </div>

        {/* Search + role filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {['', ...roles].map((r) => (
              <button
                key={r || 'all'}
                onClick={() => setRoleFilter(r)}
                className={cn(
                  'px-3 py-1 rounded-lg text-[0.6875rem] font-semibold transition-all',
                  roleFilter === r
                    ? 'bg-[#0f172a] text-white shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
                )}
              >
                {r || 'All'}
              </button>
            ))}
          </div>
        )}

        {/* Selection summary */}
        <div className="flex items-center justify-between text-[0.75rem]">
          <span className="text-[var(--text-muted)]">
            {selectedUsers.length} selected · {filtered.length} shown
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={filtered.length === 0}
              className="font-semibold text-[#002c98] hover:underline disabled:opacity-40"
            >
              Select all shown
            </button>
            {selectedUsers.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="font-semibold text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* User list */}
        <div className="max-h-[320px] overflow-y-auto bg-[var(--card-bg-hover)] rounded-xl">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : loadError ? (
            <div className="px-4 py-6 text-center text-[0.8125rem] text-red-600">{loadError}</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[0.8125rem] text-[var(--text-muted)]">
              No users match your search.
            </div>
          ) : (
            filtered.map((u, idx) => {
              const checked = selectedIds.has(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    checked ? 'bg-[#002c98]/5' : 'hover:bg-[var(--card-bg)]',
                    idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0',
                      checked ? 'bg-[#002c98] border-[#002c98]' : 'border-[var(--border-strong)]',
                    )}
                  >
                    {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{u.name}</p>
                    <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">{u.email}</p>
                  </div>
                  {u.role?.name && (
                    <span className="px-2 py-0.5 rounded-md text-[0.625rem] font-bold bg-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase tracking-wide shrink-0">
                      {u.role.name}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
