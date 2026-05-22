import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Search,
  X,
  Receipt,
  IndianRupee,
  Loader2,
  Plus,
  MoreHorizontal,
  Undo2,
  RotateCcw,
  Trash2,
  Printer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePaymentStore } from '@/stores/payment.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { useUIStore } from '@/stores/ui.store';
import type { Payment } from '@/types/payment.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed' || s === 'success') return { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  if (s === 'pending') return { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' };
  if (s === 'failed' || s === 'cancelled') return { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
  return { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' };
}

type EnrichedPayment = Payment & {
  studentName: string;
  admissionNo: string;
  section: string;
  amountNum: number;
};

const PAGE_SIZE = 25;

export default function ReceiptListPage() {
  const navigate = useNavigate();
  const payments = usePaymentStore((s) => s.payments);
  const total = usePaymentStore((s) => s.total);
  const page = usePaymentStore((s) => s.page);
  const limit = usePaymentStore((s) => s.limit);
  const loading = usePaymentStore((s) => s.loading);
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);
  const fetchPayment = usePaymentStore((s) => s.fetchPayment);
  const updatePayment = usePaymentStore((s) => s.updatePayment);
  const deletePayment = usePaymentStore((s) => s.deletePayment);
  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);
  const showToast = useUIStore((s) => s.showToast);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<EnrichedPayment | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<EnrichedPayment | null>(null);
  const [confirmUnrefund, setConfirmUnrefund] = useState<EnrichedPayment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EnrichedPayment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments({ page: 1, limit: PAGE_SIZE });
    if (enrollments.length === 0) fetchEnrollments();
  }, [fetchPayments, fetchEnrollments, enrollments.length]);

  const goToPage = (next: number) => {
    fetchPayments({ page: next, limit: PAGE_SIZE });
  };

  const enrollmentsById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );

  const rows = useMemo<EnrichedPayment[]>(() => payments.map((p) => {
    const enr = enrollmentsById.get(p.studentEnrollmentId);
    return {
      ...p,
      studentName: enr?.student?.name ?? '',
      admissionNo: enr?.student?.admissionNumber ?? '',
      section: enr?.classSection?.section ?? '',
      amountNum: Number(p.amount),
    };
  }), [payments, enrollmentsById]);

  // Keep the drawer view in sync with store updates (e.g. after refund).
  const selectedLive = selected
    ? rows.find((r) => r.id === selected.id) ?? selected
    : null;

  const handleView = (row: EnrichedPayment) => {
    setSelected(row);
    setRefreshingId(row.id);
    fetchPayment(row.id)
      .catch(() => {
        // Refresh failure is non-fatal — drawer keeps showing cached row.
      })
      .finally(() => setRefreshingId(null));
  };

  const handleRefund = async (row: EnrichedPayment, remarks: string) => {
    setBusyId(row.id);
    try {
      // Append "-R" only once, even on repeat attempts. Backend may return a
      // null receipt number; fall back to the payment id so the suffix is still
      // appended to *something* unique.
      const base = row.receiptNumber || row.id.slice(0, 8);
      const newReceipt = base.endsWith('-R') ? base : `${base}-R`;
      // `remarks` is sent for forward-compat; backend `Payment` model does not
      // persist it yet — see tmp/ISSUES.md → Module: Payments / Receipts (#3).
      const dto: Record<string, unknown> = {
        status: 'Refunded',
        receiptNumber: newReceipt,
      };
      if (remarks.trim()) dto.remarks = remarks.trim();
      await updatePayment(row.id, dto);
      showToast({ type: 'success', title: 'Payment refunded', message: `Receipt ${newReceipt}` });
      setConfirmRefund(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Refund failed', message: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnrefund = async (row: EnrichedPayment) => {
    setBusyId(row.id);
    try {
      const current = row.receiptNumber ?? '';
      const stripped = current.endsWith('-R') ? current.slice(0, -2) : current;
      await updatePayment(row.id, {
        status: 'Success',
        ...(stripped ? { receiptNumber: stripped } : {}),
      });
      showToast({ type: 'success', title: 'Refund reversed', message: `Receipt ${stripped}` });
      setConfirmUnrefund(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Un-refund failed', message: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row: EnrichedPayment) => {
    setBusyId(row.id);
    try {
      await deletePayment(row.id);
      showToast({ type: 'success', title: 'Payment deleted', message: row.receiptNumber || row.id.slice(0, 8) });
      setConfirmDelete(null);
      if (selected?.id === row.id) setSelected(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const handlePrint = (row: EnrichedPayment) => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) {
      showToast({ type: 'error', title: 'Print blocked', message: 'Allow pop-ups to print receipts.' });
      return;
    }
    w.document.write(buildReceiptHtml(row));
    w.document.close();
    w.focus();
    // Give the new window a tick to render before invoking print.
    setTimeout(() => w.print(), 100);
  };

  const isRefunded = (s: string) => s.toLowerCase() === 'refunded';

  const statuses = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) if (p.status) set.add(p.status);
    return Array.from(set);
  }, [payments]);

  const filtered = rows.filter((r) => {
    const ms = !search ||
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (r.receiptNumber ?? '').toLowerCase().includes(search.toLowerCase());
    const mst = !statusFilter || r.status === statusFilter;
    return ms && mst;
  });

  const totalCollected = rows.reduce((s, r) => s + r.amountNum, 0);
  const confirmedCount = rows.filter((r) => r.status.toLowerCase() === 'confirmed' || r.status.toLowerCase() === 'success').length;
  // The two stats above are page-scoped (no aggregate endpoint exists). When
  // there are more receipts than the current page holds, surface that so the
  // numbers stop reading as global totals.
  const pageCaption =
    total > rows.length
      ? `on page ${page} of ${Math.max(1, Math.ceil(total / limit))}`
      : undefined;

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
          { label: 'Total Collected', value: fmt(totalCollected), caption: pageCaption, icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Receipts Issued', value: confirmedCount, caption: pageCaption, icon: Receipt, color: 'bg-blue-50 text-blue-600' },
          { label: 'All Payments', value: total, caption: undefined as string | undefined, icon: Receipt, color: 'bg-violet-50 text-violet-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}><m.icon className="w-4 h-4" strokeWidth={2} /></div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
            {m.caption && (
              <p className="text-[0.6875rem] text-[var(--text-muted)] mt-2">{m.caption}</p>
            )}
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
          <div className="grid grid-cols-[1.4fr_2fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Receipt', 'Student', 'Amount', 'Status'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
            <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] text-right pr-1">Actions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[0.875rem] text-[var(--text-muted)]">No payments found</p>
            </div>
          ) : filtered.map((r, idx) => {
            const st = statusStyle(r.status);
            const studentSub = [r.admissionNo, r.section, r.paymentMode?.toUpperCase(), r.transactionRef]
              .filter(Boolean)
              .join(' · ');
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => handleView(r)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleView(r);
                  }
                }}
                className={cn(
                  'grid grid-cols-[1.4fr_2fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 cursor-pointer hover:bg-[var(--card-bg-hover)] focus:bg-[var(--card-bg-hover)] focus:outline-none transition-colors',
                  idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
                )}
              >
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-bold text-[#002c98] tracking-wide truncate">{r.receiptNumber || '—'}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] mt-0.5">{r.paidAt ? r.paidAt.slice(0, 10) : '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{r.studentName || '—'}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">{studentSub || '—'}</p>
                </div>
                <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">{fmt(r.amountNum)}</span>
                <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                  <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{r.status || 'unknown'}</span>
                </div>
                <RowActionsMenu
                  busy={busyId === r.id}
                  isRefunded={isRefunded(r.status)}
                  onPrint={() => handlePrint(r)}
                  onRefund={() => setConfirmRefund(r)}
                  onUnrefund={() => setConfirmUnrefund(r)}
                  onDelete={() => setConfirmDelete(r)}
                />
              </div>
            );
          })}
          <div className="px-6 py-3 bg-[var(--card-bg-hover)] flex items-center justify-between gap-3">
            <p className="text-[0.75rem] text-[var(--text-muted)]">
              {total === 0
                ? '0 payments'
                : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
              {(search || statusFilter) && payments.length > 0 && (
                <span className="ml-2 text-[var(--text-ghost)]">
                  · filtered to {filtered.length} on this page
                </span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              </button>
              <span className="text-[0.75rem] font-semibold text-[var(--text-tertiary)] px-2 tabular-nums">
                {page} / {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page * limit >= total || loading}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLive && (
        <>
          <div
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
          />
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[480px] bg-[var(--app-bg)] shadow-[-16px_0_48px_rgba(0,0,0,0.12)] overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">Receipt</p>
                  {refreshingId === selectedLive.id && (
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--text-muted)]" />
                  )}
                </div>
                <h2 className="text-[1rem] font-bold text-[#002c98] tracking-wide truncate">{selectedLive.receiptNumber || '—'}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePrint(selectedLive)}
                  title="Print receipt"
                  className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Printer className="w-4 h-4" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                statusStyle(selectedLive.status).bg,
              )}>
                <span className={cn('w-2 h-2 rounded-full', statusStyle(selectedLive.status).dot)} />
                <span className={cn('text-[0.75rem] font-bold uppercase tracking-wide', statusStyle(selectedLive.status).text)}>
                  {selectedLive.status || 'unknown'}
                </span>
                <span className="ml-auto font-display text-[1.125rem] font-extrabold text-[var(--text-primary)]">
                  {fmt(selectedLive.amountNum)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Student" value={selectedLive.studentName || '—'} />
                <Field label="Admission No." value={selectedLive.admissionNo || '—'} />
                <Field label="Section" value={selectedLive.section || '—'} />
                <Field label="Paid At" value={selectedLive.paidAt ? new Date(selectedLive.paidAt).toLocaleString() : '—'} />
                <Field label="Payment Mode" value={selectedLive.paymentMode?.toUpperCase() || '—'} />
                <Field label="Transaction Ref" value={selectedLive.transactionRef || '—'} mono />
                <Field label="Ledger Entry" value={selectedLive.ledgerEntryId.slice(0, 8).toUpperCase()} mono />
                <Field label="Payment ID" value={selectedLive.id.slice(0, 8).toUpperCase()} mono />
                <Field label="Created" value={selectedLive.createdAt ? new Date(selectedLive.createdAt).toLocaleString() : '—'} />
                <Field label="Updated" value={selectedLive.updatedAt ? new Date(selectedLive.updatedAt).toLocaleString() : '—'} />
              </div>

              <div className="flex gap-2 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => handlePrint(selectedLive)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] bg-[var(--border-subtle)] hover:brightness-95 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                {isRefunded(selectedLive.status) ? (
                  <button
                    onClick={() => setConfirmUnrefund(selectedLive)}
                    disabled={busyId === selectedLive.id}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Un-refund
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmRefund(selectedLive)}
                    disabled={busyId === selectedLive.id}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Refund
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(selectedLive)}
                  disabled={busyId === selectedLive.id}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmRefund && (
        <RefundDialog
          row={confirmRefund}
          busy={busyId === confirmRefund.id}
          onCancel={() => setConfirmRefund(null)}
          onConfirm={(remarks) => handleRefund(confirmRefund, remarks)}
        />
      )}

      {confirmUnrefund && (
        <ConfirmDialog
          tone="warning"
          title="Reverse this refund?"
          message={
            <>
              Receipt <span className="font-semibold text-[var(--text-primary)]">{confirmUnrefund.receiptNumber || confirmUnrefund.id.slice(0, 8)}</span> will be marked as <em>Success</em> again and the <code className="text-[0.75rem] font-mono">-R</code> suffix removed. Note: the ledger is not automatically resynced server-side yet.
            </>
          }
          confirmLabel="Un-refund"
          busy={busyId === confirmUnrefund.id}
          onCancel={() => setConfirmUnrefund(null)}
          onConfirm={() => handleUnrefund(confirmUnrefund)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          tone="danger"
          title="Delete this payment?"
          message={
            <>
              Receipt <span className="font-semibold text-[var(--text-primary)]">{confirmDelete.receiptNumber || confirmDelete.id.slice(0, 8)}</span> for{' '}
              <span className="font-semibold text-[var(--text-primary)]">{fmt(confirmDelete.amountNum)}</span> will be permanently deleted. This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          busy={busyId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  );
}

function RowActionsMenu({
  busy,
  isRefunded,
  onPrint,
  onRefund,
  onUnrefund,
  onDelete,
}: {
  busy: boolean;
  isRefunded: boolean;
  onPrint: () => void;
  onRefund: () => void;
  onUnrefund: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const items = [
    { label: 'Print', icon: Printer, onClick: onPrint },
    isRefunded
      ? { label: 'Un-refund', icon: RotateCcw, onClick: onUnrefund }
      : { label: 'Refund', icon: Undo2, onClick: onRefund },
    { label: 'Delete', icon: Trash2, danger: true, onClick: onDelete },
  ] as const;

  return (
    <div
      ref={ref}
      className="relative justify-self-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        title="More actions"
        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[152px] bg-[var(--card-bg)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[var(--border-subtle)] py-1.5 animate-in fade-in-0 zoom-in-95 duration-100">
          {items.map((it) => {
            const danger = 'danger' in it && it.danger;
            return (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-[0.8125rem] font-medium text-left transition-colors',
                  danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]',
                )}
              >
                <it.icon className="w-3.5 h-3.5" strokeWidth={2} />
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">{label}</p>
      <p className={cn('text-[0.8125rem] text-[var(--text-primary)] truncate', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

function ConfirmDialog({
  tone,
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  tone: 'warning' | 'danger';
  title: string;
  message: ReactNode;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmCls =
    tone === 'danger'
      ? 'bg-red-600 hover:bg-red-700 shadow-[0_2px_8px_rgba(220,38,38,0.3)]'
      : 'bg-amber-600 hover:bg-amber-700 shadow-[0_2px_8px_rgba(217,119,6,0.3)]';
  const iconBg = tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-in fade-in-0 duration-150">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1.5">{title}</h3>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed',
              confirmCls,
            )}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RefundDialog({
  row,
  busy,
  onCancel,
  onConfirm,
}: {
  row: EnrichedPayment;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState('');
  const base = row.receiptNumber || row.id.slice(0, 8);
  const newReceipt = base.endsWith('-R') ? base : `${base}-R`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-in fade-in-0 duration-150">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-700">
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1.5">Refund this payment?</h3>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
              Receipt <span className="font-semibold text-[var(--text-primary)]">{newReceipt}</span> for{' '}
              <span className="font-semibold text-[var(--text-primary)]">{fmt(row.amountNum)}</span> will be marked as <em>Refunded</em>. Note: the matching ledger entry is not auto-reversed server-side yet.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">
            Reason (optional)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="e.g. duplicate charge, parent request..."
            className="w-full bg-[var(--app-bg)] rounded-xl px-3 py-2 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow resize-none"
          />
          <p className="mt-1.5 text-[0.6875rem] text-[var(--text-ghost)]">
            Pending backend support — reason is sent but not persisted yet.
          </p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(remarks)}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[0.8125rem] font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-[0_2px_8px_rgba(217,119,6,0.3)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Refund
          </button>
        </div>
      </div>
    </div>
  );
}

// Self-contained HTML for the print pop-up. Kept inline so a single Print
// click works without any global stylesheet plumbing.
function buildReceiptHtml(r: EnrichedPayment): string {
  const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const paidAt = r.paidAt ? new Date(r.paidAt).toLocaleString() : '—';
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(r.amountNum);
  const row = (label: string, value: string) =>
    `<tr><td class="lbl">${label}</td><td class="val">${escape(value)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8" />
<title>Receipt ${escape(r.receiptNumber || r.id.slice(0, 8))}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;padding:32px;max-width:640px;margin:0 auto}
  .header{border-bottom:2px solid #002c98;padding-bottom:16px;margin-bottom:24px}
  .header h1{font-size:24px;color:#002c98;letter-spacing:-0.02em}
  .header .sub{font-size:12px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.1em}
  .status{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:20px}
  .status.success,.status.confirmed{background:#ecfdf5;color:#047857}
  .status.refunded{background:#fef3c7;color:#92400e}
  .status.failed,.status.cancelled{background:#fef2f2;color:#b91c1c}
  .status.pending,.status.unknown{background:#f1f5f9;color:#475569}
  .amount-box{background:#f8fafc;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px}
  .amount-box .lbl{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px}
  .amount-box .val{font-size:32px;font-weight:800;color:#002c98}
  table{width:100%;border-collapse:collapse}
  td{padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top}
  td.lbl{color:#64748b;width:42%;text-transform:uppercase;font-size:11px;letter-spacing:0.06em;font-weight:600}
  td.val{color:#0f172a;font-weight:500;word-break:break-all}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{padding:0;max-width:none}}
</style>
</head><body>
  <div class="header">
    <h1>Fee Receipt</h1>
    <div class="sub">Receipt No. ${escape(r.receiptNumber || r.id.slice(0, 8).toUpperCase())}</div>
  </div>
  <span class="status ${escape(r.status.toLowerCase() || 'unknown')}">${escape(r.status || 'Unknown')}</span>
  <div class="amount-box">
    <div class="lbl">Amount Paid</div>
    <div class="val">${escape(amount)}</div>
  </div>
  <table>
    ${row('Student', r.studentName || '—')}
    ${row('Admission No.', r.admissionNo || '—')}
    ${row('Section', r.section || '—')}
    ${row('Paid At', paidAt)}
    ${row('Payment Mode', (r.paymentMode || '—').toUpperCase())}
    ${row('Transaction Ref', r.transactionRef || '—')}
  </table>
  <div class="footer">Printed ${new Date().toLocaleString()} · Computer-generated receipt</div>
</body></html>`;
}
