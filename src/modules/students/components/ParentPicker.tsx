import { useEffect, useRef, useState } from 'react';
import { Search, X, Plus, UserPlus, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useParentStore } from '@/stores/parent.store';
import { useUIStore } from '@/stores/ui.store';
import type { Parent } from '@/types/parent.types';

interface ParentPickerProps {
  value: string;
  onChange: (parent: Parent | null) => void;
  label?: string;
  required?: boolean;
}

function initialsOf(name: string | null | undefined): string {
  return (
    (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function ParentPicker({ value, onChange, label = 'Guardian', required }: ParentPickerProps) {
  const searchParents = useParentStore((s) => s.searchParents);
  const getParent = useParentStore((s) => s.getParent);
  const createParent = useParentStore((s) => s.createParent);
  const showToast = useUIStore((s) => s.showToast);

  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [selected, setSelected] = useState<Parent | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Parent[]>([]);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phoneNumber: '', password: '',
    annualIncome: '', fatherName: '', motherName: '',
  });
  const [creating, setCreating] = useState(false);

  // Resolve the chip when `value` arrives without an embedded parent — e.g. the
  // edit modal hands us a parentId but the parent object isn't in store.
  const lastResolvedRef = useRef<string>('');
  useEffect(() => {
    if (!value) {
      setSelected(null);
      lastResolvedRef.current = '';
      return;
    }
    if (selected?.id === value) return;
    if (lastResolvedRef.current === value) return;
    lastResolvedRef.current = value;
    getParent(value)
      .then(setSelected)
      .catch(() => { /* leave chip empty — caller already has the id */ });
  }, [value, selected?.id, getParent]);

  // Debounced server-side search. Skipped when a parent is already selected
  // (the chip view replaces the input) or while in create mode.
  useEffect(() => {
    if (mode !== 'pick' || selected) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const list = await searchParents(q);
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, mode, selected, searchParents]);

  const handleSelect = (p: Parent) => {
    setSelected(p);
    setQuery('');
    setResults([]);
    onChange(p);
  };

  const handleClear = () => {
    setSelected(null);
    onChange(null);
  };

  const updateForm = <K extends keyof typeof form>(key: K, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const enterCreate = () => {
    setForm({
      name: '', email: '', phoneNumber: '', password: Math.random().toString(36).slice(2, 12),
      annualIncome: '', fatherName: '', motherName: '',
    });
    setMode('create');
  };

  const incomeNumber = Number(form.annualIncome);
  const canSubmitCreate =
    form.name.trim() &&
    form.password.trim() &&
    form.annualIncome.trim() !== '' &&
    Number.isFinite(incomeNumber) &&
    incomeNumber >= 0;

  const handleCreate = async () => {
    if (!canSubmitCreate || creating) return;
    setCreating(true);
    try {
      const parent = await createParent({
        user: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phoneNumber: form.phoneNumber.trim() || undefined,
          isActive: true,
        },
        parent: {
          annualIncome: incomeNumber,
          fatherName: form.fatherName.trim() || undefined,
          motherName: form.motherName.trim() || undefined,
        },
      });
      showToast({
        type: 'success',
        title: 'Guardian created',
        message: `Initial password: ${form.password} (share with the guardian)`,
      });
      handleSelect(parent);
      setMode('pick');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to create guardian',
        message: (err as Error).message,
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide">
          {label}{required && ' *'}
        </label>
      )}

      {mode === 'pick' && selected && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
            <span className="text-white text-[0.6875rem] font-bold">{initialsOf(selected.user?.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <p className="text-[0.8125rem] font-semibold text-emerald-900 truncate">
                {selected.user?.name ?? selected.id}
              </p>
            </div>
            <p className="text-[0.6875rem] text-emerald-700 mt-0.5 truncate">
              {selected.user?.email || '—'} · {selected.user?.phoneNumber || '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[0.6875rem] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors"
          >
            Change
          </button>
        </div>
      )}

      {mode === 'pick' && !selected && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guardian by name, email, or phone..."
              className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-9 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.15)] transition-shadow"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {query.trim() && (
            <div className="rounded-xl bg-[var(--card-bg)] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-[var(--border-subtle)] max-h-64 overflow-y-auto">
              {searching && (
                <div className="px-3 py-4 text-center text-[0.75rem] text-[var(--text-muted)]">Searching…</div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-3 py-4 text-center text-[0.75rem] text-[var(--text-muted)]">
                  No guardians match “{query}”
                </div>
              )}
              {!searching && results.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--card-bg-hover)] transition-colors',
                    idx < results.length - 1 && 'border-b border-[var(--border-subtle)]',
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                    <span className="text-white text-[0.5625rem] font-bold">{initialsOf(p.user?.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                      {p.user?.name ?? p.id}
                    </p>
                    <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">
                      {p.user?.email || '—'} · {p.user?.phoneNumber || '—'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={enterCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create new guardian
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="rounded-xl bg-[var(--card-bg-hover)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#002c98]" />
              <p className="text-[0.8125rem] font-bold text-[var(--text-primary)]">New guardian</p>
            </div>
            <button
              type="button"
              onClick={() => setMode('pick')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[0.6875rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Pick existing
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Full name *" value={form.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g. Rakesh Patel" />
            <Input label="Phone" value={form.phoneNumber} onChange={(e) => updateForm('phoneNumber', e.target.value)} placeholder="9876543210" />
            <Input label="Email" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="guardian@example.com" />
            <Input label="Initial password *" value={form.password} onChange={(e) => updateForm('password', e.target.value)} placeholder="Auto-suggested" />
            <Input label="Father name" value={form.fatherName} onChange={(e) => updateForm('fatherName', e.target.value)} placeholder="Optional" />
            <Input label="Mother name" value={form.motherName} onChange={(e) => updateForm('motherName', e.target.value)} placeholder="Optional" />
            <div className="md:col-span-2">
              <Input
                label="Annual income (INR) *"
                type="number"
                min={0}
                value={form.annualIncome}
                onChange={(e) => updateForm('annualIncome', e.target.value)}
                placeholder="100000"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleCreate}
            loading={creating}
            disabled={!canSubmitCreate}
            className="w-full"
          >
            <UserPlus className="w-4 h-4" /> Create guardian
          </Button>
        </div>
      )}
    </div>
  );
}
