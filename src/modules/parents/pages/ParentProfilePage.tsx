import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, Calendar, Phone, Mail, Wallet,
} from 'lucide-react';
import { useParentStore } from '@/stores/parent.store';
import type { Parent } from '@/types/parent.types';

function formatIncome(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5">
      <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-[0.8125rem] text-[var(--text-primary)] font-medium">{value || '—'}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" strokeWidth={2} />
        </div>
        <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function ParentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getParent = useParentStore((s) => s.getParent);

  const [parent, setParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getParent(id)
      .then((p) => setParent(p))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getParent]);

  if (loading) {
    return (
      <div className="max-w-[1280px]">
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading parent profile...</p>
        </div>
      </div>
    );
  }

  if (error || !parent) {
    return (
      <div className="max-w-[1280px]">
        <button
          onClick={() => navigate('/parents')}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Parents
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] font-semibold text-red-600 mb-1">Parent not found</p>
          <p className="text-[0.75rem] text-[var(--text-muted)]">{error || `No parent found with ID: ${id}`}</p>
        </div>
      </div>
    );
  }

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
    <div className="max-w-[1280px]">
      <button
        onClick={() => navigate('/parents')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Parents
      </button>

      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <span className="font-display text-[1.5rem] font-extrabold text-white">{initials}</span>
          </div>

          <div className="flex-1">
            <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em] mb-1">
              {name}
            </h1>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {formatIncome(parent.annualIncome)} / year
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[0.75rem] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {phone}</span>
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {email}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Added: {parent.createdAt?.split('T')[0] ?? ''}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Account" icon={User}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Name" value={name} />
            <Field label="Email" value={email} />
            <Field label="Phone" value={phone} />
            <Field label="User ID" value={parent.userId} />
          </div>
        </SectionCard>
        <SectionCard title="Parent details" icon={Wallet}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Annual Income" value={formatIncome(parent.annualIncome)} />
            <Field label="Parent ID" value={parent.id} />
            <Field label="Created" value={parent.createdAt?.split('T')[0] ?? ''} />
            <Field label="Updated" value={parent.updatedAt?.split('T')[0] ?? ''} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
