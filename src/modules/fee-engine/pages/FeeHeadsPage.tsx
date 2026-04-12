import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Wallet,
  Pencil,
  Search,
  X,
  IndianRupee,
  Repeat,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';
import type { FeeHead } from '@/types/fee.types';

// ─── Helpers ─────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const categoryStyle: Record<string, { bg: string; text: string }> = {
  tuition: { bg: 'bg-blue-50', text: 'text-blue-700' },
  transport: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  hostel: { bg: 'bg-violet-50', text: 'text-violet-700' },
  exam: { bg: 'bg-red-50', text: 'text-red-600' },
  activity: { bg: 'bg-amber-50', text: 'text-amber-700' },
  lab: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  library: { bg: 'bg-teal-50', text: 'text-teal-700' },
  other: { bg: 'bg-slate-50', text: 'text-slate-500' },
};

const categoryOptions = [
  { label: 'Tuition', value: 'tuition' }, { label: 'Transport', value: 'transport' },
  { label: 'Hostel', value: 'hostel' }, { label: 'Exam', value: 'exam' },
  { label: 'Activity', value: 'activity' }, { label: 'Lab', value: 'lab' },
  { label: 'Library', value: 'library' }, { label: 'Other', value: 'other' },
];
const typeOptions = [{ label: 'Recurring', value: 'recurring' }, { label: 'One-time', value: 'one_time' }];
const frequencyOptions = [
  { label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' },
  { label: 'Half-yearly', value: 'half_yearly' }, { label: 'Annual', value: 'annual' },
];

// ─── Component ───────────────────────────────────────────────

export default function FeeHeadsPage() {
  const heads = useFeeStore((s) => s.heads);
  const fetchHeads = useFeeStore((s) => s.fetchHeads);
  const createHead = useFeeStore((s) => s.createHead);
  const updateHead = useFeeStore((s) => s.updateHead);
  const deleteHead = useFeeStore((s) => s.deleteHead);
  const toggleHead = useFeeStore((s) => s.toggleHead);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<FeeHead | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState('recurring');
  const [formCategory, setFormCategory] = useState('tuition');
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState('monthly');
  const [formTaxable, setFormTaxable] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (heads.length === 0) fetchHeads();
  }, [heads.length, fetchHeads]);

  const filtered = heads.filter(
    (h) => !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.code.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRecurring = heads.filter((h) => h.type === 'recurring' && h.enabled).reduce((sum, h) => sum + h.amount, 0);
  const totalOneTime = heads.filter((h) => h.type === 'one_time' && h.enabled).reduce((sum, h) => sum + h.amount, 0);

  const openCreate = () => {
    setEditingHead(null); setFormName(''); setFormCode(''); setFormType('recurring');
    setFormCategory('tuition'); setFormAmount(''); setFormFrequency('monthly'); setFormTaxable(false);
    setModalOpen(true);
  };

  const openEdit = (head: FeeHead) => {
    setEditingHead(head); setFormName(head.name); setFormCode(head.code); setFormType(head.type);
    setFormCategory(head.category); setFormAmount(String(head.amount));
    setFormFrequency(head.frequency || 'monthly'); setFormTaxable(head.taxable);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName || !formCode || !formAmount) return;
    try {
      if (editingHead) {
        await updateHead(editingHead.id, {
          name: formName, code: formCode.toUpperCase(),
          type: formType as FeeHead['type'], category: formCategory as FeeHead['category'],
          amount: Number(formAmount), frequency: formType === 'recurring' ? (formFrequency as FeeHead['frequency']) : undefined,
          taxable: formTaxable,
        });
        showToast({ type: 'success', title: 'Fee head updated', message: formName });
      } else {
        await createHead({
          name: formName, code: formCode.toUpperCase(),
          type: formType as FeeHead['type'], category: formCategory as FeeHead['category'],
          amount: Number(formAmount), frequency: formType === 'recurring' ? (formFrequency as FeeHead['frequency']) : undefined,
          taxable: formTaxable,
        });
        showToast({ type: 'success', title: 'Fee head created', message: formName });
      }
      setModalOpen(false);
    } catch {
      showToast({ type: 'error', title: 'Operation failed', message: 'Could not save fee head. Please try again.' });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleHead(id);
    } catch {
      showToast({ type: 'error', title: 'Toggle failed', message: 'Could not toggle fee head status.' });
    }
  };

  const handleDelete = async (head: FeeHead) => {
    try {
      await deleteHead(head.id);
      showToast({ type: 'info', title: 'Fee head removed', message: head.name });
    } catch {
      showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete fee head.' });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Fee Heads</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage fee categories, amounts, and billing frequency</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Fee Head
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Fee Heads', value: heads.length, icon: Wallet, color: 'bg-blue-50 text-blue-600' },
          { label: 'Monthly Recurring', value: fmt(totalRecurring), icon: Repeat, color: 'bg-violet-50 text-violet-600' },
          { label: 'One-time Charges', value: fmt(totalOneTime), icon: Zap, color: 'bg-emerald-50 text-emerald-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fee heads..."
          className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"><X className="w-3.5 h-3.5" /></button>}
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1fr_1.2fr_1.2fr_1fr_0.8fr_0.6fr_0.6fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Fee Head', 'Code', 'Category', 'Amount', 'Type', 'Status', '', ''].map((h, i) => (
            <span key={i} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {filtered.map((head, idx) => {
          const cat = categoryStyle[head.category] || categoryStyle.other;
          return (
            <div key={head.id} className={cn(
              'grid grid-cols-[2.5fr_1fr_1.2fr_1.2fr_1fr_0.8fr_0.6fr_0.6fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)]',
              idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
              !head.enabled && 'opacity-40',
            )}>
              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 text-blue-600" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{head.name}</p>
                  {head.frequency && <p className="text-[0.6875rem] text-[var(--text-muted)] capitalize">{head.frequency}</p>}
                </div>
              </div>

              {/* Code */}
              <span className="font-display text-[0.75rem] font-bold text-[var(--text-tertiary)] tracking-wide">{head.code}</span>

              {/* Category */}
              <div className={cn('inline-flex items-center px-2.5 py-1 rounded-full w-fit', cat.bg)}>
                <span className={cn('text-[0.6875rem] font-semibold capitalize', cat.text)}>{head.category}</span>
              </div>

              {/* Amount */}
              <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">{fmt(head.amount)}</span>

              {/* Type */}
              <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md w-fit', head.type === 'recurring' ? 'bg-violet-50' : 'bg-slate-50')}>
                {head.type === 'recurring' ? <Repeat className="w-3 h-3 text-violet-600" /> : <Zap className="w-3 h-3 text-slate-500" />}
                <span className={cn('text-[0.625rem] font-semibold', head.type === 'recurring' ? 'text-violet-600' : 'text-slate-500')}>
                  {head.type === 'recurring' ? 'Recurring' : 'One-time'}
                </span>
              </div>

              {/* Toggle */}
              <button onClick={() => handleToggle(head.id)} className="flex items-center">
                {head.enabled
                  ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                  : <ToggleLeft className="w-7 h-7 text-[var(--text-ghost)]" />
                }
              </button>

              {/* Edit */}
              <button onClick={() => openEdit(head)} className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all">
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(head)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} of {heads.length} fee heads</p>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editingHead ? 'Edit Fee Head' : 'Add Fee Head'} description="Define fee name, category, amount, and billing type"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave}>{editingHead ? 'Save Changes' : 'Add Fee Head'}</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fee Head Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Science Lab Fee" />
            <Input label="Short Code" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. SCI" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={categoryOptions} value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
            <Input label="Amount (INR)" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="e.g. 3000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Billing Type" options={typeOptions} value={formType} onChange={(e) => setFormType(e.target.value)} />
            {formType === 'recurring' && <Select label="Frequency" options={frequencyOptions} value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)} />}
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formTaxable} onChange={(e) => setFormTaxable(e.target.checked)} className="w-4 h-4 rounded accent-[#002c98]" />
            <span className="text-[0.8125rem] text-[var(--text-secondary)]">Taxable (GST applicable)</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
