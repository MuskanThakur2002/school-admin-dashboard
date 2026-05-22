import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search, X, Phone, Users, Wallet, Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useParentStore, type CreateParentFlowDto } from '@/stores/parent.store';
import type { Parent } from '@/types/parent.types';
import { useUIStore } from '@/stores/ui.store';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Pagination } from '@/components/ui/Pagination/Pagination';

function formatIncome(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ParentListPage() {
  const navigate = useNavigate();
  const parents = useParentStore((s) => s.parents);
  const total = useParentStore((s) => s.total);
  const page = useParentStore((s) => s.page);
  const limit = useParentStore((s) => s.limit);
  const loading = useParentStore((s) => s.loading);
  const fetchParents = useParentStore((s) => s.fetchParents);
  const createParent = useParentStore((s) => s.createParent);
  const deleteParent = useParentStore((s) => s.deleteParent);

  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchParents(1, 10);
  }, [fetchParents]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return parents;
    const q = search.toLowerCase();
    return parents.filter((p) => {
      const name = p.user?.name?.toLowerCase() ?? '';
      const email = p.user?.email?.toLowerCase() ?? '';
      const phone = p.user?.phoneNumber?.toLowerCase() ?? '';
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [parents, search]);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete guardian ${name}?`)) return;
    try {
      await deleteParent(id);
      showToast({ type: 'info', title: 'Guardian deleted', message: name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      showToast({ type: 'error', title: 'Failed to delete guardian', message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Guardians</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{total} guardians on record</p>
        </div>
        <div className="flex gap-2.5">
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
            <Download className="w-4 h-4" strokeWidth={2} />
            Export
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Guardian
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Total Guardians</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{total}</p>
        </div>
        <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Showing</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Search className="w-4 h-4" strokeWidth={2} />
            </div>
          </div>
          <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{filteredData.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2.5fr_2fr_1.2fr_1.2fr_0.4fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Guardian', 'Email', 'Phone', 'Annual Income', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && (
          <div className="py-16 text-center">
            <p className="text-[0.875rem] text-[var(--text-muted)]">Loading guardians...</p>
          </div>
        )}

        {!loading && filteredData.map((parent, idx) => {
          const name = parent.user?.name ?? '—';
          const email = parent.user?.email ?? '—';
          const phone = parent.user?.phoneNumber ?? '—';
          const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('') || '?';
          return (
            <div
              key={parent.id}
              onClick={() => navigate(`/parents/${parent.id}`)}
              className={cn(
                'grid grid-cols-[2.5fr_2fr_1.2fr_1.2fr_0.4fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.625rem] font-bold">{initials}</span>
                </div>
                <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{name}</p>
              </div>

              <span className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{email}</span>

              <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
                <Phone className="w-3 h-3" strokeWidth={1.8} />
                <span>{phone}</span>
              </div>

              <div className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
                <Wallet className="w-3 h-3" strokeWidth={1.8} />
                <span>{formatIncome(parent.annualIncome)}</span>
              </div>

              <button
                onClick={(e) => handleDelete(e, parent.id, name)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors justify-self-end"
                aria-label="Delete guardian"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {!loading && filteredData.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No guardians found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">{search ? 'Try adjusting your search' : 'Add your first guardian to get started'}</p>
          </div>
        )}

        <Pagination
          page={page}
          limit={limit}
          total={total}
          onPageChange={(p) => fetchParents(p, limit)}
          onLimitChange={(l) => fetchParents(1, l)}
          pageSizeOptions={[10, 25, 50, 100]}
          label="guardians"
        />
      </div>

      <AddParentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreate={createParent}
        onSuccess={(name) => showToast({ type: 'success', title: 'Guardian added', message: name })}
        onError={(message) => showToast({ type: 'error', title: 'Failed to add guardian', message })}
      />
    </div>
  );
}

// ─── Add Parent modal ────────────────────────────────────────

interface AddParentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreateParentFlowDto) => Promise<Parent>;
  onSuccess: (name: string) => void;
  onError: (message: string) => void;
}

function AddParentModal({ open, onOpenChange, onCreate, onSuccess, onError }: AddParentModalProps) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
    whatsapp: '',
    annualIncome: '',
    fatherName: '',
    motherName: '',
  });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({
    name: '', email: '', password: '', phoneNumber: '', address: '', whatsapp: '',
    annualIncome: '', fatherName: '', motherName: '',
  });

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const update = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const incomeStr = form.annualIncome.trim();
  const incomeNumber = incomeStr === '' ? 0 : Number(incomeStr);
  const incomeValid = incomeStr === '' || (Number.isFinite(incomeNumber) && incomeNumber >= 0);

  const canSubmit =
    form.name.trim() &&
    form.password.trim() &&
    incomeValid;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onCreate({
        user: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phoneNumber: form.phoneNumber.trim() || undefined,
          address: form.address.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          isActive: true,
        },
        parent: {
          annualIncome: incomeNumber,
          fatherName: form.fatherName.trim() || undefined,
          motherName: form.motherName.trim() || undefined,
        },
      });
      onSuccess(form.name.trim());
      handleClose(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Add Guardian"
      description="Creates a user account, then links them as a guardian."
      size="lg"
      footer={
        <>
          <Button variant="tertiary" onClick={() => handleClose(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            Create Guardian
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">User account</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full name *" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g., Rajesh Patel" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="guardian@example.com" />
            <Input label="Password *" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Initial password" />
            <Input label="Phone" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} placeholder="9876543210" />
            <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="9876543210" />
            <div className="md:col-span-2">
              <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, city, state" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] mb-3">Guardian details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Father name" value={form.fatherName} onChange={(e) => update('fatherName', e.target.value)} placeholder="e.g., Rajesh Patel" />
            <Input label="Mother name" value={form.motherName} onChange={(e) => update('motherName', e.target.value)} placeholder="e.g., Meera Patel" />
            <Input
              label="Annual income (INR)"
              type="number"
              min={0}
              value={form.annualIncome}
              onChange={(e) => update('annualIncome', e.target.value)}
              placeholder="100000"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
