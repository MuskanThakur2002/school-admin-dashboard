import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertTriangle, CheckCircle2, Search, X, IndianRupee, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLedgerStore } from '@/stores/ledger.store';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const statusStyle: Record<string, { dot: string; text: string; bg: string }> = {
  clear: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  partial: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  overdue: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

export default function LedgerListPage() {
  const navigate = useNavigate();
  const { summaries, loading, fetchSummaries } = useLedgerStore();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const classOptions = useMemo(() => {
    const classes = [...new Set(summaries.map((s) => s.class))].sort();
    return ['', ...classes];
  }, [summaries]);

  const filtered = useMemo(() => summaries.filter((l) => {
    const ms = !search || l.studentName.toLowerCase().includes(search.toLowerCase()) || l.admissionNo.toLowerCase().includes(search.toLowerCase());
    const mc = !classFilter || l.class === classFilter;
    const mst = !statusFilter || l.status === statusFilter;
    return ms && mc && mst;
  }), [summaries, search, classFilter, statusFilter]);

  const totalCollected = summaries.reduce((s, l) => s + l.totalPaid, 0);
  const totalOutstanding = summaries.reduce((s, l) => s + l.balance, 0);
  const overdueCount = summaries.filter((l) => l.status === 'overdue').length;

  if (loading && summaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Ledger</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Student-wise fee balance and payment status</p>
        </div>
        <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
          <Download className="w-4 h-4" strokeWidth={2} /> Export Report
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Collected', value: fmt(totalCollected), icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Outstanding', value: fmt(totalOutstanding), icon: IndianRupee, color: 'bg-amber-50 text-amber-600' },
          { label: 'Overdue Students', value: overdueCount, icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}><m.icon className="w-4 h-4" strokeWidth={2} /></div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or admission no..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1.5">
          {classOptions.map((c) => (
            <button key={c} onClick={() => setClassFilter(c)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all', classFilter === c ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {c === '' ? 'All' : `Class ${c}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {['', 'clear', 'partial', 'overdue'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all', statusFilter === s ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_2fr_1.2fr_1.2fr_1.2fr_1fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Adm. No.', 'Student', 'Total Due', 'Paid', 'Balance', 'Last Payment', 'Status'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>
        {filtered.map((l, idx) => {
          const st = statusStyle[l.status];
          return (
            <div key={l.studentId} onClick={() => navigate(`/ledger/${l.studentId}`)}
              className={cn('grid grid-cols-[1.2fr_2fr_1.2fr_1.2fr_1.2fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] cursor-pointer transition-colors',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]')}>
              <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide">{l.admissionNo}</span>
              <div>
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{l.studentName}</p>
                <p className="text-[0.6875rem] text-[var(--text-muted)]">{l.class}-{l.section}</p>
              </div>
              <span className="font-display text-[0.8125rem] font-bold text-[var(--text-secondary)]">{fmt(l.totalDue)}</span>
              <span className="font-display text-[0.8125rem] font-bold text-emerald-600">{fmt(l.totalPaid)}</span>
              <span className={cn('font-display text-[0.8125rem] font-bold', l.balance > 0 ? 'text-red-500' : 'text-emerald-600')}>{fmt(l.balance)}</span>
              <span className="text-[0.75rem] text-[var(--text-muted)]">{l.lastPaymentDate}</span>
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{l.status}</span>
              </div>
            </div>
          );
        })}
        <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} of {summaries.length} students</p>
        </div>
      </div>
    </div>
  );
}
