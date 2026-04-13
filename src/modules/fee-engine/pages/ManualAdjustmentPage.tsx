import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, X, ArrowUpRight, ArrowDownLeft,
  FileText, Users, SlidersHorizontal,
  RotateCcw, Heart, Scale, Copy, CircleDot, HelpCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdjustmentStore } from '@/stores/adjustment.store';
import { useStudentsStore } from '@/stores/students.store';
import type { AdjustmentReason } from '@/services/modules/adjustment.api';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const reasonConfig: Record<AdjustmentReason, { label: string; icon: React.ElementType; color: string }> = {
  fee_correction:      { label: 'Fee Correction',      icon: SlidersHorizontal, color: 'bg-blue-50 text-blue-600' },
  overcharge_reversal: { label: 'Overcharge Reversal',  icon: RotateCcw,         color: 'bg-amber-50 text-amber-600' },
  goodwill_credit:     { label: 'Goodwill Credit',      icon: Heart,             color: 'bg-pink-50 text-pink-600' },
  penalty_waiver:      { label: 'Penalty Waiver',       icon: Scale,             color: 'bg-emerald-50 text-emerald-600' },
  rounding_difference: { label: 'Rounding Difference',  icon: CircleDot,         color: 'bg-violet-50 text-violet-600' },
  duplicate_charge:    { label: 'Duplicate Charge',     icon: Copy,              color: 'bg-red-50 text-red-500' },
  other:               { label: 'Other',                icon: HelpCircle,        color: 'bg-slate-50 text-slate-500' },
};

const reasonOptions = Object.entries(reasonConfig).map(([value, { label }]) => ({ label, value }));

const typeOptions = [
  { label: 'Credit (reduce balance)', value: 'credit' },
  { label: 'Debit (increase balance)', value: 'debit' },
];

export default function ManualAdjustmentPage() {
  const adjustments = useAdjustmentStore((s) => s.adjustments);
  const loading = useAdjustmentStore((s) => s.loading);
  const fetchAdjustments = useAdjustmentStore((s) => s.fetchAdjustments);
  const postAdjustment = useAdjustmentStore((s) => s.postAdjustment);
  const students = useStudentsStore((s) => s.students);
  const fetchStudents = useStudentsStore((s) => s.fetchStudents);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [formType, setFormType] = useState<'debit' | 'credit'>('credit');
  const [formReason, setFormReason] = useState<AdjustmentReason>('fee_correction');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (adjustments.length === 0) fetchAdjustments();
    if (students.length === 0) fetchStudents();
  }, [adjustments.length, students.length, fetchAdjustments, fetchStudents]);

  const filtered = useMemo(() => adjustments.filter((a) => {
    const ms = !search || a.studentName.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    const mt = !typeFilter || a.type === typeFilter;
    const mr = !reasonFilter || a.reason === reasonFilter;
    return ms && mt && mr;
  }), [adjustments, search, typeFilter, reasonFilter]);

  const totalCredits = adjustments.filter((a) => a.type === 'credit').reduce((s, a) => s + a.amount, 0);
  const totalDebits = adjustments.filter((a) => a.type === 'debit').reduce((s, a) => s + a.amount, 0);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 6);
    const q = studentSearch.toLowerCase();
    return students.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [students, studentSearch]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const resetForm = () => {
    setSelectedStudentId('');
    setStudentSearch('');
    setFormType('credit');
    setFormReason('fee_correction');
    setFormDesc('');
    setFormAmount('');
    setFormRemarks('');
  };

  const handlePost = async () => {
    if (!selectedStudentId || !formAmount || !formDesc || !formRemarks) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Student, description, amount, and remarks are required' });
      return;
    }
    if (Number(formAmount) <= 0) {
      showToast({ type: 'error', title: 'Invalid amount', message: 'Amount must be greater than zero' });
      return;
    }
    setSubmitting(true);
    try {
      const adj = await postAdjustment({
        studentId: selectedStudentId,
        type: formType,
        reason: formReason,
        description: formDesc,
        amount: Number(formAmount),
        remarks: formRemarks,
      });
      const action = adj.type === 'credit' ? 'credited to' : 'debited from';
      showToast({ type: 'success', title: 'Adjustment posted', message: `${fmt(adj.amount)} ${action} ${adj.studentName}` });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Manual Adjustments</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Post debit or credit adjustments to student ledgers</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> New Adjustment
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Adjustments', value: adjustments.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
          { label: 'Credits Issued', value: fmt(totalCredits), icon: ArrowDownLeft, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Debits Issued', value: fmt(totalDebits), icon: ArrowUpRight, color: 'bg-red-50 text-red-500' },
          { label: 'Students Adjusted', value: new Set(adjustments.map((a) => a.studentId)).size, icon: Users, color: 'bg-violet-50 text-violet-600' },
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
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or description..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'All', value: '' },
            { label: 'Credits', value: 'credit' },
            { label: 'Debits', value: 'debit' },
          ].map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all', typeFilter === t.value ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'All Reasons', value: '' },
            { label: 'Fee Correction', value: 'fee_correction' },
            { label: 'Overcharge', value: 'overcharge_reversal' },
            { label: 'Penalty Waiver', value: 'penalty_waiver' },
            { label: 'Duplicate', value: 'duplicate_charge' },
          ].map((r) => (
            <button key={r.value} onClick={() => setReasonFilter(r.value)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all', reasonFilter === r.value ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && adjustments.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading adjustments...</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[0.7fr_0.5fr_1fr_1.8fr_1.4fr_0.8fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Date', 'Type', 'Reason', 'Description', 'Student', 'Amount', 'Posted By'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[0.875rem] text-[var(--text-muted)]">No adjustments found</p>
            </div>
          ) : filtered.map((adj, idx) => {
            const reason = reasonConfig[adj.reason] || reasonConfig.other;
            const ReasonIcon = reason.icon;
            const isCredit = adj.type === 'credit';
            return (
              <div key={adj.id} className={cn('grid grid-cols-[0.7fr_0.5fr_1fr_1.8fr_1.4fr_0.8fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors group',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{adj.date}</span>
                <div className="flex items-center gap-1.5">
                  {isCredit ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[0.6875rem] font-semibold">
                      <ArrowDownLeft className="w-3 h-3" /> CR
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[0.6875rem] font-semibold">
                      <ArrowUpRight className="w-3 h-3" /> DR
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', reason.color)}><ReasonIcon className="w-3.5 h-3.5" strokeWidth={2} /></div>
                  <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)] truncate">{reason.label}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{adj.description}</p>
                  {adj.remarks && <p className="text-[0.6875rem] text-[var(--text-muted)] truncate mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{adj.remarks}</p>}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{adj.studentName}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)]">{adj.admissionNo} &middot; {adj.class}</p>
                </div>
                <span className={cn('font-display text-[0.875rem] font-bold', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                  {isCredit ? '-' : '+'}{fmt(adj.amount)}
                </span>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{adj.postedBy}</span>
              </div>
            );
          })}
          <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]">
            <p className="text-[0.75rem] text-[var(--text-muted)]">
              {filtered.length} adjustment{filtered.length !== 1 ? 's' : ''} &middot;
              Credits: {fmt(filtered.filter((a) => a.type === 'credit').reduce((s, a) => s + a.amount, 0))} &middot;
              Debits: {fmt(filtered.filter((a) => a.type === 'debit').reduce((s, a) => s + a.amount, 0))}
            </p>
          </div>
        </div>
      )}

      {/* Post Adjustment Modal */}
      <Modal open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }} title="Post Manual Adjustment" description="Add a debit or credit adjustment to a student ledger" size="md"
        footer={<><Button variant="tertiary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button><Button onClick={handlePost} loading={submitting}>Post Adjustment</Button></>}>
        <div className="space-y-4">
          {/* Student search */}
          <div>
            <p className="text-[0.75rem] font-semibold text-[var(--text-secondary)] mb-2">Select Student *</p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or admission no..."
                className="w-full bg-[var(--card-bg-hover)] rounded-lg pl-9 pr-4 py-2 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
              />
            </div>
            <div className="max-h-[160px] overflow-y-auto space-y-1">
              {filteredStudents.map((s) => (
                <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setStudentSearch(''); }}
                  className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                    selectedStudentId === s.id ? 'bg-blue-50 shadow-[0_0_0_2px_rgba(0,44,152,0.15)]' : 'hover:bg-[var(--card-bg-hover)]')}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                    <span className="text-white text-[0.5625rem] font-bold">{s.firstName[0]}{s.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.75rem] font-semibold text-[var(--text-primary)] truncate">{s.firstName} {s.lastName}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)]">{s.admissionNo} &middot; {s.class}-{s.section}</p>
                  </div>
                </button>
              ))}
            </div>
            {selectedStudent && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-50 text-[0.6875rem] font-semibold text-emerald-700">
                Selected: {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.admissionNo})
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Adjustment Type *" options={typeOptions} value={formType} onChange={(e) => setFormType(e.target.value as 'debit' | 'credit')} />
            <Select label="Reason *" options={reasonOptions} value={formReason} onChange={(e) => setFormReason(e.target.value as AdjustmentReason)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Description *" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="e.g. Tuition Fee overcharge Q3" />
            <Input label="Amount (INR) *" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="e.g. 2000" />
          </div>
          <div>
            <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide mb-1.5">Remarks / Justification *</label>
            <textarea
              value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Provide reason and context for this adjustment (required for audit trail)..."
              rows={3}
              className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-shadow resize-none"
            />
          </div>

          {/* Preview */}
          {selectedStudent && formAmount && (
            <div className={cn('px-4 py-3 rounded-xl text-[0.75rem] font-medium', formType === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
              {formType === 'credit' ? 'Credit' : 'Debit'} of {fmt(Number(formAmount))} will be posted to {selectedStudent.firstName} {selectedStudent.lastName}'s ledger as an adjustment entry.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
