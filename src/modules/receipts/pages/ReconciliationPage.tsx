import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, FileText, MessageSquarePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useReceiptStore } from '@/stores/receipt.store';
import type { SettlementStatus } from '@/types/receipt.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const modeLabel: Record<string, string> = {
  cash: 'Cash', cheque: 'Cheque', upi: 'UPI', neft: 'NEFT', dd: 'DD', card: 'Card', online: 'Online',
};

const settlementLabel: Record<SettlementStatus, string> = { unsettled: 'Unsettled', partial: 'Partial', settled: 'Settled' };
const settlementStyle: Record<SettlementStatus, { dot: string; text: string; bg: string }> = {
  unsettled: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  partial: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  settled: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

export default function ReconciliationPage() {
  const { receipts, fetchReceipts, resolveBouncedReceipt, addSettlementNote, updateSettlementStatus } = useReceiptStore();
  const showToast = useUIStore((s) => s.showToast);

  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const bounced = receipts.filter((r) => r.status === 'bounced');
  const cancelled = receipts.filter((r) => r.status === 'cancelled');
  const needsSettlement = receipts.filter((r) => r.status === 'confirmed' && r.settlementStatus !== 'settled');

  const handleResolve = async (receiptId: string, receiptNo: string, studentName: string) => {
    try {
      await resolveBouncedReceipt(receiptId);
      showToast({ type: 'success', title: 'Marked as resolved', message: `${receiptNo} — ${studentName}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to resolve', message: (err as Error).message });
    }
  };

  const handleAddNote = async (receiptId: string) => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await addSettlementNote({ receiptId, text: noteText.trim() });
      setNoteText('');
      showToast({ type: 'success', title: 'Note added', message: 'Settlement note recorded' });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setAddingNote(false);
    }
  };

  const handleStatusChange = async (receiptId: string, status: SettlementStatus) => {
    try {
      await updateSettlementStatus({ receiptId, status });
      showToast({ type: 'success', title: 'Status updated', message: `Marked as ${settlementLabel[status].toLowerCase()}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Reconciliation</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Handle bounced payments and settlement mismatches</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending Resolution', value: bounced.length, icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
          { label: 'Total Bounced Amount', value: fmt(bounced.reduce((s, e) => s + e.amount, 0)), icon: XCircle, color: 'bg-amber-50 text-amber-600' },
          { label: 'Pending Settlement', value: needsSettlement.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
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

      {/* Settlement */}
      {needsSettlement.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" /> Pending Settlement
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[0.625rem] font-bold text-blue-600 ml-1">{needsSettlement.length}</span>
          </h2>
          <div className="space-y-3">
            {needsSettlement.map((entry) => {
              const isExpanded = expandedReceipt === entry.id;
              const ss = settlementStyle[entry.settlementStatus];
              return (
                <div key={entry.id} className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide">{entry.receiptNo}</span>
                        <span className="text-[0.6875rem] text-[var(--text-ghost)]">{entry.date}</span>
                        <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full', ss.bg)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', ss.dot)} />
                          <span className={cn('text-[0.625rem] font-semibold', ss.text)}>{settlementLabel[entry.settlementStatus]}</span>
                        </div>
                      </div>
                      <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{entry.studentName} <span className="text-[var(--text-muted)] font-normal">&middot; {entry.class}-{entry.section}</span></p>
                      <p className="text-[0.75rem] text-[var(--text-tertiary)] mt-1">{modeLabel[entry.mode] || entry.mode} &middot; {entry.reference}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-display text-[1.125rem] font-extrabold text-[var(--text-primary)]">{fmt(entry.amount)}</p>
                      <button onClick={() => { setExpandedReceipt(isExpanded ? null : entry.id); setNoteText(''); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />}
                        Settlement
                      </button>
                    </div>
                  </div>

                  {/* Expanded settlement panel */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-subtle)] px-5 py-4 bg-[var(--card-bg-hover)]">
                      {/* Status selector */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[0.75rem] font-semibold text-[var(--text-muted)]">Status:</span>
                        {(['unsettled', 'partial', 'settled'] as SettlementStatus[]).map((s) => {
                          const st = settlementStyle[s];
                          return (
                            <button key={s} onClick={() => handleStatusChange(entry.id, s)}
                              className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
                                entry.settlementStatus === s
                                  ? `${st.bg} ${st.text} shadow-sm`
                                  : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
                              {settlementLabel[s]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Existing notes */}
                      {entry.settlementNotes.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {entry.settlementNotes.map((note) => (
                            <div key={note.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-[var(--card-bg)]">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-white text-[0.5rem] font-bold">{note.createdBy.slice(0, 2).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[0.8125rem] text-[var(--text-primary)]">{note.text}</p>
                                <p className="text-[0.6875rem] text-[var(--text-ghost)] mt-0.5">{note.createdBy} &middot; {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add note */}
                      <div className="flex gap-2">
                        <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a settlement note..."
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(entry.id); }}
                          className="flex-1 bg-[var(--card-bg)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
                        <button onClick={() => handleAddNote(entry.id)} disabled={!noteText.trim() || addingNote}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[0.75rem] font-semibold text-white bg-[#002c98] hover:bg-[#001d6a] disabled:opacity-40 transition-all">
                          <MessageSquarePlus className="w-3.5 h-3.5" strokeWidth={2} /> Add Note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {bounced.length === 0 && cancelled.length === 0 && needsSettlement.length === 0 && (
        <div className="bg-[var(--card-bg)] rounded-2xl p-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h2 className="font-display text-[1.25rem] font-bold text-[var(--text-primary)] mb-1">All clear</h2>
          <p className="text-[0.875rem] text-[var(--text-muted)]">No bounced, unsettled, or unreconciled payments</p>
        </div>
      )}
    </div>
  );
}
