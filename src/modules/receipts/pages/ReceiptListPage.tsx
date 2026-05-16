import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, X, Receipt, IndianRupee, Loader2, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePaymentStore } from '@/stores/payment.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed' || s === 'success') return { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (s === 'pending') return { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  if (s === 'failed' || s === 'cancelled') return { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
  return { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' };
}

export default function ReceiptListPage() {
  const navigate = useNavigate();
  const payments = usePaymentStore((s) => s.payments);
  const loading = usePaymentStore((s) => s.loading);
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);
  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPayments();
    if (enrollments.length === 0) fetchEnrollments();
  }, [fetchPayments, fetchEnrollments, enrollments.length]);

  const enrollmentsById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );

  const rows = useMemo(() => payments.map((p) => {
    const enr = enrollmentsById.get(p.studentEnrollmentId);
    return {
      ...p,
      studentName: enr?.student?.name ?? '',
      admissionNo: enr?.student?.admissionNumber ?? '',
      section: enr?.classSection?.section ?? '',
      amountNum: Number(p.amount),
    };
  }), [payments, enrollmentsById]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) if (p.status) set.add(p.status);
    return Array.from(set);
  }, [payments]);

  const filtered = rows.filter((r) => {
    const ms = !search ||
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.receiptNumber.toLowerCase().includes(search.toLowerCase());
    const mst = !statusFilter || r.status === statusFilter;
    return ms && mst;
  });

  const totalCollected = rows.reduce((s, r) => s + r.amountNum, 0);
  const confirmedCount = rows.filter((r) => r.status.toLowerCase() === 'confirmed' || r.status.toLowerCase() === 'success').length;

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Receipts</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">View payments recorded against student ledgers</p>
        </div>
        <div className="flex gap-2.5">
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
            <Download className="w-4 h-4" strokeWidth={2} /> Export
          </button>
          <button
            onClick={() => navigate('/receipts/post')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Collected', value: fmt(totalCollected), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Receipts Issued', value: confirmedCount, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
          { label: 'All Payments', value: rows.length, icon: Receipt, color: 'bg-violet-50 text-violet-600' },
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search receipt no. or student..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"><X className="w-3.5 h-3.5" /></button>}
        </div>
        {statuses.length > 0 && (
          <div className="flex gap-1.5">
            {['', ...statuses].map((s) => (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all capitalize', statusFilter === s ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && rows.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)] mx-auto" />
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1fr_1.8fr_1fr_0.8fr_1.2fr_0.9fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Receipt No.', 'Paid At', 'Student', 'Amount', 'Mode', 'Transaction Ref', 'Status'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[0.875rem] text-[var(--text-muted)]">No payments found</p>
            </div>
          ) : filtered.map((r, idx) => {
            const st = statusStyle(r.status);
            return (
              <div key={r.id} className={cn('grid grid-cols-[1.2fr_1fr_1.8fr_1fr_0.8fr_1.2fr_0.9fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide truncate">{r.receiptNumber || '—'}</span>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{r.paidAt ? r.paidAt.slice(0, 10) : '—'}</span>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{r.studentName || '—'}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)]">{r.admissionNo}{r.section ? ` · ${r.section}` : ''}</p>
                </div>
                <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">{fmt(r.amountNum)}</span>
                <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)] uppercase">{r.paymentMode}</span>
                <span className="text-[0.6875rem] text-[var(--text-muted)] truncate">{r.transactionRef || '—'}</span>
                <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                  <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{r.status || 'unknown'}</span>
                </div>
              </div>
            );
          })}
          <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]"><p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</p></div>
        </div>
      )}
    </div>
  );
}
