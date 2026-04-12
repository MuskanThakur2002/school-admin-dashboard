import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';
import type { LateFeeRule } from '@/types/fee.types';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const penaltyTypeOptions = [{ label: 'Flat Amount', value: 'flat' }, { label: 'Percentage of Due', value: 'percentage' }, { label: 'Per Day', value: 'per_day' }];

function fmtPenalty(r: LateFeeRule) {
  if (r.penaltyType === 'flat') return fmt(r.penaltyValue);
  if (r.penaltyType === 'percentage') return `${r.penaltyValue}% of due`;
  return `${fmt(r.penaltyValue)} / day`;
}

export default function LateFeeConfigPage() {
  const rules = useFeeStore((s) => s.rules);
  const fetchRules = useFeeStore((s) => s.fetchRules);
  const createRule = useFeeStore((s) => s.createRule);
  const toggleRule = useFeeStore((s) => s.toggleRule);
  const deleteRule = useFeeStore((s) => s.deleteRule);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formGrace, setFormGrace] = useState('7');
  const [formPenaltyType, setFormPenaltyType] = useState('flat');
  const [formPenaltyValue, setFormPenaltyValue] = useState('');
  const [formMaxPenalty, setFormMaxPenalty] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (rules.length === 0) fetchRules();
  }, [rules.length, fetchRules]);

  const handleToggle = async (id: string) => {
    try {
      await toggleRule(id);
    } catch {
      showToast({ type: 'error', title: 'Toggle failed', message: 'Could not toggle rule status.' });
    }
  };

  const handleAdd = async () => {
    if (!formName || !formPenaltyValue) return;
    try {
      await createRule({
        name: formName,
        graceDays: Number(formGrace),
        penaltyType: formPenaltyType as LateFeeRule['penaltyType'],
        penaltyValue: Number(formPenaltyValue),
        maxPenalty: formMaxPenalty ? Number(formMaxPenalty) : undefined,
      });
      showToast({ type: 'success', title: 'Late fee rule created', message: formName });
      setModalOpen(false); setFormName(''); setFormPenaltyValue(''); setFormMaxPenalty('');
    } catch {
      showToast({ type: 'error', title: 'Creation failed', message: 'Could not create late fee rule. Please try again.' });
    }
  };

  const handleDelete = async (rule: LateFeeRule) => {
    try {
      await deleteRule(rule.id);
      showToast({ type: 'info', title: 'Rule removed', message: rule.name });
    } catch {
      showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete rule.' });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Late Fee Configuration</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Define penalty rules for overdue fee payments</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Rule
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50/50 rounded-2xl p-5 mb-8 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-[18px] h-[18px] text-amber-600" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] mb-0.5">How late fees work</h3>
          <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
            When a fee installment is not paid within the grace period, the system automatically calculates and applies the penalty
            to the student's ledger. Multiple rules can be active — the system applies the first matching rule based on overdue days.
          </p>
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className={cn('bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all', !rule.enabled && 'opacity-40')}>
            <div className="flex items-center gap-5">
              {/* Toggle */}
              <button onClick={() => handleToggle(rule.id)} className="shrink-0">
                {rule.enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-[var(--text-ghost)]" />}
              </button>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{rule.name}</h3>
                  <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold',
                    rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', rule.enabled ? 'bg-emerald-500' : 'bg-slate-400')} />
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
                  After <span className="font-semibold text-[var(--text-secondary)]">{rule.graceDays} days</span> grace period,
                  apply <span className="font-semibold text-[var(--text-secondary)]">{fmtPenalty(rule)}</span>
                  {rule.maxPenalty && <> (max {fmt(rule.maxPenalty)})</>}
                </p>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-6 shrink-0">
                <div className="text-center px-3">
                  <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1 flex items-center gap-1 justify-center"><Clock className="w-3 h-3" /> Grace</p>
                  <p className="font-display text-[1rem] font-extrabold text-[var(--text-primary)]">{rule.graceDays}d</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Penalty</p>
                  <p className="font-display text-[1rem] font-extrabold text-amber-600">{fmtPenalty(rule)}</p>
                </div>
                {rule.maxPenalty && (
                  <div className="text-center px-3">
                    <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Max Cap</p>
                    <p className="font-display text-[1rem] font-extrabold text-[var(--text-primary)]">{fmt(rule.maxPenalty)}</p>
                  </div>
                )}
              </div>

              {/* Delete */}
              <button onClick={() => handleDelete(rule)} className="p-2 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Late Fee Rule" description="Define a new penalty rule for overdue payments"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Create Rule</Button></>}>
        <div className="space-y-4">
          <Input label="Rule Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Monthly Overdue Penalty" />
          <Input label="Grace Period (days)" type="number" value={formGrace} onChange={(e) => setFormGrace(e.target.value)} placeholder="e.g. 7" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Penalty Type" options={penaltyTypeOptions} value={formPenaltyType} onChange={(e) => setFormPenaltyType(e.target.value)} />
            <Input label={formPenaltyType === 'percentage' ? 'Percentage' : 'Amount (INR)'} type="number" value={formPenaltyValue} onChange={(e) => setFormPenaltyValue(e.target.value)} placeholder={formPenaltyType === 'percentage' ? 'e.g. 2' : 'e.g. 500'} />
          </div>
          <Input label="Max Penalty Cap (INR, optional)" type="number" value={formMaxPenalty} onChange={(e) => setFormMaxPenalty(e.target.value)} placeholder="e.g. 5000" />
        </div>
      </Modal>
    </div>
  );
}
