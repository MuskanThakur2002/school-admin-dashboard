import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, FileText, IndianRupee, Calendar, ChevronRight, Layers, CalendarClock,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';
import { useAcademicStore } from '@/stores/academic.store';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { FeeEngineNav } from '@/modules/fee-engine/components/FeeEngineNav';
import type { FeeStructure } from '@/types/fee.types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const itemsTotal = (s: FeeStructure): number =>
  s.feeStructureItems.reduce((sum, it) => sum + Number(it.amount || 0), 0);

export default function FeeStructurePage() {
  const structures = useFeeStore((s) => s.structures);
  const structuresPage = useFeeStore((s) => s.structuresPage);
  const structuresLimit = useFeeStore((s) => s.structuresLimit);
  const structuresTotal = useFeeStore((s) => s.structuresTotal);
  const heads = useFeeStore((s) => s.heads);
  const loading = useFeeStore((s) => s.loading);
  const fetchStructures = useFeeStore((s) => s.fetchStructures);
  const fetchHeads = useFeeStore((s) => s.fetchHeads);
  const createStructure = useFeeStore((s) => s.createStructure);
  const updateStructure = useFeeStore((s) => s.updateStructure);
  const deleteStructure = useFeeStore((s) => s.deleteStructure);
  const createItem = useFeeStore((s) => s.createItem);
  const deleteItem = useFeeStore((s) => s.deleteItem);
  const createInstallment = useFeeStore((s) => s.createInstallment);
  const deleteInstallment = useFeeStore((s) => s.deleteInstallment);

  const years = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);

  const showToast = useUIStore((s) => s.showToast);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  useEffect(() => {
    fetchStructures(1, 25);
    // Heads are also used to populate the "Add fee head" dropdown in the
    // structure detail panel — fetch a generous page so most schools see
    // everything without paging within the dropdown.
    fetchHeads(1, 100);
    if (years.length === 0) fetchYears();
  }, [fetchStructures, fetchHeads, fetchYears, years.length]);

  const selected = useMemo(
    () => structures.find((s) => s.id === selectedId) ?? null,
    [structures, selectedId],
  );

  const yearById = useMemo(() => {
    const m = new Map<string, string>();
    years.forEach((y) => m.set(y.id, y.name));
    return m;
  }, [years]);

  const headById = useMemo(() => {
    const m = new Map<string, string>();
    heads.forEach((h) => m.set(h.id, h.name));
    return m;
  }, [heads]);

  const totalItemsAcross = structures.reduce((sum, s) => sum + s.feeStructureItems.length, 0);
  const totalRevenue = structures.reduce((sum, s) => sum + itemsTotal(s), 0);

  const handleDeleteStructure = async (e: React.MouseEvent, s: FeeStructure) => {
    e.stopPropagation();
    if (!confirm(`Delete fee structure "${s.name}"?`)) return;
    try {
      await deleteStructure(s.id);
      if (selectedId === s.id) setSelectedId(null);
      showToast({ type: 'info', title: 'Structure removed', message: s.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete structure.';
      showToast({ type: 'error', title: 'Delete failed', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <FeeEngineNav description="A structure is a bundle of fee heads with amounts, tied to one academic year. It defines what a student owes (line items) and when it's due (installments). Structures get applied to students via assignments." />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Fee Structures</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Bundle fee heads into structures, each tied to an academic year</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Structure
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Structures', value: structures.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Line Items', value: totalItemsAcross, icon: Layers, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Combined Value', value: fmt(totalRevenue), icon: IndianRupee, color: 'bg-violet-50 text-violet-600' },
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
      {loading && structures.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading fee structures...</p>
        </div>
      ) : structures.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <FileText className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
          <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No fee structures yet</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Create your first structure to start bundling fee heads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {structures.map((structure) => {
            const isSelected = selectedId === structure.id;
            const total = itemsTotal(structure);
            const yearName = yearById.get(structure.academicYearId) ?? structure.academicYearId.slice(0, 8);
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
                {/* Delete */}
                <button
                  onClick={(e) => handleDeleteStructure(e, structure)}
                  className="absolute top-3 right-3 p-1.5 rounded-md text-[var(--text-ghost)] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete structure"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Icon + title */}
                <div className="flex items-center gap-3 mb-4 pr-8">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-[#002c98] to-[#3b6cf5] shadow-[0_2px_6px_rgba(0,44,152,0.25)]">
                    <FileText className="w-[18px] h-[18px] text-white" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] truncate">{structure.name}</h3>
                    <span className="flex items-center gap-1 text-[0.6875rem] text-[var(--text-muted)] mt-0.5">
                      <Calendar className="w-3 h-3" /> {yearName}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                    <p className="font-display text-[1rem] font-extrabold text-[#002c98] tracking-[-0.02em] leading-none">{fmt(total)}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Line Total</p>
                  </div>
                  <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                    <p className="font-display text-[1rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{structure.feeStructureItems.length}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Items</p>
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
      )}

      {/* Pagination */}
      {structuresTotal > 0 && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
          <Pagination
            page={structuresPage}
            limit={structuresLimit}
            total={structuresTotal}
            onPageChange={(p) => fetchStructures(p, structuresLimit)}
            onLimitChange={(l) => fetchStructures(1, l)}
            label="structures"
          />
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <StructureDetail
          structure={selected}
          yearName={yearById.get(selected.academicYearId) ?? '—'}
          heads={heads}
          headById={headById}
          onEdit={() => setEditingStructure(selected)}
          onAddItem={async (feeHeadId, amount) => {
            try {
              await createItem({ feeStructureId: selected.id, feeHeadId, amount });
              showToast({ type: 'success', title: 'Fee head added', message: 'Line item created' });
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Could not add item.';
              showToast({ type: 'error', title: 'Add failed', message });
              throw err;
            }
          }}
          onDeleteItem={async (itemId) => {
            try {
              await deleteItem(selected.id, itemId);
              showToast({ type: 'info', title: 'Item removed', message: 'Line item deleted' });
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Could not delete item.';
              showToast({ type: 'error', title: 'Delete failed', message });
            }
          }}
          onAddInstallment={async (dueDate, amount) => {
            try {
              await createInstallment({ feeStructureId: selected.id, dueDate, amount });
              showToast({ type: 'success', title: 'Installment added', message: 'Schedule updated' });
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Could not add installment.';
              showToast({ type: 'error', title: 'Add failed', message });
              throw err;
            }
          }}
          onDeleteInstallment={async (installmentId) => {
            try {
              await deleteInstallment(selected.id, installmentId);
              showToast({ type: 'info', title: 'Installment removed', message: 'Schedule updated' });
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Could not delete installment.';
              showToast({ type: 'error', title: 'Delete failed', message });
            }
          }}
        />
      )}

      {/* Create modal */}
      <StructureFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        years={years}
        onSubmit={async (name, academicYearId) => {
          const created = await createStructure({ name, academicYearId });
          setSelectedId(created.id);
          showToast({ type: 'success', title: 'Structure created', message: name });
        }}
      />

      {/* Edit modal */}
      <StructureFormModal
        open={!!editingStructure}
        onOpenChange={(o) => !o && setEditingStructure(null)}
        years={years}
        initial={editingStructure ? { name: editingStructure.name, academicYearId: editingStructure.academicYearId } : undefined}
        onSubmit={async (name, academicYearId) => {
          if (!editingStructure) return;
          await updateStructure(editingStructure.id, { name, academicYearId });
          showToast({ type: 'success', title: 'Structure updated', message: name });
          setEditingStructure(null);
        }}
      />
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────

interface StructureDetailProps {
  structure: FeeStructure;
  yearName: string;
  heads: { id: string; name: string }[];
  headById: Map<string, string>;
  onEdit: () => void;
  onAddItem: (feeHeadId: string, amount: number) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onAddInstallment: (dueDate: string, amount: number) => Promise<void>;
  onDeleteInstallment: (installmentId: string) => Promise<void>;
}

function StructureDetail({
  structure,
  yearName,
  heads,
  headById,
  onEdit,
  onAddItem,
  onDeleteItem,
  onAddInstallment,
  onDeleteInstallment,
}: StructureDetailProps) {
  const [headId, setHeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const items = structure.feeStructureItems;
  const total = items.reduce((s, it) => s + Number(it.amount || 0), 0);

  // Heads not yet attached to this structure
  const availableHeads = heads.filter((h) => !items.some((it) => it.feeHeadId === h.id));
  const headOptions = [
    { label: 'Select fee head...', value: '' },
    ...availableHeads.map((h) => ({ label: h.name, value: h.id })),
  ];

  const handleAdd = async () => {
    const numAmount = Number(amount);
    if (!headId || Number.isNaN(numAmount) || adding) return;
    setAdding(true);
    try {
      await onAddItem(headId, numAmount);
      setHeadId('');
      setAmount('');
    } catch {
      // toast already shown by parent
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h2 className="text-[1.0625rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{structure.name}</h2>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mt-0.5">
            {yearName} &middot; {items.length} line {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
            <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit
          </button>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[3fr_1.5fr_0.4fr] gap-4 px-6 py-3 bg-[var(--card-bg-hover)]">
        <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">Fee Head</span>
        <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] text-right">Amount</span>
        <span />
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-[0.8125rem] text-[var(--text-muted)]">No fee heads attached yet.</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Add one below to start building this structure.</p>
        </div>
      ) : (
        items.map((item, idx) => {
          const amt = Number(item.amount || 0);
          const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
          const name = item.feeHead?.name ?? headById.get(item.feeHeadId) ?? item.feeHeadId.slice(0, 8);
          return (
            <div
              key={item.id}
              className={cn(
                'grid grid-cols-[3fr_1.5fr_0.4fr] gap-4 items-center px-6 py-3.5',
                idx < items.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-[0.8125rem] text-[var(--text-secondary)]">{name}</span>
                <div className="hidden md:flex items-center gap-2 flex-1 max-w-[160px]">
                  <div className="flex-1 h-[4px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#002c98]/20" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[0.625rem] text-[var(--text-ghost)] font-medium w-8 text-right">{pct}%</span>
                </div>
              </div>
              <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)] text-right">{fmt(amt)}</span>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1.5 rounded-md text-[var(--text-ghost)] hover:text-red-500 hover:bg-red-50 transition-colors justify-self-end"
                aria-label="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })
      )}

      {/* Total row */}
      {items.length > 0 && (
        <div className="grid grid-cols-[3fr_1.5fr_0.4fr] gap-4 px-6 py-4 bg-[#f0f4ff]">
          <span className="text-[0.875rem] font-bold text-[var(--text-primary)]">Total</span>
          <span className="font-display text-[1.0625rem] font-extrabold text-[#002c98] text-right">{fmt(total)}</span>
          <span />
        </div>
      )}

      {/* Add item row */}
      <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--card-bg-hover)]">
        <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Add fee head</p>
        <div className="grid grid-cols-[3fr_1.5fr_auto] gap-3 items-end">
          <Select
            label="Fee head"
            options={headOptions}
            value={headId}
            onChange={(e) => setHeadId(e.target.value)}
          />
          <Input
            label="Amount (INR)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <Button onClick={handleAdd} loading={adding} disabled={!headId || amount === ''}>
            Add
          </Button>
        </div>
        {availableHeads.length === 0 && heads.length > 0 && (
          <p className="text-[0.6875rem] text-[var(--text-ghost)] mt-2">All fee heads have been attached to this structure.</p>
        )}
        {heads.length === 0 && (
          <p className="text-[0.6875rem] text-[var(--text-ghost)] mt-2">No fee heads exist yet — create some in the Fee Heads page first.</p>
        )}
      </div>

      {/* Schedule section */}
      <InstallmentSection
        installments={structure.feeInstallments}
        onAdd={onAddInstallment}
        onDelete={onDeleteInstallment}
      />
    </div>
  );
}

// ─── Installments section ─────────────────────────────────────

interface InstallmentSectionProps {
  installments: FeeStructure['feeInstallments'];
  onAdd: (dueDate: string, amount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function InstallmentSection({ installments, onAdd, onDelete }: InstallmentSectionProps) {
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [adding, setAdding] = useState(false);

  // Chronological order — backend doesn't guarantee one.
  const sorted = useMemo(
    () => [...installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [installments],
  );
  const total = sorted.reduce((s, i) => s + Number(i.amount || 0), 0);

  const handleAdd = async () => {
    const numAmount = Number(amount);
    if (!dueDate || Number.isNaN(numAmount) || adding) return;
    setAdding(true);
    try {
      await onAdd(dueDate, numAmount);
      setDueDate('');
      setAmount('');
    } catch {
      // toast already shown by parent
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)]">Schedule</h3>
          <span className="text-[0.75rem] text-[var(--text-muted)]">
            &middot; {sorted.length} {sorted.length === 1 ? 'installment' : 'installments'}
          </span>
        </div>
        {sorted.length > 0 && (
          <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">
            Total: {fmt(total)}
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2fr_1.5fr_0.4fr] gap-4 px-6 py-3 bg-[var(--card-bg-hover)]">
        <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">Due Date</span>
        <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] text-right">Amount</span>
        <span />
      </div>

      {/* Rows */}
      {sorted.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-[0.8125rem] text-[var(--text-muted)]">No installments scheduled yet.</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Add one below to define when payments are due.</p>
        </div>
      ) : (
        sorted.map((inst, idx) => (
          <div
            key={inst.id}
            className={cn(
              'grid grid-cols-[2fr_1.5fr_0.4fr] gap-4 items-center px-6 py-3.5',
              idx < sorted.length - 1 && 'border-b border-[var(--border-subtle)]',
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={2} />
              <span className="text-[0.8125rem] text-[var(--text-secondary)]">{inst.dueDate}</span>
            </div>
            <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)] text-right">
              {fmt(Number(inst.amount || 0))}
            </span>
            <button
              onClick={() => onDelete(inst.id)}
              className="p-1.5 rounded-md text-[var(--text-ghost)] hover:text-red-500 hover:bg-red-50 transition-colors justify-self-end"
              aria-label="Remove installment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}

      {/* Add installment row */}
      <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--card-bg-hover)]">
        <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Add installment</p>
        <div className="grid grid-cols-[2fr_1.5fr_auto] gap-3 items-end">
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            label="Amount (INR)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <Button onClick={handleAdd} loading={adding} disabled={!dueDate || amount === ''}>
            Add
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────

interface StructureFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  years: { id: string; name: string }[];
  initial?: { name: string; academicYearId: string };
  onSubmit: (name: string, academicYearId: string) => Promise<void>;
}

function StructureFormModal({
  open,
  onOpenChange,
  years,
  initial,
  onSubmit,
}: StructureFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [academicYearId, setAcademicYearId] = useState(initial?.academicYearId ?? '');
  const [saving, setSaving] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  // Reset form fields whenever the modal opens (with initial values for edit).
  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setAcademicYearId(initial?.academicYearId ?? '');
    }
  }, [open, initial?.name, initial?.academicYearId]);

  const yearOptions = [
    { label: 'Select academic year...', value: '' },
    ...years.map((y) => ({ label: y.name, value: y.id })),
  ];

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !academicYearId || saving) return;
    setSaving(true);
    try {
      await onSubmit(trimmed, academicYearId);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save structure.';
      showToast({ type: 'error', title: 'Save failed', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Edit Fee Structure' : 'Create Fee Structure'}
      description="Bundle fee heads under an academic year. Items are added after creation."
      footer={
        <>
          <Button variant="tertiary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!name.trim() || !academicYearId}>
            {initial ? 'Save Changes' : 'Create Structure'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Structure Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Class 10 Standard"
        />
        <Select
          label="Academic Year *"
          options={yearOptions}
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
        />
        {years.length === 0 && (
          <p className="text-[0.6875rem] text-amber-600">
            No academic years available. Create one in Academic Setup first.
          </p>
        )}
      </div>
    </Modal>
  );
}
