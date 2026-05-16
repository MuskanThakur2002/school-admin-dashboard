import { useState, useEffect, useMemo } from 'react';
import { Search, IndianRupee, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { usePaymentStore } from '@/stores/payment.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import type { LedgerEntry } from '@/types/ledger.types';
import type { StudentEnrollment } from '@/types/student.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const modeOptions = [
  { label: 'Cash', value: 'cash' }, { label: 'Cheque', value: 'cheque' },
  { label: 'UPI', value: 'upi' }, { label: 'Bank Transfer (NEFT)', value: 'neft' },
  { label: 'Demand Draft', value: 'dd' }, { label: 'Card', value: 'card' },
  { label: 'Online', value: 'online' },
];

const statusOptions = [
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Pending', value: 'pending' },
];

function toDatetimeLocal(iso: string): string {
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm"
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PaymentPostingPage() {
  const showToast = useUIStore((s) => s.showToast);
  const createPayment = usePaymentStore((s) => s.createPayment);
  const payments = usePaymentStore((s) => s.payments);
  const fetchPayments = usePaymentStore((s) => s.fetchPayments);
  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);
  const ledgerEntries = useLedgerStore((s) => s.entries);
  const fetchEnrollmentLedger = useLedgerStore((s) => s.fetchEnrollmentLedger);
  const ledgerLoading = useLedgerStore((s) => s.loading);

  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [selectedDebitId, setSelectedDebitId] = useState('');

  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paidAt, setPaidAt] = useState(toDatetimeLocal(new Date().toISOString()));
  const [status, setStatus] = useState('confirmed');

  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [postedReceiptNo, setPostedReceiptNo] = useState('');
  const [postedAmount, setPostedAmount] = useState(0);
  const [postedStudentName, setPostedStudentName] = useState('');

  useEffect(() => {
    if (enrollments.length === 0) fetchEnrollments();
    if (payments.length === 0) fetchPayments();
  }, [enrollments.length, fetchEnrollments, payments.length, fetchPayments]);

  useEffect(() => {
    if (selectedEnrollmentId) {
      fetchEnrollmentLedger(selectedEnrollmentId);
      setSelectedDebitId('');
      setAmount('');
    }
  }, [selectedEnrollmentId, fetchEnrollmentLedger]);

  const filteredEnrollments: StudentEnrollment[] = useMemo(() => {
    const list = enrollments.filter((e) => e.student?.name);
    if (!enrollmentSearch) return list.slice(0, 8);
    const q = enrollmentSearch.toLowerCase();
    return list.filter((e) =>
      (e.student?.name ?? '').toLowerCase().includes(q) ||
      (e.student?.admissionNumber ?? '').toLowerCase().includes(q),
    ).slice(0, 10);
  }, [enrollments, enrollmentSearch]);

  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId);

  // Sum payments already applied to each ledger debit. Backend doesn't filter
  // /payments by enrollment, so we get all payments and group client-side.
  const paidByLedgerId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      if (!p.ledgerEntryId) continue;
      map.set(p.ledgerEntryId, (map.get(p.ledgerEntryId) ?? 0) + Number(p.amount));
    }
    return map;
  }, [payments]);

  // Outstanding charges = Debit entries for this enrollment that still have
  // a positive remaining balance after subtracting prior payments.
  const debitEntries: Array<LedgerEntry & { remaining: number }> = useMemo(() => {
    return ledgerEntries
      .filter((e) => e.studentEnrollmentId === selectedEnrollmentId && e.entryType === 'Debit')
      .map((e) => ({ ...e, remaining: Number(e.amount) - (paidByLedgerId.get(e.id) ?? 0) }))
      .filter((e) => e.remaining > 0);
  }, [ledgerEntries, selectedEnrollmentId, paidByLedgerId]);

  const selectedDebit = debitEntries.find((e) => e.id === selectedDebitId);

  const resetForm = () => {
    setSelectedEnrollmentId('');
    setSelectedDebitId('');
    setEnrollmentSearch('');
    setAmount('');
    setPaymentMode('cash');
    setTransactionRef('');
    setReceiptNumber('');
    setPaidAt(toDatetimeLocal(new Date().toISOString()));
    setStatus('confirmed');
  };

  const handlePost = async () => {
    if (!selectedEnrollmentId || !selectedDebitId || !amount) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Pick a student, a charge, and enter an amount.' });
      return;
    }
    if (Number(amount) <= 0) {
      showToast({ type: 'error', title: 'Invalid amount', message: 'Amount must be greater than zero.' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPayment({
        studentEnrollmentId: selectedEnrollmentId,
        ledgerEntryId: selectedDebitId,
        amount: Number(amount),
        paymentMode,
        transactionRef,
        status,
        receiptNumber,
        paidAt: new Date(paidAt).toISOString(),
      });
      setPostedReceiptNo(created.receiptNumber || receiptNumber);
      setPostedAmount(Number(amount));
      setPostedStudentName(selectedEnrollment?.student?.name ?? '');
      setPosted(true);
      showToast({ type: 'success', title: 'Payment recorded', message: `${fmt(Number(amount))} received` });
    } catch (err) {
      showToast({ type: 'error', title: 'Payment failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (posted) {
    return (
      <div className="max-w-[1280px]">
        <div className="bg-[var(--card-bg)] rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center max-w-lg mx-auto mt-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] mb-2">Payment Recorded</h2>
          <p className="text-[0.875rem] text-[var(--text-muted)] mb-1">{fmt(postedAmount)} received{postedStudentName ? ` from ${postedStudentName}` : ''}</p>
          {postedReceiptNo && <p className="text-[0.8125rem] font-semibold text-[#002c98] mb-1">Receipt {postedReceiptNo}</p>}
          <p className="text-[0.75rem] text-[var(--text-ghost)] mb-6">Ledger credit applied automatically</p>
          <Button onClick={() => { setPosted(false); resetForm(); }}>
            Post Another Payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Post Payment</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Apply a payment to a specific outstanding charge</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-5">1. Select Student</h2>

          <div className="mb-6">
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
              <input
                type="text"
                value={enrollmentSearch}
                onChange={(e) => setEnrollmentSearch(e.target.value)}
                placeholder="Search by name or admission no..."
                className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-10 pr-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
              />
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {filteredEnrollments.map((e) => {
                const name = e.student?.name ?? '';
                const initials = name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
                const isSelected = selectedEnrollmentId === e.id;
                return (
                  <button key={e.id} onClick={() => setSelectedEnrollmentId(e.id)}
                    className={cn('w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all',
                      isSelected ? 'bg-[#f0f4ff] shadow-[0_0_0_2px_rgba(0,44,152,0.15)]' : 'bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)]')}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                      <span className="text-white text-[0.625rem] font-bold">{initials || '?'}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{name}</p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">{e.student?.admissionNumber}{e.classSection?.section ? ` · Section ${e.classSection.section}` : ''}</p>
                    </div>
                  </button>
                );
              })}
              {filteredEnrollments.length === 0 && (
                <p className="text-[0.8125rem] text-[var(--text-muted)] text-center py-4">No enrollments found</p>
              )}
            </div>
          </div>

          {/* Step 2 — Pick the charge */}
          {selectedEnrollmentId && (
            <>
              <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-3">2. Pick a Charge to Pay</h2>
              <div className="mb-6 space-y-2 max-h-[200px] overflow-y-auto">
                {ledgerLoading && debitEntries.length === 0 ? (
                  <p className="text-[0.8125rem] text-[var(--text-muted)] text-center py-4">Loading charges...</p>
                ) : debitEntries.length === 0 ? (
                  <p className="text-[0.8125rem] text-[var(--text-muted)] text-center py-4">No debit entries for this student in the active year</p>
                ) : debitEntries.map((d) => {
                  const isSelected = selectedDebitId === d.id;
                  const charge = Number(d.amount);
                  const partiallyPaid = d.remaining < charge;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDebitId(d.id);
                        if (!amount) setAmount(String(d.remaining));
                      }}
                      className={cn('w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all',
                        isSelected ? 'bg-[#f0f4ff] shadow-[0_0_0_2px_rgba(0,44,152,0.15)]' : 'bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)]')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{d.remarks || d.category}</p>
                        <p className="text-[0.6875rem] text-[var(--text-muted)]">{d.createdAt.slice(0, 10)}{d.reference ? ` · Ref ${d.reference}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.6875rem] text-[var(--text-muted)]">{partiallyPaid ? 'Remaining' : 'Amount'}</p>
                        <p className="font-display text-[0.875rem] font-bold text-red-500">{fmt(d.remaining)}</p>
                        {partiallyPaid && (
                          <p className="text-[0.625rem] text-[var(--text-ghost)]">of {fmt(charge)}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 3 — Payment fields */}
          {selectedDebitId && (
            <>
              <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-3">3. Payment Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Amount (INR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" />
                <Select label="Payment Mode" options={modeOptions} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Receipt No." value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="e.g. RCP-2026-0451" />
                <Input label="Transaction Ref" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="e.g. UPI-TXN-78234" />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="Paid At" type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                <Select label="Status" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
              </div>

              <Button onClick={handlePost} className="w-full mt-2" size="lg" disabled={!selectedEnrollmentId || !selectedDebitId || !amount || submitting}>
                <IndianRupee className="w-4 h-4" /> {submitting ? 'Processing...' : 'Record Payment'}
              </Button>
            </>
          )}
        </div>

        {/* Preview */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-5">Payment Summary</h3>
          {selectedEnrollment ? (
            <div className="space-y-3">
              {[
                { label: 'Student', value: selectedEnrollment.student?.name ?? '—' },
                { label: 'Admission No.', value: selectedEnrollment.student?.admissionNumber ?? '—' },
                { label: 'Section', value: selectedEnrollment.classSection?.section ?? '—' },
                { label: 'Charge', value: selectedDebit ? (selectedDebit.remarks || selectedDebit.category) : '—' },
                { label: 'Charge Amount', value: selectedDebit ? fmt(Number(selectedDebit.amount)) : '—' },
                { label: 'Payment Amount', value: amount ? fmt(Number(amount)) : '—' },
                { label: 'Mode', value: paymentMode.toUpperCase() },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5">
                  <span className="text-[0.75rem] text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate ml-2 max-w-[60%] text-right">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-[#e2e8f0] mx-auto mb-3" />
              <p className="text-[0.8125rem] text-[var(--text-muted)]">Select a student to see summary</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
