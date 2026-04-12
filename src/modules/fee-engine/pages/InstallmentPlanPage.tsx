import { useState, useEffect } from 'react';
import { Plus, Pencil, CheckCircle2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';

const fmt = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function InstallmentPlanPage() {
  const plans = useFeeStore((s) => s.plans);
  const fetchPlans = useFeeStore((s) => s.fetchPlans);

  const [selectedId, setSelectedId] = useState<string>('1');
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (plans.length === 0) fetchPlans();
  }, [plans.length, fetchPlans]);

  const selected = plans.find((p) => p.id === selectedId);
  const exampleTotal = 87200;

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Installment Plans</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Define payment schedules for fee structures</p>
        </div>
        <button onClick={() => showToast({ type: 'info', title: 'Coming soon', message: 'Plan builder will be available in the next update' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Create Plan
        </button>
      </div>

      {/* Plan selector tabs */}
      <div className="flex gap-2.5 mb-8 overflow-x-auto pb-2">
        {plans.map((plan) => (
          <button key={plan.id} onClick={() => setSelectedId(plan.id)}
            className={cn(
              'flex-shrink-0 px-5 py-4 rounded-xl text-left transition-all min-w-[200px] relative',
              selectedId === plan.id
                ? 'bg-gradient-to-br from-[#002c98] to-[#3b6cf5] text-white shadow-[0_4px_16px_rgba(0,44,152,0.3)]'
                : 'bg-[var(--card-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[var(--text-primary)]',
            )}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[0.875rem] font-bold">{plan.name}</span>
              {plan.isDefault && (
                <span className={cn('px-1.5 py-0.5 rounded-md text-[0.5625rem] font-bold tracking-wide', selectedId === plan.id ? 'bg-[var(--card-bg)]/20 text-white' : 'bg-amber-50 text-amber-600')}>
                  DEFAULT
                </span>
              )}
            </div>
            <span className={cn('text-[0.75rem]', selectedId === plan.id ? 'text-white/70' : 'text-[var(--text-muted)]')}>
              {plan.installments.length} installment{plan.installments.length !== 1 ? 's' : ''}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Schedule */}
          <div className="xl:col-span-2 bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[1.0625rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{selected.name}</h2>
                <p className="text-[0.8125rem] text-[var(--text-muted)] mt-0.5">{selected.description}</p>
              </div>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit
              </button>
            </div>

            <div className="space-y-2">
              {selected.installments.map((inst, idx) => {
                const amount = Math.round(exampleTotal * inst.percentage / 100);
                return (
                  <div key={inst.label} className={cn('flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-[var(--card-bg-hover)] transition-colors',
                    idx < selected.installments.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_2px_4px_rgba(0,44,152,0.2)]">
                      <span className="text-white text-[0.6875rem] font-bold">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{inst.label}</p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> Due: {format(parseISO(inst.dueDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[0.9375rem] font-extrabold text-[var(--text-primary)]">{fmt(amount)}</p>
                      <p className="text-[0.625rem] text-[var(--text-muted)] font-medium">{inst.percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 px-5 py-3.5 bg-[#f0f4ff] rounded-xl">
              <span className="text-[0.875rem] font-bold text-[var(--text-primary)]">Total</span>
              <span className="font-display text-[1.0625rem] font-extrabold text-[#002c98]">{fmt(exampleTotal)}</span>
            </div>
          </div>

          {/* Info sidebar */}
          <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em] mb-5">Plan Details</h3>
            <div className="space-y-5">
              <div>
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2">Linked Structures</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.linkedStructures.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-[#f0f4ff] text-[0.6875rem] font-semibold text-[#002c98]">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Installments</p>
                <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)]">{selected.installments.length}</p>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Example (Middle School)</p>
                <p className="font-display text-[1.25rem] font-extrabold text-[#002c98]">{fmt(exampleTotal)}</p>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Default Plan</p>
                <div className="flex items-center gap-1.5">
                  {selected.isDefault ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.5} /> <span className="text-[0.8125rem] font-semibold text-emerald-700">Yes</span></>
                  ) : (
                    <span className="text-[0.8125rem] text-[var(--text-tertiary)]">No</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
