import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Users, CheckCircle2, Clock, MapPin, Globe, Settings, ArrowRight, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { OnboardingWizard } from '../components/OnboardingWizard';
import type { TenantPlan, TenantStatus, CreateTenantDto } from '@/types/tenant.types';

const planStyle: Record<TenantPlan, { bg: string; text: string }> = {
  trial: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  starter: { bg: 'bg-slate-50', text: 'text-slate-600' },
  growth: { bg: 'bg-blue-50', text: 'text-blue-700' },
  enterprise: { bg: 'bg-violet-50', text: 'text-violet-700' },
};

const statusStyle: Record<TenantStatus, { dot: string; text: string; bg: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  onboarding: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  suspended: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

export default function TenantListPage() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const tenants = useTenantStore((s) => s.tenants);
  const loading = useTenantStore((s) => s.loading);
  const fetchTenants = useTenantStore((s) => s.fetchTenants);
  const createTenant = useTenantStore((s) => s.createTenant);
  const setActiveSchool = useAuthStore((s) => s.setActiveSchool);

  const handleEnter = (id: string) => {
    setActiveSchool(id);
    navigate('/dashboard');
  };

  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (tenants.length === 0) fetchTenants();
  }, [tenants.length, fetchTenants]);

  const totalStudents = tenants.reduce((s, t) => s + t.students, 0);
  const activeTenants = tenants.filter((t) => t.status === 'active').length;

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.state.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  const handleOnboard = async (dto: CreateTenantDto) => {
    await createTenant(dto);
    showToast({ type: 'success', title: 'School created', message: `${dto.name} has been onboarded successfully` });
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Tenant Management</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage schools and tenants on the platform</p>
        </div>
        <button onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all cursor-pointer">
          <Plus className="w-4 h-4" /> Onboard School
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Schools', value: tenants.length, icon: Building2, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: activeTenants, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Students', value: totalStudents.toLocaleString('en-IN'), icon: Users, color: 'bg-violet-50 text-violet-600' },
          { label: 'Onboarding', value: tenants.filter((t) => t.status === 'onboarding').length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
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

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, domain or location..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && tenants.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-[var(--card-bg-hover)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-64 bg-[var(--card-bg-hover)] rounded-lg animate-pulse" />
                  <div className="h-4 w-48 bg-[var(--card-bg-hover)] rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tenant cards */}
      <div className="space-y-3">
        {filteredTenants.map((tenant) => {
          const ps = planStyle[tenant.plan];
          const ss = statusStyle[tenant.status];
          return (
            <div key={tenant.id} className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,44,152,0.25)]">
                  <Building2 className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-[1rem] font-bold text-[var(--text-primary)]">{tenant.name}</h3>
                    <span className={cn('px-2 py-0.5 rounded-md text-[0.625rem] font-bold uppercase', ps.bg, ps.text)}>{tenant.plan}</span>
                    <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold', ss.bg, ss.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', ss.dot)} /> {tenant.status}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[0.75rem] text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-[var(--text-muted)]" /> {tenant.domain}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[var(--text-muted)]" /> {tenant.city}, {tenant.state}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 shrink-0">
                  <div className="text-center px-4 py-2 rounded-xl bg-[var(--card-bg-hover)]">
                    <p className="font-display text-[1.125rem] font-extrabold text-[var(--text-primary)] leading-none">{tenant.students.toLocaleString('en-IN')}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Students</p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-[var(--card-bg-hover)]">
                    <p className="font-display text-[1.125rem] font-extrabold text-[var(--text-primary)] leading-none">{tenant.staff}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Staff</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" strokeWidth={2} /> Configure
                  </button>
                  <button
                    onClick={() => handleEnter(tenant.id)}
                    disabled={tenant.status === 'suspended'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold bg-[#002c98] text-white shadow-[0_2px_6px_rgba(0,44,152,0.25)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Enter <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filteredTenants.length === 0 && (
          <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Search className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No schools found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">{search ? 'Try adjusting your search' : 'Onboard your first school to get started'}</p>
          </div>
        )}
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} onSubmit={handleOnboard} />
    </div>
  );
}
