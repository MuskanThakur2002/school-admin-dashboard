import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Download, ArrowUpRight, ArrowDownRight, Loader2, X, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLedgerStore } from '@/stores/ledger.store';
import { useStudentsStore } from '@/stores/students.store';
import { useUIStore } from '@/stores/ui.store';
import type { Student } from '@/types/student.types';
import type { LedgerEntry } from '@/types/ledger.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const paymentModes = ['cash', 'cheque', 'upi', 'neft', 'dd'] as const;
const paymentCategories: LedgerEntry['category'][] = ['payment', 'concession', 'refund'];

export default function StudentLedgerPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { entries, loading, fetchStudentLedger, postPayment, processRefund } = useLedgerStore();
  const getStudent = useStudentsStore((s) => s.getStudent);
  const showToast = useUIStore((s) => s.showToast);

  const [student, setStudent] = useState<Student | null>(null);
  const [studentError, setStudentError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refunding, setRefunding] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [payCategory, setPayCategory] = useState<LedgerEntry['category']>('payment');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Refund form state
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMode, setRefundMode] = useState('neft');
  const [refundRef, setRefundRef] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    if (!studentId) return;
    fetchStudentLedger(studentId);
    getStudent(studentId).then(setStudent).catch(() => setStudentError(true));
  }, [studentId, fetchStudentLedger, getStudent]);

  const totalDebits = entries.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalCredits = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const currentBalance = totalDebits - totalCredits;
  const isOverpaid = currentBalance < 0;
  const overpaymentAmount = isOverpaid ? Math.abs(currentBalance) : 0;

  const initials = student
    ? `${student.firstName[0] || ''}${student.lastName[0] || ''}`.toUpperCase()
    : '';

  const handlePostPayment = async () => {
    if (!studentId || !payAmount || Number(payAmount) <= 0) return;
    setPosting(true);
    try {
      await postPayment({
        studentId,
        description: `Payment received — ${payMode.toUpperCase()}`,
        type: 'credit',
        category: payCategory,
        amount: Number(payAmount),
        mode: payMode,
        reference: payRef || undefined,
        remarks: payRemarks || undefined,
      });
      showToast({ type: 'success', title: 'Payment posted', message: `${fmt(Number(payAmount))} recorded successfully` });
      setShowModal(false);
      setPayAmount('');
      setPayMode('cash');
      setPayCategory('payment');
      setPayRef('');
      setPayRemarks('');
    } catch {
      showToast({ type: 'error', title: 'Payment failed', message: 'Could not post payment. Please try again.' });
    } finally {
      setPosting(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!studentId || !refundAmount || Number(refundAmount) <= 0 || !refundReason) return;
    if (Number(refundAmount) > overpaymentAmount) return;
    setRefunding(true);
    try {
      await processRefund({
        studentId,
        amount: Number(refundAmount),
        mode: refundMode,
        reference: refundRef || undefined,
        reason: refundReason,
      });
      showToast({ type: 'success', title: 'Refund processed', message: `${fmt(Number(refundAmount))} refunded successfully` });
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundMode('neft');
      setRefundRef('');
      setRefundReason('');
    } catch {
      showToast({ type: 'error', title: 'Refund failed', message: 'Could not process refund. Please try again.' });
    } finally {
      setRefunding(false);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (studentError) {
    return (
      <div className="max-w-[1280px]">
        <button onClick={() => navigate('/ledger')} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Ledger
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <p className="text-[var(--text-muted)] text-[0.875rem]">Student not found or no ledger entries exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      <button onClick={() => navigate('/ledger')} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Ledger
      </button>

      {/* Student header */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <span className="font-display text-[1.25rem] font-extrabold text-white">{initials}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
              {student ? `${student.firstName} ${student.lastName}` : 'Loading...'}
            </h1>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {student ? `${student.admissionNo} \u00b7 Class ${student.class}-${student.section}` : ''}
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
        <div className="grid grid-cols-[90px_2fr_80px_1fr_1fr_1fr] gap-3 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Date', 'Description', 'Type', 'Debit', 'Credit', 'Balance'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {entries.map((entry, idx) => (
          <div key={entry.id} className={cn('grid grid-cols-[90px_2fr_80px_1fr_1fr_1fr] gap-3 items-center px-6 py-3.5 hover:bg-[var(--card-bg-hover)] transition-colors',
            idx < entries.length - 1 && 'border-b border-[var(--border-subtle)]')}>
            <span className="text-[0.75rem] text-[var(--text-muted)]">{entry.date}</span>
            <div className="min-w-0">
              <p className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{entry.description}</p>
              {entry.reference && <p className="text-[0.625rem] text-[var(--text-ghost)]">Ref: {entry.reference}</p>}
            </div>
            <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md w-fit', entry.type === 'debit' ? 'bg-red-50' : 'bg-emerald-50')}>
              {entry.type === 'debit' ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : <ArrowDownRight className="w-3 h-3 text-emerald-600" />}
              <span className={cn('text-[0.625rem] font-bold', entry.type === 'debit' ? 'text-red-500' : 'text-emerald-600')}>{entry.type === 'debit' ? 'DR' : 'CR'}</span>
            </div>
            <span className="font-display text-[0.8125rem] font-bold text-red-500">{entry.type === 'debit' ? fmt(entry.amount) : '\u2014'}</span>
            <span className="font-display text-[0.8125rem] font-bold text-emerald-600">{entry.type === 'credit' ? fmt(entry.amount) : '\u2014'}</span>
            <span className={cn('font-display text-[0.8125rem] font-bold', entry.balance > 0 ? 'text-[var(--text-primary)]' : entry.balance < 0 ? 'text-blue-600' : 'text-emerald-600')}>{entry.balance < 0 ? `(${fmt(Math.abs(entry.balance))})` : fmt(entry.balance)}</span>
          </div>
        ))}

        {/* Totals */}
        <div className="grid grid-cols-[90px_2fr_80px_1fr_1fr_1fr] gap-3 px-6 py-4 bg-[var(--card-bg-hover)]">
          <span /><span className="text-[0.875rem] font-bold text-[var(--text-primary)]">Totals</span><span />
          <span className="font-display text-[0.875rem] font-extrabold text-red-500">{fmt(totalDebits)}</span>
          <span className="font-display text-[0.875rem] font-extrabold text-emerald-600">{fmt(totalCredits)}</span>
          <span className={cn('font-display text-[0.875rem] font-extrabold', currentBalance > 0 ? 'text-red-500' : currentBalance < 0 ? 'text-blue-600' : 'text-emerald-600')}>{currentBalance < 0 ? `(${fmt(Math.abs(currentBalance))})` : fmt(currentBalance)}</span>
        </div>
      </div>

      {/* Post Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-[1.125rem] font-bold text-[var(--text-primary)]">Post Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
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
                  <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Category</label>
                  <select value={payCategory} onChange={(e) => setPayCategory(e.target.value as LedgerEntry['category'])}
                    className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow">
                    {paymentCategories.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Reference (optional)</label>
                <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. CHQ-123456"
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
              </div>

              <div>
                <label className="block text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1.5">Remarks (optional)</label>
                <input type="text" value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} placeholder="Any notes..."
                  className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                Cancel
              </button>
              <button onClick={handlePostPayment} disabled={posting || !payAmount || Number(payAmount) <= 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {posting && <Loader2 className="w-4 h-4 animate-spin" />}
                {posting ? 'Posting...' : 'Post Payment'}
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
