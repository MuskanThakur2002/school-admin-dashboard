import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useReceiptStore } from '@/stores/receipt.store';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const modeLabel: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', upi: 'UPI', neft: 'NEFT', dd: 'DD', card: 'Card', online: 'Online',
};

export default function ReconciliationPage() {
  const { receipts, fetchReceipts, resolveBouncedReceipt } = useReceiptStore();
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const bounced = receipts.filter((r) => r.status === 'bounced');
  const cancelled = receipts.filter((r) => r.status === 'cancelled');

  const handleResolve = async (receiptId: string, receiptNo: string, studentName: string) => {
    try {
      await resolveBouncedReceipt(receiptId);
      showToast({ type: 'success', title: 'Marked as resolved', message: `${receiptNo} — ${studentName}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to resolve', message: (err as Error).message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Reconciliation</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Handle bounced payments and settlement mismatches</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Pending Resolution', value: bounced.length, icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
          { label: 'Total Bounced Amount', value: fmt(bounced.reduce((s, e) => s + e.amount, 0)), icon: XCircle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Cancelled', value: cancelled.length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
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

      {/* Bounced — Pending Resolution */}
      {bounced.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Pending Resolution
            <span className="px-2 py-0.5 rounded-md bg-red-50 text-[0.625rem] font-bold text-red-500 ml-1">{bounced.length}</span>
          </h2>
          <div className="space-y-3">
            {bounced.map((entry) => (
              <div key={entry.id} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-red-500" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide">{entry.receiptNo}</span>
                      <span className="text-[0.6875rem] text-[var(--text-ghost)]">{entry.date}</span>
                    </div>
                    <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{entry.studentName} <span className="text-[var(--text-muted)] font-normal">&middot; {entry.class}-{entry.section}</span></p>
                    <p className="text-[0.75rem] text-[var(--text-tertiary)] mt-1">{modeLabel[entry.mode] || entry.mode} &middot; {entry.reference} &middot; <span className="text-red-500 font-semibold">{entry.bounceReason}</span></p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-[1.125rem] font-extrabold text-red-500 mb-2">{fmt(entry.amount)}</p>
                    <button onClick={() => handleResolve(entry.id, entry.receiptNo, entry.studentName)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.75rem] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} /> Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <div>
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-slate-400" /> Cancelled Receipts
          </h2>
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            {cancelled.map((entry, idx) => (
              <div key={entry.id} className={cn('flex items-center gap-4 px-6 py-4', idx < cancelled.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                <span className="text-[0.75rem] font-bold text-[var(--text-muted)] tracking-wide">{entry.receiptNo}</span>
                <span className="text-[0.8125rem] text-[var(--text-secondary)] flex-1">{entry.studentName}</span>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{entry.cancelReason}</span>
                <span className="font-display text-[0.8125rem] font-bold text-[var(--text-secondary)]">{fmt(entry.amount)}</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-[0.6875rem] font-semibold text-slate-500">Cancelled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bounced.length === 0 && cancelled.length === 0 && (
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h2 className="font-display text-[1.25rem] font-bold text-[var(--text-primary)] mb-1">All clear</h2>
          <p className="text-[0.875rem] text-[var(--text-muted)]">No bounced or unreconciled payments</p>
        </div>
      )}
    </div>
  );
}
