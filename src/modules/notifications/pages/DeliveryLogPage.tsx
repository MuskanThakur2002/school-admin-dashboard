import { useState, useEffect } from 'react';
import { Search, X, CheckCircle2, XCircle, Clock, MessageSquare, Mail, Smartphone, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNotificationsStore } from '@/stores/notifications.store';

const channelIcon: Record<string, React.ElementType> = { sms: MessageSquare, email: Mail, push: Smartphone };

const statusStyle: Record<string, { dot: string; text: string; bg: string; icon: React.ElementType }> = {
  delivered: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
  failed: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  pending: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
};

export default function DeliveryLogPage() {
  const logs = useNotificationsStore((s) => s.logs);
  const fetchLogs = useNotificationsStore((s) => s.fetchLogs);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { if (logs.length === 0) fetchLogs(); }, [logs.length, fetchLogs]);

  const filtered = logs.filter((l) => {
    const ms = !search || l.recipient.toLowerCase().includes(search.toLowerCase()) || l.template.toLowerCase().includes(search.toLowerCase());
    const mst = !statusFilter || l.status === statusFilter;
    return ms && mst;
  });

  const deliveredCount = logs.filter((l) => l.status === 'delivered').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Delivery Logs</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Track notification delivery status</p>
        </div>
        <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
          <RefreshCw className="w-4 h-4" strokeWidth={2} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Sent', value: logs.length, color: 'text-[var(--text-primary)]' },
          { label: 'Delivered', value: deliveredCount, color: 'text-emerald-600' },
          { label: 'Failed', value: failedCount, color: 'text-red-500' },
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
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipient or template..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1.5">
          {['', 'delivered', 'failed', 'pending'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all capitalize', statusFilter === s ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[0.8fr_0.5fr_2fr_0.6fr_1.5fr_0.8fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Date', 'Time', 'Recipient', 'Channel', 'Template', 'Status'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>
        {filtered.map((log, idx) => {
          const st = statusStyle[log.status];
          const ChIcon = channelIcon[log.channel];
          return (
            <div key={log.id} className={cn('grid grid-cols-[0.8fr_0.5fr_2fr_0.6fr_1.5fr_0.8fr] gap-4 items-center px-6 py-3.5 hover:bg-[var(--card-bg-hover)] transition-colors',
              idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]')}>
              <span className="text-[0.75rem] text-[var(--text-muted)]">{log.date}</span>
              <span className="text-[0.75rem] text-[var(--text-muted)]">{log.time}</span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{log.recipient}</p>
                {log.error && <p className="text-[0.625rem] text-red-500">{log.error}</p>}
              </div>
              <div className="w-7 h-7 rounded-lg bg-[var(--border-subtle)] flex items-center justify-center" title={log.channel.toUpperCase()}>
                <ChIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" strokeWidth={2} />
              </div>
              <span className="text-[0.75rem] text-[var(--text-secondary)]">{log.template}</span>
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{log.status}</span>
              </div>
            </div>
          );
        })}
        <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]"><p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} log entries</p></div>
      </div>
    </div>
  );
}
