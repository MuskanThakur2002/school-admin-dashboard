import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Copy,
  CheckCircle2,
  FileText,
  Users,
  IndianRupee,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';
// ─── Helpers ─────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

// ─── Component ───────────────────────────────────────────────

export default function FeeStructurePage() {
  const structures = useFeeStore((s) => s.structures);
  const fetchStructures = useFeeStore((s) => s.fetchStructures);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (structures.length === 0) fetchStructures();
  }, [structures.length, fetchStructures]);

  const selected = structures.find((s) => s.id === selectedId);
  const totalRevenue = structures.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.totalAmount * s.studentCount, 0);

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Fee Structures</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Define fee structures per academic year and class group</p>
        </div>
        <button
          onClick={() => showToast({ type: 'info', title: 'Coming soon', message: 'Fee structure builder will be available in the next update' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Structure
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Structures', value: structures.filter((s) => s.status === 'active').length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Students Covered', value: structures.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.studentCount, 0), icon: Users, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Est. Annual Revenue', value: fmt(totalRevenue), icon: IndianRupee, color: 'bg-violet-50 text-violet-600' },
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

      {/* Structure cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {structures.map((structure) => {
          const isSelected = selectedId === structure.id;
          const isActive = structure.status === 'active';
          return (
            <div
              key={structure.id}
              onClick={() => setSelectedId(isSelected ? null : structure.id)}
              className={cn(
                'bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-all relative group',
                'hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5',
                isSelected && 'shadow-[0_0_0_2px_rgba(0,44,152,0.2),_0_4px_16px_rgba(0,0,0,0.06)]',
              )}
            >
              {/* Status indicator */}
              {isActive && (
                <CheckCircle2 className="absolute top-4 right-4 w-4.5 h-4.5 text-emerald-500" strokeWidth={2.5} />
              )}

              {/* Icon + title */}
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  isActive ? 'bg-gradient-to-br from-[#002c98] to-[#3b6cf5] shadow-[0_2px_6px_rgba(0,44,152,0.25)]' : 'bg-[var(--border-subtle)]',
                )}>
                  <FileText className={cn('w-[18px] h-[18px]', isActive ? 'text-white' : 'text-[var(--text-muted)]')} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] truncate">{structure.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold',
                      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500',
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                      {structure.status}
                    </div>
                    <span className="flex items-center gap-1 text-[0.6875rem] text-[var(--text-muted)]">
                      <Calendar className="w-3 h-3" /> {structure.academicYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Classes */}
              <div className="flex flex-wrap gap-1 mb-4">
                {structure.classes.slice(0, 6).map((cls) => (
                  <span key={cls} className="px-2 py-0.5 rounded-md bg-[var(--border-subtle)] text-[0.625rem] font-semibold text-[var(--text-tertiary)]">{cls}</span>
                ))}
                {structure.classes.length > 6 && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[0.625rem] font-bold text-blue-600">+{structure.classes.length - 6}</span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                  <p className="font-display text-[1rem] font-extrabold text-[#002c98] tracking-[-0.02em] leading-none">{fmt(structure.totalAmount)}</p>
                  <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Per Student</p>
                </div>
                <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                  <p className="font-display text-[1rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{structure.studentCount}</p>
                  <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Students</p>
                </div>
              </div>

              {/* Expand hint */}
              <div className={cn(
                'flex items-center justify-center gap-1 mt-3 pt-3 text-[0.6875rem] font-medium transition-colors',
                isSelected ? 'text-[#002c98]' : 'text-[var(--text-ghost)] group-hover:text-[var(--text-muted)]',
              )}>
                {isSelected ? 'Click to collapse' : 'View breakdown'}
                <ChevronRight className={cn('w-3 h-3 transition-transform', isSelected && 'rotate-90')} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel — fee breakdown */}
      {selected && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h2 className="text-[1.0625rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{selected.name}</h2>
              <p className="text-[0.8125rem] text-[var(--text-muted)] mt-0.5">Fee breakdown for {selected.academicYear} &middot; {selected.heads.length} fee heads</p>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                <Copy className="w-3.5 h-3.5" strokeWidth={2} /> Duplicate
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit
              </button>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[3fr_1.5fr] gap-4 px-6 py-3 bg-[var(--card-bg-hover)]">
            <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">Fee Head</span>
            <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] text-right">Amount</span>
          </div>

          {/* Rows */}
          {selected.heads.map((head, idx) => {
            const pct = Math.round((head.amount / selected.totalAmount) * 100);
            return (
              <div
                key={head.feeHeadName}
                className={cn(
                  'grid grid-cols-[3fr_1.5fr] gap-4 items-center px-6 py-3.5',
                  idx < selected.heads.length - 1 && 'border-b border-[var(--border-subtle)]',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[0.8125rem] text-[var(--text-secondary)]">{head.feeHeadName}</span>
                  {/* Proportion bar */}
                  <div className="hidden md:flex items-center gap-2 flex-1 max-w-[160px]">
                    <div className="flex-1 h-[4px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#002c98]/20" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[0.625rem] text-[var(--text-ghost)] font-medium w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)] text-right">{fmt(head.amount)}</span>
              </div>
            );
          })}

          {/* Total row */}
          <div className="grid grid-cols-[3fr_1.5fr] gap-4 px-6 py-4 bg-[#f0f4ff]">
            <span className="text-[0.875rem] font-bold text-[var(--text-primary)]">Total Annual Fee</span>
            <span className="font-display text-[1.0625rem] font-extrabold text-[#002c98] text-right">{fmt(selected.totalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
