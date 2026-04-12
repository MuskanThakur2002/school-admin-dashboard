import { Building2, Plus, Users, CheckCircle2, Clock, MapPin, Globe, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';

interface Tenant { id: string; name: string; domain: string; city: string; state: string; plan: 'starter' | 'growth' | 'enterprise'; students: number; staff: number; status: 'active' | 'onboarding' | 'suspended'; joinDate: string; }

const planStyle: Record<string, { bg: string; text: string }> = {
  starter: { bg: 'bg-slate-50', text: 'text-slate-600' },
  growth: { bg: 'bg-blue-50', text: 'text-blue-700' },
  enterprise: { bg: 'bg-violet-50', text: 'text-violet-700' },
};

const statusStyle: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  onboarding: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  suspended: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

const mockTenants: Tenant[] = [
  { id: '1', name: 'Delhi Public School — Noida', domain: 'dps-noida.admindesk.io', city: 'Noida', state: 'UP', plan: 'enterprise', students: 2450, staff: 180, status: 'active', joinDate: '2025-01-15' },
  { id: '2', name: 'Ryan International — Mumbai', domain: 'ryan-mumbai.admindesk.io', city: 'Mumbai', state: 'Maharashtra', plan: 'growth', students: 1200, staff: 95, status: 'active', joinDate: '2025-03-01' },
  { id: '3', name: 'Greenwood Academy', domain: 'greenwood.admindesk.io', city: 'Bangalore', state: 'Karnataka', plan: 'growth', students: 932, staff: 72, status: 'active', joinDate: '2025-04-01' },
  { id: '4', name: 'St. Xavier\'s — Kolkata', domain: 'xavier-kol.admindesk.io', city: 'Kolkata', state: 'West Bengal', plan: 'starter', students: 580, staff: 45, status: 'active', joinDate: '2025-06-15' },
  { id: '5', name: 'Modern Public School', domain: 'modern-ps.admindesk.io', city: 'Jaipur', state: 'Rajasthan', plan: 'starter', students: 0, staff: 0, status: 'onboarding', joinDate: '2026-04-01' },
];

export default function TenantListPage() {
  const showToast = useUIStore((s) => s.showToast);

  const totalStudents = mockTenants.reduce((s, t) => s + t.students, 0);
  const activeTenants = mockTenants.filter((t) => t.status === 'active').length;

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Tenant Management</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage schools and tenants on the platform</p>
        </div>
        <button onClick={() => showToast({ type: 'info', title: 'Coming soon', message: 'Onboarding wizard will be available in the next update' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Onboard School
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Schools', value: mockTenants.length, icon: Building2, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: activeTenants, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Students', value: totalStudents.toLocaleString('en-IN'), icon: Users, color: 'bg-violet-50 text-violet-600' },
          { label: 'Onboarding', value: mockTenants.filter((t) => t.status === 'onboarding').length, icon: Clock, color: 'bg-amber-50 text-amber-600' },
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

      {/* Tenant cards */}
      <div className="space-y-3">
        {mockTenants.map((tenant) => {
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

                {/* Action */}
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all shrink-0">
                  <Settings className="w-3.5 h-3.5" strokeWidth={2} /> Configure
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
