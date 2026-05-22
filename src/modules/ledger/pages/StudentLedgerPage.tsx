import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Download, ArrowUpRight, ArrowDownRight, Loader2, X, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLedgerStore } from '@/stores/ledger.store';
import { usePaymentStore } from '@/stores/payment.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import type { StudentEnrollment } from '@/types/student.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const paymentModes = ['cash', 'cheque', 'upi', 'neft', 'dd'] as const;

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StudentLedgerPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const entries = useLedgerStore((s) => s.entries);
  const loading = useLedgerStore((s) => s.loading);
  const fetchEnrollmentLedger = useLedgerStore((s) => s.fetchEnrollmentLedger);
  const createEntry = useLedgerStore((s) => s.createEntry);
  const createPayment = usePaymentStore((s) => s.createPayment);
  const getEnrollment = useEnrollmentStore((s) => s.getEnrollment);
  const years = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const userId = useAuthStore((s) => s.user?.id);
  const showToast = useUIStore((s) => s.showToast);

  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [enrollmentError, setEnrollmentError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const [selectedDebitId, setSelectedDebitId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [payReceiptNo, setPayReceiptNo] = useState('');
  const [payPaidAt, setPayPaidAt] = useState(toDatetimeLocal(new Date().toISOString()));

  const [refundAmount, setRefundAmount] = useState('');
  const [refundMode, setRefundMode] = useState('neft');
  const [refundRef, setRefundRef] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const [showChargeModal, setShowChargeModal] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargeCategory, setChargeCategory] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeRemarks, setChargeRemarks] = useState('');

  useEffect(() => {
    if (years.length === 0) fetchYears();
  }, [years.length, fetchYears]);

  useEffect(() => {
    if (!enrollmentId) return;
    fetchEnrollmentLedger(enrollmentId);
    getEnrollment(enrollmentId).then(setEnrollment).catch(() => setEnrollmentError(true));
  }, [enrollmentId, fetchEnrollmentLedger, getEnrollment]);

  const activeYearId = enrollment?.academicYearId
    ?? years.find((y) => y.isCurrent)?.id
    ?? years[0]?.id;

  const totalDebits = entries.filter((e) => e.entryType === 'Debit').reduce((s, e) => s + Number(e.amount), 0);
  const totalCredits = entries.filter((e) => e.entryType === 'Credit').reduce((s, e) => s + Number(e.amount), 0);
  const currentBalance = totalDebits - totalCredits;
  const isOverpaid = currentBalance < 0;
  const overpaymentAmount = isOverpaid ? Math.abs(currentBalance) : 0;

  const debitEntries = useMemo(
    () => entries.filter((e) => e.entryType === 'Debit'),
    [entries],
  );

  const studentName = enrollment?.student?.name ?? '';
  const initials = studentName
    ? studentName.split(' ').map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase()
    : '';

  const resetPayForm = () => {
    setSelectedDebitId('');
    setPayAmount('');
    setPayMode('cash');
    setPayRef('');
    setPayReceiptNo('');
    setPayPaidAt(toDatetimeLocal(new Date().toISOString()));
  };

  const handlePostPayment = async () => {
    if (!enrollmentId || !selectedDebitId) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Pick a charge before posting a payment.' });
      return;
    }
    if (!payAmount || Number(payAmount) <= 0) return;
    setPosting(true);
    try {
      await createPayment({
        studentEnrollmentId: enrollmentId,
        ledgerEntryId: selectedDebitId,
        amount: Number(payAmount),
        paymentMode: payMode,
        ...(payRef.trim() ? { transactionRef: payRef.trim() } : {}),
        status: 'confirmed',
        ...(payReceiptNo.trim() ? { receiptNumber: payReceiptNo.trim() } : {}),
        paidAt: new Date(payPaidAt).toISOString(),
      });
      await fetchEnrollmentLedger(enrollmentId);
      showToast({ type: 'success', title: 'Payment posted', message: `${fmt(Number(payAmount))} recorded successfully` });
      setShowModal(false);
      resetPayForm();
    } catch (err) {
      showToast({ type: 'error', title: 'Payment failed', message: (err as Error).message });
    } finally {
      setPosting(false);
    }
  };

  const resetChargeForm = () => {
    setChargeCategory('');
    setChargeAmount('');
    setChargeRemarks('');
  };

  const handlePostCharge = async () => {
    if (!enrollmentId || !activeYearId || !userId) {
      showToast({ type: 'error', title: 'Cannot post', message: 'Missing enrollment, year, or user context' });
      return;
    }
    if (!chargeCategory.trim() || !chargeAmount || Number(chargeAmount) <= 0 || !chargeRemarks.trim()) return;
    setCharging(true);
    try {
      await createEntry({
        studentEnrollmentId: enrollmentId,
        academicYearId: activeYearId,
        entryType: 'Debit',
        category: chargeCategory.trim(),
        amount: Number(chargeAmount),
        runningBalance: 0,
        reference: '',
        paymentMode: 'charge',
        remarks: chargeRemarks.trim(),
        createdById: userId,
      });
      await fetchEnrollmentLedger(enrollmentId);
      showToast({ type: 'success', title: 'Charge posted', message: `${fmt(Number(chargeAmount))} added to ledger` });
      setShowChargeModal(false);
      resetChargeForm();
    } catch (err) {
      showToast({ type: 'error', title: 'Charge failed', message: (err as Error).message });
    } finally {
      setCharging(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!enrollmentId || !activeYearId || !userId) {
      showToast({ type: 'error', title: 'Cannot post', message: 'Missing enrollment, year, or user context' });
      return;
    }
    if (!refundAmount || Number(refundAmount) <= 0 || !refundReason) return;
    if (Number(refundAmount) > overpaymentAmount) return;
    setRefunding(true);
    try {
      await createEntry({
        studentEnrollmentId: enrollmentId,
        academicYearId: activeYearId,
        entryType: 'Debit',
        category: 'refund',
        amount: Number(refundAmount),
        runningBalance: 0,
        reference: refundRef,
        paymentMode: refundMode,
        remarks: refundReason,
        createdById: userId,
      });
      await fetchEnrollmentLedger(enrollmentId);
      showToast({ type: 'success', title: 'Refund processed', message: `${fmt(Number(refundAmount))} refunded successfully` });
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundMode('neft');
      setRefundRef('');
      setRefundReason('');
    } catch (err) {
      showToast({ type: 'error', title: 'Refund failed', message: (err as Error).message });
    } finally {
      setRefunding(false);
    }
  };

  if (loading && entries.length === 0 && !enrollment) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (enrollmentError) {
    return (
      <div className="max-w-[1280px]">
        <button onClick={() => navigate('/ledger')} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Ledger
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[var(--text-muted)] text-[0.875rem]">Enrollment not found.</p>
        </div>
      </div>
    );
  }

  const admissionNo = enrollment?.student?.admissionNumber ?? '';
  const section = enrollment?.classSection?.section ?? '';

  return (
    <div className="max-w-[1280px]">
      <button onClick={() => navigate('/ledger')} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Ledger
      </button>

      {/* Student header */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <span className="font-display text-[1.25rem] font-extrabold text-white">{initials || '—'}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
              {studentName || 'Loading...'}
            </h1>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {admissionNo ? `${admissionNo}${section ? ` · Section ${section}` : ''}` : ''}
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: 'Total Debits', value: fmt(totalDebits), color: 'text-[var(--text-primary)]' },
              { label: 'Total Credits', value: fmt(totalCredits), color: 'text-emerald-600' },
              { label: 'Balance', value: isOverpaid ? `(${fmt(overpaymentAmount)})` : fmt(currentBalance), color: currentBalance > 0 ? 'text-red-500' : currentBalance < 0 ? 'text-blue-600' : 'text-emerald-600' },
              ...(isOverpaid ? [{ label: 'Overpaid', value: fmt(overpaymentAmount), color: 'text-blue-600' }] : []),
            ].map((s) => (
              <div key={s.label} className={cn('text-center px-4 py-2.5 rounded-xl min-w-[100px]', s.label === 'Overpaid' ? 'bg-blue-50' : 'bg-[var(--card-bg-hover)]')}>
                <p className={cn('font-display text-[1.0625rem] font-extrabold leading-none tracking-[-0.02em]', s.color)}>{s.value}</p>
                <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 mb-6">
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Post Payment
        </button>
        <button onClick={() => setShowChargeModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[var(--card-bg-hover)] text-[var(--text-primary)] text-[0.8125rem] font-semibold hover:bg-[var(--border-subtle)] transition-all">
          <Plus className="w-4 h-4" /> New Charge
        </button>
        {isOverpaid && (
          <button onClick={() => setShowRefundModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-blue-600 text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] hover:brightness-110 transition-all">
            <RotateCcw className="w-4 h-4" /> Process Refund
          </button>
        )}
        <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
          <Download className="w-4 h-4" strokeWidth={2} /> Download Statement
        </button>
      </div>

      {/* Ledger journal */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[90px_2fr_70px_70px_1fr_1fr_1fr] gap-3 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Date', 'Category', 'Mode', 'Type', 'Debit', 'Credit', 'Balance'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {entries.map((entry, idx) => {
          const isDebit = entry.entryType === 'Debit';
          const amount = Number(entry.amount);
          const balance = Number(entry.runningBalance);
          const date = entry.createdAt.slice(0, 10);
          const showRemarks = entry.remarks && entry.remarks !== entry.category;
          return (
            <div key={entry.id} className={cn('grid grid-cols-[90px_2fr_70px_70px_1fr_1fr_1fr] gap-3 items-center px-6 py-3.5 hover:bg-[var(--card-bg-hover)] transition-colors',
              idx < entries.length - 1 && 'border-b border-[var(--border-subtle)]')}>
              <span className="text-[0.75rem] text-[var(--text-muted)]">{date}</span>
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{entry.category || '—'}</p>
                {entry.reference && <p className="text-[0.625rem] text-[var(--text-ghost)] truncate">Ref: {entry.reference}</p>}
                {showRemarks && <p className="text-[0.625rem] text-[var(--text-ghost)] truncate">{entry.remarks}</p>}
              </div>
              <span className="text-[0.6875rem] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">{entry.paymentMode || '—'}</span>
              <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md w-fit', isDebit ? 'bg-red-50' : 'bg-emerald-50')}>
                {isDebit ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : <ArrowDownRight className="w-3 h-3 text-emerald-600" />}
                <span className={cn('text-[0.625rem] font-bold', isDebit ? 'text-red-500' : 'text-emerald-600')}>{isDebit ? 'DR' : 'CR'}</span>
              </div>
              <span className="font-display text-[0.8125rem] font-bold text-red-500">{isDebit ? fmt(amount) : '—'}</span>
              <span className="font-display text-[0.8125rem] font-bold text-emerald-600">{!isDebit ? fmt(amount) : '—'}</span>
              <span className={cn('font-display text-[0.8125rem] font-bold', balance > 0 ? 'text-[var(--text-primary)]' : balance < 0 ? 'text-blue-600' : 'text-emerald-600')}>{balance < 0 ? `(${fmt(Math.abs(balance))})` : fmt(balance)}</span>
            </div>
          );
        })}

        {/* Totals */}
        <div className="grid grid-cols-[90px_2fr_70px_70px_1fr_1fr_1fr] gap-3 px-6 py-4 bg-[var(--card-bg-hover)]">
          <span /><span className="text-[0.875rem] font-bold text-[var(--text-primary)]">Totals</span><span /><span />
          <span className="font-display text-[0.875rem] font-extrabold text-red-500">{fmt(totalDebits)}</span>
          <span className="font-display text-[0.875rem] font-extrabold text-emerald-600">{fmt(totalCredits)}</span>
          <span className={cn('font-display text-[0.875rem] font-extrabold', currentBalance > 0 ? 'text-red-500' : currentBalance < 0 ? 'text-blue-600' : 'text-emerald-600')}>{currentBalance < 0 ? `(${fmt(Math.abs(currentBalance))})` : fmt(currentBalance)}</span>
        </div>
      </div>

      {/* Post Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[1.125rem] font-bold text-[var(--text-primary)]">Post Payment</h2>
              <button onClick={() => { setShowModal(false); resetPayForm(); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Pick a Charge</label>
                {debitEntries.length === 0 ? (
                  <p className="text-[0.75rem] text-[var(--text-muted)] py-3">No debit entries on this enrollment yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {debitEntries.map((d) => {
                      const isSelected = selectedDebitId === d.id;
                      return (
                        <button
                          key={d.id}
                          onClick={() => { setSelectedDebitId(d.id); if (!payAmount) setPayAmount(d.amount); }}
                          className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                            isSelected ? 'bg-[#f0f4ff] shadow-[0_0_0_2px_rgba(0,44,152,0.15)]' : 'bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)]')}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.75rem] font-semibold text-[var(--text-primary)] truncate">{d.remarks || d.category}</p>
                            <p className="text-[0.625rem] text-[var(--text-muted)]">{d.createdAt.slice(0, 10)}</p>
                          </div>
                          <span className="font-display text-[0.75rem] font-bold text-red-500">{fmt(Number(d.amount))}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Amount</label>
                <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value)}
                    className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow">
                    {paymentModes.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Receipt No.</label>
                  <input type="text" value={payReceiptNo} onChange={(e) => setPayReceiptNo(e.target.value)} placeholder="e.g. RCP-2026-0451"
                    className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Transaction Ref</label>
                  <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. UPI-TXN-78234"
                    className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
                </div>
                <div>
                  <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Paid At</label>
                  <input type="datetime-local" value={payPaidAt} onChange={(e) => setPayPaidAt(e.target.value)}
                    className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => { setShowModal(false); resetPayForm(); }} className="px-4 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                Cancel
              </button>
              <button onClick={handlePostPayment} disabled={posting || !selectedDebitId || !payAmount || Number(payAmount) <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {posting && <Loader2 className="w-4 h-4 animate-spin" />}
                {posting ? 'Posting...' : 'Post Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[1.125rem] font-bold text-[var(--text-primary)]">New Charge</h2>
              <button onClick={() => { setShowChargeModal(false); resetChargeForm(); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Category</label>
                <input type="text" value={chargeCategory} onChange={(e) => setChargeCategory(e.target.value)} placeholder="e.g. Tuition Fee, Library, Transport"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Amount</label>
                <input type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder="0"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Remarks</label>
                <input type="text" value={chargeRemarks} onChange={(e) => setChargeRemarks(e.target.value)} placeholder="e.g. Q1 2026 tuition, Late fee for March"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => { setShowChargeModal(false); resetChargeForm(); }} className="px-4 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                Cancel
              </button>
              <button onClick={handlePostCharge} disabled={charging || !chargeCategory.trim() || !chargeAmount || Number(chargeAmount) <= 0 || !chargeRemarks.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {charging && <Loader2 className="w-4 h-4 animate-spin" />}
                {charging ? 'Posting...' : 'Post Charge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[1.125rem] font-bold text-[var(--text-primary)]">Process Refund</h2>
              <button onClick={() => setShowRefundModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-3 mb-4">
              <p className="text-[0.75rem] font-medium text-blue-700">
                Overpayment available: <span className="font-bold">{fmt(overpaymentAmount)}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Refund Amount</label>
                <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0" max={overpaymentAmount}
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)] transition-shadow" />
                {Number(refundAmount) > overpaymentAmount && (
                  <p className="text-[0.6875rem] text-red-500 mt-1">Amount exceeds overpayment</p>
                )}
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Refund Mode</label>
                <select value={refundMode} onChange={(e) => setRefundMode(e.target.value)}
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)] transition-shadow">
                  {paymentModes.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Reference (optional)</label>
                <input type="text" value={refundRef} onChange={(e) => setRefundRef(e.target.value)} placeholder="e.g. NEFT-REF-123456"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)] transition-shadow" />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Reason</label>
                <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. Student withdrawal, excess payment"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)] transition-shadow" />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => setShowRefundModal(false)} className="px-4 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                Cancel
              </button>
              <button onClick={handleProcessRefund} disabled={refunding || !refundAmount || Number(refundAmount) <= 0 || Number(refundAmount) > overpaymentAmount || !refundReason}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-blue-600 text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.3)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {refunding && <Loader2 className="w-4 h-4 animate-spin" />}
                {refunding ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
