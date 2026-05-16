import { useEffect, useMemo, useState } from 'react';
import { Search, X, CheckCircle2, XCircle, Clock, MessageSquare, Mail, Smartphone, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNotificationsStore } from '@/stores/notifications.store';
import { useAuthStore } from '@/stores/auth.store';
import { usersApi } from '@/services/modules/users.api';
import { isSuperAdmin } from '@/types/auth.types';
import type { Notification } from '@/types/notification.types';
import type { User } from '@/types/user.types';

const channelIcon: Record<string, React.ElementType> = { sms: MessageSquare, email: Mail, push: Smartphone };

type DisplayStatus = 'delivered' | 'failed' | 'pending';

const statusStyle: Record<DisplayStatus, { dot: string; text: string; bg: string; icon: React.ElementType }> = {
  delivered: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
  failed: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  pending: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
};

function toDisplayStatus(raw: string): DisplayStatus {
  const v = raw?.toLowerCase() ?? '';
  if (['delivered', 'sent', 'success'].includes(v)) return 'delivered';
  if (['failed', 'error', 'bounced'].includes(v)) return 'failed';
  return 'pending';
}

function splitTimestamp(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: '—', time: '—' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  return {
    date: d.toISOString().split('T')[0],
    time: d.toISOString().split('T')[1]?.slice(0, 5) ?? '',
  };
}

function short(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export default function DeliveryLogPage() {
  const notifications = useNotificationsStore((s) => s.notifications);
  const total = useNotificationsStore((s) => s.notificationsTotal);
  const page = useNotificationsStore((s) => s.notificationsPage);
  const limit = useNotificationsStore((s) => s.notificationsLimit);
  const loading = useNotificationsStore((s) => s.notificationsLoading);
  const error = useNotificationsStore((s) => s.notificationsError);
  const fetchNotifications = useNotificationsStore((s) => s.fetchNotifications);

  const templates = useNotificationsStore((s) => s.templates);
  const fetchTemplates = useNotificationsStore((s) => s.fetchTemplates);
  const templatesLimit = useNotificationsStore((s) => s.templatesLimit);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | DisplayStatus>('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchNotifications(1, limit);
    if (templates.length === 0) fetchTemplates(1, templatesLimit);

    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (schoolId) {
      usersApi
        .list(schoolId, { page: 1, limit: 200 })
        .then((res) => setUsers(res.data))
        .catch(() => setUsers([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications]);

  const userById = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const templateNameById = useMemo(() => {
    const map = new Map<string, string>();
    templates.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [templates]);

  const enriched = useMemo(
    () =>
      notifications.map((n: Notification) => {
        const { date, time } = splitTimestamp(n.sentAt ?? n.createdAt);
        const recipient = userById.get(n.recipientId);
        return {
          ...n,
          _date: date,
          _time: time,
          _status: toDisplayStatus(n.status),
          _templateName: templateNameById.get(n.templateId) ?? short(n.templateId),
          _recipientName: recipient?.name ?? short(n.recipientId),
          _recipientSecondary: recipient?.email ?? recipient?.phoneNumber ?? '',
        };
      }),
    [notifications, templateNameById, userById],
  );

  const filtered = useMemo(
    () =>
      enriched.filter((l) => {
        const q = search.toLowerCase();
        const ms =
          !q ||
          l._recipientName.toLowerCase().includes(q) ||
          l._recipientSecondary.toLowerCase().includes(q) ||
          l._templateName.toLowerCase().includes(q) ||
          l.recipientId.toLowerCase().includes(q);
        const mst = !statusFilter || l._status === statusFilter;
        return ms && mst;
      }),
    [enriched, search, statusFilter],
  );

  const deliveredCount = enriched.filter((l) => l._status === 'delivered').length;
  const failedCount = enriched.filter((l) => l._status === 'failed').length;

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  const goToPage = (next: number) => {
    if (next < 1 || next > pageCount || next === page) return;
    fetchNotifications(next, limit);
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Delivery Logs</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Track notification delivery status</p>
        </div>
        <button
          onClick={() => fetchNotifications(page, limit)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] disabled:opacity-50 transition-all"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} strokeWidth={2} /> Refresh
        </button>
      </div>

      {/* Stats — backed by current page only (cheap, no extra fetch) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total (all pages)', value: total, color: 'text-[var(--text-primary)]' },
          { label: 'Delivered (page)', value: deliveredCount, color: 'text-emerald-600' },
          { label: 'Failed (page)', value: failedCount, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--card-bg)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
            <p className={cn('font-display text-[1.5rem] font-extrabold tracking-[-0.02em] leading-none', s.color)}>{s.value}</p>
            <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient or template..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['', 'delivered', 'failed', 'pending'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all capitalize',
                statusFilter === s ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
              )}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-[0.8125rem]">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[0.8fr_0.5fr_2fr_0.6fr_1.5fr_0.8fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Date', 'Time', 'Recipient', 'Channel', 'Template', 'Status'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>
        {loading && enriched.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--text-muted)] text-[0.8125rem]">No notifications to display.</div>
        ) : (
          filtered.map((log, idx) => {
            const st = statusStyle[log._status];
            const ChIcon = channelIcon[log.channel] ?? MessageSquare;
            return (
              <div
                key={log.id}
                className={cn(
                  'grid grid-cols-[0.8fr_0.5fr_2fr_0.6fr_1.5fr_0.8fr] gap-4 items-center px-6 py-3.5 hover:bg-[var(--card-bg-hover)] transition-colors',
                  idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
                )}
              >
                <span className="text-[0.75rem] text-[var(--text-muted)]">{log._date}</span>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{log._time}</span>
                <div className="min-w-0" title={log.recipientId}>
                  <p className="text-[0.8125rem] text-[var(--text-secondary)] truncate font-semibold">{log._recipientName}</p>
                  {log._recipientSecondary && (
                    <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">{log._recipientSecondary}</p>
                  )}
                  {log.failureReason && <p className="text-[0.625rem] text-red-500">{log.failureReason}</p>}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[var(--border-subtle)] flex items-center justify-center" title={log.channel?.toUpperCase()}>
                  <ChIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" strokeWidth={2} />
                </div>
                <span className="text-[0.75rem] text-[var(--text-secondary)] truncate" title={log.templateId}>{log._templateName}</span>
                <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                  <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{log._status}</span>
                </div>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">
            Showing {filtered.length} of {total} · Page {page} of {pageCount}
          </p>
          {total > 0 && (
            <div className="flex items-center gap-0.5">
              {[
                { onClick: () => goToPage(1), disabled: !canPrev, icon: ChevronsLeft },
                { onClick: () => goToPage(page - 1), disabled: !canPrev, icon: ChevronLeft },
                { onClick: () => goToPage(page + 1), disabled: !canNext, icon: ChevronRight },
                { onClick: () => goToPage(pageCount), disabled: !canNext, icon: ChevronsRight },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] disabled:opacity-20 text-[var(--text-tertiary)] transition-all"
                >
                  <btn.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
