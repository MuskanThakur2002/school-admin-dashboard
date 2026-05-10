import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, X, BookOpen, Shirt, Bus, AlertTriangle,
  Beaker, Home, Coins, IndianRupee, Users, FileText,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useExpenseStore } from '@/stores/expense.store';
import { useDemoStudentsStore } from '@/stores/students.store';
import type { ExpenseCategory } from '@/services/modules/expense.api';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  books: { icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
  uniform: { icon: Shirt, color: 'bg-violet-50 text-violet-600' },
  transport: { icon: Bus, color: 'bg-emerald-50 text-emerald-600' },
  fine: { icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
  activity: { icon: Coins, color: 'bg-amber-50 text-amber-600' },
  lab: { icon: Beaker, color: 'bg-indigo-50 text-indigo-600' },
  hostel: { icon: Home, color: 'bg-teal-50 text-teal-600' },
  other: { icon: FileText, color: 'bg-slate-50 text-slate-500' },
};

const categoryOptions = [
  { label: 'Books', value: 'books' }, { label: 'Uniform', value: 'uniform' },
  { label: 'Transport', value: 'transport' }, { label: 'Fine', value: 'fine' },
  { label: 'Activity', value: 'activity' }, { label: 'Lab', value: 'lab' },
  { label: 'Hostel', value: 'hostel' }, { label: 'Other', value: 'other' },
];

export default function ExpensePostingPage() {
  const expenses = useExpenseStore((s) => s.expenses);
  const loading = useExpenseStore((s) => s.loading);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);
  const postExpense = useExpenseStore((s) => s.postExpense);
  const students = useDemoStudentsStore((s) => s.students);
  const fetchStudents = useDemoStudentsStore((s) => s.fetchStudents);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('books');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (expenses.length === 0) fetchExpenses();
    if (students.length === 0) fetchStudents();
  }, [expenses.length, students.length, fetchExpenses, fetchStudents]);

  const filtered = useMemo(() => expenses.filter((e) => {
    const ms = !search || e.studentName.toLowerCase().includes(search.toLowerCase()) || e.description.toLowerCase().includes(search.toLowerCase());
    const mc = !catFilter || e.category === catFilter;
    return ms && mc;
  }), [expenses, search, catFilter]);

  const totalPosted = expenses.reduce((s, e) => s + e.amount, 0);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students.slice(0, 6);
    const q = studentSearch.toLowerCase();
    return students.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [students, studentSearch]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handlePost = async () => {
    if (!selectedStudentId || !formAmount || !formDesc) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Student, description, and amount are required' });
      return;
    }
    setSubmitting(true);
    try {
      const exp = await postExpense({
        studentId: selectedStudentId,
        category: formCategory,
        description: formDesc,
        amount: Number(formAmount),
      });
      showToast({ type: 'success', title: 'Expense posted', message: `${fmt(exp.amount)} charged to ${exp.studentName}` });
      setModalOpen(false);
      setSelectedStudentId(''); setStudentSearch(''); setFormDesc(''); setFormAmount('');
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
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Expense Posting</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Post charges to student accounts</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Post Expense
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Posted', value: fmt(totalPosted), icon: IndianRupee, color: 'bg-blue-50 text-blue-600' },
          { label: 'Transactions', value: expenses.length, icon: FileText, color: 'bg-violet-50 text-violet-600' },
          { label: 'Students Charged', value: new Set(expenses.map((e) => e.studentId)).size, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
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
          {['', 'books', 'uniform', 'transport', 'fine', 'lab', 'activity'].map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all capitalize', catFilter === c ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
              {c === '' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && expenses.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading expenses...</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[0.8fr_1fr_2fr_1.5fr_1fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Date', 'Category', 'Description', 'Student', 'Amount', 'Posted By'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>
          {filtered.map((exp, idx) => {
            const cat = categoryConfig[exp.category] || categoryConfig.other;
            const CatIcon = cat.icon;
            return (
              <div key={exp.id} className={cn('grid grid-cols-[0.8fr_1fr_2fr_1.5fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{exp.date}</span>
                <div className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', cat.color)}><CatIcon className="w-3.5 h-3.5" strokeWidth={2} /></div>
                  <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)] capitalize">{exp.category}</span>
                </div>
                <span className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{exp.description}</span>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{exp.studentName}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)]">{exp.admissionNo} &middot; {exp.class}</p>
                </div>
                <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">{fmt(exp.amount)}</span>
                <span className="text-[0.75rem] text-[var(--text-muted)]">{exp.postedBy}</span>
              </div>
            );
          })}
          <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]">
            <p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} expenses &middot; Total: {fmt(filtered.reduce((s, e) => s + e.amount, 0))}</p>
          </div>
        </div>
      )}

      {/* Post Expense Modal — with real student search */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Post Expense" description="Charge a student account" size="md"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handlePost} loading={submitting}>Post Expense</Button></>}>
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
            <Select label="Category *" options={categoryOptions} value={formCategory} onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)} />
            <Input label="Amount (INR) *" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="e.g. 650" />
          </div>
          <Input label="Description *" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="e.g. Science textbook — Class VIII" />
        </div>
      </Modal>
    </div>
  );
}
