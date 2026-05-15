import { useState, useEffect } from 'react';
import { Plus, Trash2, Wallet, Pencil, Search, X, IndianRupee } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useFeeStore } from '@/stores/fee.store';
import type { FeeHead } from '@/types/fee.types';

export default function FeeHeadsPage() {
  const heads = useFeeStore((s) => s.heads);
  const loading = useFeeStore((s) => s.loading);
  const fetchHeads = useFeeStore((s) => s.fetchHeads);
  const createHead = useFeeStore((s) => s.createHead);
  const updateHead = useFeeStore((s) => s.updateHead);
  const deleteHead = useFeeStore((s) => s.deleteHead);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<FeeHead | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    fetchHeads();
  }, [fetchHeads]);

  const filtered = heads.filter(
    (h) => !search || h.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditingHead(null);
    setFormName('');
    setModalOpen(true);
  };

  const openEdit = (head: FeeHead) => {
    setEditingHead(head);
    setFormName(head.name);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      if (editingHead) {
        await updateHead(editingHead.id, { name });
        showToast({ type: 'success', title: 'Fee head updated', message: name });
      } else {
        await createHead({ name });
        showToast({ type: 'success', title: 'Fee head created', message: name });
      }
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save fee head.';
      showToast({ type: 'error', title: 'Operation failed', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (head: FeeHead) => {
    if (!confirm(`Delete fee head "${head.name}"?`)) return;
    try {
      await deleteHead(head.id);
      showToast({ type: 'info', title: 'Fee head removed', message: head.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete fee head.';
      showToast({ type: 'error', title: 'Delete failed', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Fee Heads</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Define the individual fee components used across structures</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Fee Head
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Total Fee Heads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{heads.length}</p>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Showing</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Search className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{filtered.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fee heads..."
          className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[3fr_0.5fr_0.5fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Fee Head', '', ''].map((h, i) => (
            <span key={i} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading fee heads...</p>
          </div>
        )}

        {!loading && filtered.map((head, idx) => (
          <div
            key={head.id}
            className={cn(
              'grid grid-cols-[3fr_0.5fr_0.5fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)]',
              idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <IndianRupee className="w-4 h-4 text-blue-600" strokeWidth={2} />
              </div>
              <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{head.name}</p>
            </div>

            <button onClick={() => openEdit(head)} className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all justify-self-end">
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button onClick={() => handleDelete(head)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all justify-self-end">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Wallet className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No fee heads found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">{search ? 'Try adjusting your search' : 'Add your first fee head to get started'}</p>
          </div>
        )}

        <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} of {heads.length} fee heads</p>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingHead ? 'Edit Fee Head' : 'Add Fee Head'}
        description="Defines a reusable fee component (e.g. Tuition Fee, Library Fee)"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!formName.trim()}>
              {editingHead ? 'Save Changes' : 'Add Fee Head'}
            </Button>
          </>
        }
      >
        <Input label="Fee Head Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Tuition Fee" />
      </Modal>
    </div>
  );
}
