import { useState, useEffect } from 'react';
import { Search, IndianRupee, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useReceiptStore } from '@/stores/receipt.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useDemoStudentsStore } from '@/stores/students.store';
import type { PaymentMode } from '@/types/receipt.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const modeOptions = [
  { label: 'Cash', value: 'cash' }, { label: 'Cheque', value: 'cheque' },
  { label: 'UPI', value: 'upi' }, { label: 'Bank Transfer (NEFT)', value: 'neft' },
  { label: 'Demand Draft', value: 'dd' }, { label: 'Card', value: 'card' },
  { label: 'Online', value: 'online' },
];

interface StudentWithBalance {
  id: string;
  name: string;
  admissionNo: string;
  class: string;
  section: string;
  balance: number;
}

export default function PaymentPostingPage() {
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsWithBalance, setStudentsWithBalance] = useState<StudentWithBalance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithBalance | null>(null);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [posted, setPosted] = useState(false);
  const [postedReceiptNo, setPostedReceiptNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = useUIStore((s) => s.showToast);
  const postPayment = useReceiptStore((s) => s.postPayment);
  const { summaries, fetchSummaries } = useLedgerStore();
  const { students, fetchStudents } = useDemoStudentsStore();

  useEffect(() => { fetchStudents(); fetchSummaries(); }, [fetchStudents, fetchSummaries]);

  // Build students with balance from ledger summaries
  useEffect(() => {
    const list: StudentWithBalance[] = students
      .map((s) => {
        const summary = summaries.find((sum) => sum.studentId === s.id);
        return {
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          admissionNo: s.admissionNo,
          class: s.class,
          section: s.section,
          balance: summary?.balance ?? 0,
        };
      })
      .filter((s) => s.balance > 0);
    setStudentsWithBalance(list);
  }, [students, summaries]);

  const filteredStudents = studentSearch
    ? studentsWithBalance.filter((s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(studentSearch.toLowerCase()))
    : studentsWithBalance;

  const handlePost = async () => {
    if (!selectedStudent || !amount) return;
    setSubmitting(true);
    try {
      const receipt = await postPayment({
        studentId: selectedStudent.id,
        amount: Number(amount),
        mode: mode as PaymentMode,
        reference,
        remarks: remarks || undefined,
      });
      showToast({ type: 'success', title: 'Payment recorded', message: `${fmt(Number(amount))} from ${selectedStudent.name}` });
      setPostedReceiptNo(receipt.receiptNo);
      setPosted(true);
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
          <p className="text-[0.875rem] text-[var(--text-muted)] mb-1">{fmt(Number(amount))} received from {selectedStudent?.name}</p>
          <p className="text-[0.8125rem] font-semibold text-[#002c98] mb-1">Receipt {postedReceiptNo}</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mb-6">Ledger updated automatically</p>
          <Button onClick={() => { setPosted(false); setSelectedStudent(null); setAmount(''); setReference(''); setRemarks(''); setPostedReceiptNo(''); }}>
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
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Record a fee payment against a student account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-5">Payment Details</h2>

          {/* Student selector */}
          <div className="mb-5">
            <p className="text-[0.8125rem] font-semibold text-[var(--text-secondary)] mb-2">Select Student</p>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
              <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search by name or admission no..."
                className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-10 pr-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {filteredStudents.map((s) => (
                <button key={s.id} onClick={() => setSelectedStudent(s)}
                  className={cn('w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all',
                    selectedStudent?.id === s.id ? 'bg-[#f0f4ff] shadow-[0_0_0_2px_rgba(0,44,152,0.15)]' : 'bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)]')}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                    <span className="text-white text-[0.625rem] font-bold">{s.name.split(' ').map((n) => n[0]).join('')}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-[0.6875rem] text-[var(--text-muted)]">{s.admissionNo} &middot; {s.class}-{s.section}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.6875rem] text-[var(--text-muted)]">Balance Due</p>
                    <p className="font-display text-[0.875rem] font-bold text-red-500">{fmt(s.balance)}</p>
                  </div>
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-[0.8125rem] text-[var(--text-muted)] text-center py-4">No students with outstanding balance</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="Amount (INR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" />
            <Select label="Payment Mode" options={modeOptions} value={mode} onChange={(e) => setMode(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="Reference No." value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. CHQ-445891" />
            <Input label="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any notes" />
          </div>

          <Button onClick={handlePost} className="w-full mt-2" size="lg" disabled={!selectedStudent || !amount || submitting}>
            <IndianRupee className="w-4 h-4" /> {submitting ? 'Processing...' : 'Record Payment'}
          </Button>
        </div>

        {/* Preview */}
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-5">Payment Summary</h3>
          {selectedStudent ? (
            <div className="space-y-4">
              {[
                { label: 'Student', value: selectedStudent.name },
                { label: 'Admission No.', value: selectedStudent.admissionNo },
                { label: 'Class', value: `${selectedStudent.class}-${selectedStudent.section}` },
                { label: 'Current Balance', value: fmt(selectedStudent.balance) },
                { label: 'Payment Amount', value: amount ? fmt(Number(amount)) : '—' },
                { label: 'Mode', value: mode.toUpperCase() },
                { label: 'Balance After', value: amount ? fmt(selectedStudent.balance - Number(amount)) : '—' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <span className="text-[0.75rem] text-[var(--text-muted)]">{item.label}</span>
                  <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{item.value}</span>
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
