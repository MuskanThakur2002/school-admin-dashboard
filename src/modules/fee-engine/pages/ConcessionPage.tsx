import { useState, useEffect } from 'react';
import { Plus, Trash2, Percent, IndianRupee, Users, Tag } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';
import type { Concession } from '@/types/fee.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const typeOptions = [{ label: 'Percentage', value: 'percentage' }, { label: 'Flat Amount', value: 'flat' }];

export default function ConcessionPage() {
  const concessions = useFeeStore((s) => s.concessions);
  const fetchConcessions = useFeeStore((s) => s.fetchConcessions);
  const createConcession = useFeeStore((s) => s.createConcession);
  const deleteConcession = useFeeStore((s) => s.deleteConcession);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('percentage');
  const [formValue, setFormValue] = useState('');
  const [formReason, setFormReason] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (concessions.length === 0) fetchConcessions();
  }, [concessions.length, fetchConcessions]);

  const handleAdd = async () => {
    if (!formName || !formValue) return;
    try {
      await createConcession({
        name: formName,
        type: formType as Concession['type'],
        value: Number(formValue),
        applicableTo: 'All Fee Heads',
        reason: formReason,
      });
      showToast({ type: 'success', title: 'Concession created', message: formName });
      setModalOpen(false); setFormName(''); setFormValue(''); setFormReason('');
    } catch {
      showToast({ type: 'error', title: 'Creation failed', message: 'Could not create concession. Please try again.' });
    }
  };

  const handleDelete = async (c: Concession) => {
    try {
      await deleteConcession(c.id);
      showToast({ type: 'info', title: 'Concession removed', message: c.name });
    } catch {
      showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete concession.' });
    }
  };

  const totalBeneficiaries = concessions.reduce((sum, c) => sum + c.studentCount, 0);
  const avgDiscount = Math.round(concessions.filter((c) => c.type === 'percentage').reduce((s, c) => s + c.value, 0) / (concessions.filter((c) => c.type === 'percentage').length || 1));

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Concessions & Scholarships</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage fee waivers, discounts, and scholarship programs</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Concession
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Concessions', value: concessions.length, icon: Tag, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Beneficiaries', value: totalBeneficiaries, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Avg. Discount', value: `${avgDiscount}%`, icon: Percent, color: 'bg-violet-50 text-violet-600' },
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

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {concessions.map((c) => (
          <div key={c.id} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all relative group">
            <button onClick={() => handleDelete(c)} className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.type === 'percentage' ? 'bg-violet-50' : 'bg-emerald-50')}>
                {c.type === 'percentage' ? <Percent className="w-[18px] h-[18px] text-violet-600" strokeWidth={2} /> : <IndianRupee className="w-[18px] h-[18px] text-emerald-600" strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] truncate">{c.name}</h3>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[0.625rem] font-bold mt-0.5',
                  c.type === 'percentage' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700',
                )}>{c.type === 'percentage' ? `${c.value}% off` : fmt(c.value)}</span>
              </div>
            </div>

            <p className="text-[0.75rem] text-[var(--text-tertiary)] leading-relaxed mb-4">{c.reason}</p>

            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--border-subtle)] text-[0.6875rem] font-semibold text-[var(--text-tertiary)]">{c.applicableTo}</span>
              <div className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--text-muted)] font-medium">
                <Users className="w-3 h-3" /> {c.studentCount}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Concession" description="Create a new fee concession or scholarship"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Create Concession</Button></>}>
        <div className="space-y-4">
          <Input label="Concession Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Single Parent Discount" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Discount Type" options={typeOptions} value={formType} onChange={(e) => setFormType(e.target.value)} />
            <Input label={formType === 'percentage' ? 'Percentage' : 'Amount (INR)'} type="number" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder={formType === 'percentage' ? 'e.g. 15' : 'e.g. 5000'} />
          </div>
          <Input label="Reason / Criteria" value={formReason} onChange={(e) => setFormReason(e.target.value)} placeholder="Brief description of eligibility" />
        </div>
      </Modal>
    </div>
  );
}
