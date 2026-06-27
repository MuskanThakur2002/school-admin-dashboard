import { useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';
import { ledgerApi } from '@/services/modules/ledger.api';
import { useAuthStore } from '@/stores/auth.store';
import type { LedgerEntry } from '@/types/ledger.types';

// Parent-only read-only view of their own child's fee ledger (route + nav are
// gated to the Parent role). The backend scopes GET /ledgers to the parent's
// children, so every entry returned here belongs to their child. Read-only —
// no payment action.

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyFeesPage() {
  const user = useAuthStore((s) => s.user);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const schoolId = user?.schoolId;
    if (!schoolId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ledgerApi
      .list(schoolId, { page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load fee details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.schoolId]);

  // Newest first, and derive the billed / paid / balance summary.
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );
  const { billed, paid, balance } = useMemo(() => {
    let billed = 0;
    let paid = 0;
    for (const e of entries) {
      if (e.entryType === 'Debit') billed += Number(e.amount);
      else if (e.entryType === 'Credit') paid += Number(e.amount);
    }
    return { billed, paid, balance: billed - paid };
  }, [entries]);

  return (
    <div className="p-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[#002c98]">
          <Wallet className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-[1.375rem] font-display font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            Fees
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-muted)]">Your child's fee statement</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Billed', value: billed, tone: 'text-[var(--text-primary)]' },
          { label: 'Total Paid', value: paid, tone: 'text-emerald-600' },
          { label: 'Balance Due', value: balance, tone: balance > 0 ? 'text-red-600' : 'text-emerald-600' },
        ].map((c) => (
          <div key={c.label} className="bg-[var(--card-bg)] rounded-2xl px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">
              {c.label}
            </p>
            <p className={cn('text-[1.375rem] font-display font-extrabold mt-1', c.tone)}>
              ₹{formatMoney(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Statement */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_0.8fr_1fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Date', 'Description', 'Type', 'Amount', 'Balance'].map((h) => (
            <span
              key={h}
              className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]"
            >
              {h}
            </span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading fee details...</p>
          </div>
        )}

        {!loading && error && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">{error}</p>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">No fee entries yet.</p>
          </div>
        )}

        {!loading &&
          !error &&
          sorted.map((e, idx) => {
            const isCredit = e.entryType === 'Credit';
            return (
              <div
                key={e.id}
                className={cn(
                  'grid grid-cols-[1fr_2fr_0.8fr_1fr_1fr] gap-4 items-center px-6 py-4',
                  idx < sorted.length - 1 && 'border-b border-[var(--border-subtle)]',
                )}
              >
                <span className="text-[0.75rem] text-[var(--text-secondary)]">{formatDate(e.createdAt)}</span>
                <span className="text-[0.8125rem] text-[var(--text-primary)] truncate">
                  {e.category || '—'}
                  {e.remarks ? <span className="text-[var(--text-muted)]"> · {e.remarks}</span> : null}
                </span>
                <span
                  className={cn(
                    'text-[0.6875rem] font-semibold uppercase tracking-wide',
                    isCredit ? 'text-emerald-600' : 'text-[var(--text-secondary)]',
                  )}
                >
                  {e.entryType}
                </span>
                <span className={cn('text-[0.8125rem] font-semibold', isCredit ? 'text-emerald-600' : 'text-[var(--text-primary)]')}>
                  {isCredit ? '−' : '+'}₹{formatMoney(Number(e.amount))}
                </span>
                <span className="text-[0.75rem] text-[var(--text-secondary)]">₹{formatMoney(Number(e.runningBalance))}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
