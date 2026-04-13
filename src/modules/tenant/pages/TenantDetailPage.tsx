import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Palette, CreditCard, Shield, Save, Globe, MapPin,
  Users, CheckCircle2, AlertTriangle, Power, Eye,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { useTenantStore } from '@/stores/tenant.store';
import { useUIStore } from '@/stores/ui.store';
import { ALL_MODULES } from '@/types/tenant.types';
import type { Tenant, TenantPlan } from '@/types/tenant.types';

// ─── Tabs ──────────────────────────────────────────────────────

const tabs = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'plan', label: 'Plan', icon: CreditCard },
  { id: 'access', label: 'Access Control', icon: Shield },
] as const;

type TabId = (typeof tabs)[number]['id'];

// ─── Plan config ───────────────────────────────────────────────

const planMeta: Record<TenantPlan, { label: string; desc: string; price: string; color: string; selectedColor: string }> = {
  starter: { label: 'Starter', desc: 'Up to 500 students, basic modules', price: '₹5,000/mo', color: 'border-slate-200 bg-slate-50', selectedColor: 'border-slate-500 bg-slate-50 shadow-[0_0_0_2px_rgba(100,116,139,0.2)]' },
  growth: { label: 'Growth', desc: 'Up to 2,000 students, all modules', price: '₹12,000/mo', color: 'border-blue-200 bg-blue-50', selectedColor: 'border-blue-500 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]' },
  enterprise: { label: 'Enterprise', desc: 'Unlimited students, API access, priority support', price: '₹25,000/mo', color: 'border-violet-200 bg-violet-50', selectedColor: 'border-violet-500 bg-violet-50 shadow-[0_0_0_2px_rgba(139,92,246,0.2)]' },
};

const planBadgeStyle: Record<TenantPlan, string> = {
  starter: 'bg-slate-50 text-slate-600',
  growth: 'bg-blue-50 text-blue-700',
  enterprise: 'bg-violet-50 text-violet-700',
};

const statusStyle: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  onboarding: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  suspended: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

const moduleLabels: Record<string, string> = {
  admissions: 'Admissions',
  students: 'Students',
  academics: 'Academics',
  fees: 'Fee Engine',
  ledger: 'Ledger',
  expenses: 'Expenses',
  receipts: 'Receipts',
  notifications: 'Notifications',
  reports: 'Reports',
};

// ─── Section wrapper ───────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-[0.75rem] text-[var(--text-muted)] mb-5">{description}</p>
      {children}
    </div>
  );
}

// ─── Color swatches ────────────────────────────────────────────

const presetColors = [
  '#002c98', '#1a237e', '#0d47a1', '#006970', '#2e7d32',
  '#b71c1c', '#880e4f', '#4a148c', '#e65100', '#37474f',
];

// ─── Main component ────────────────────────────────────────────

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getTenant = useTenantStore((s) => s.getTenant);
  const updateBranding = useTenantStore((s) => s.updateBranding);
  const updatePlan = useTenantStore((s) => s.updatePlan);
  const updateAccess = useTenantStore((s) => s.updateAccess);
  const suspendTenant = useTenantStore((s) => s.suspendTenant);
  const activateTenant = useTenantStore((s) => s.activateTenant);
  const showToast = useUIStore((s) => s.showToast);

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('branding');
  const [saving, setSaving] = useState(false);

  // Branding form
  const [brandColor, setBrandColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [tagline, setTagline] = useState('');

  // Plan form
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>('starter');

  // Access form
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [maxAdmins, setMaxAdmins] = useState(3);
  const [maxStaff, setMaxStaff] = useState(50);
  const [allowApi, setAllowApi] = useState(false);
  const [allowBulkImport, setAllowBulkImport] = useState(true);

  useEffect(() => {
    if (!id) return;
    getTenant(id).then((t) => {
      setTenant(t);
      setBrandColor(t.branding.primaryColor);
      setLogoUrl(t.branding.logoUrl);
      setTagline(t.branding.tagline);
      setSelectedPlan(t.plan);
      setEnabledModules([...t.access.modulesEnabled]);
      setMaxAdmins(t.access.maxAdmins);
      setMaxStaff(t.access.maxStaff);
      setAllowApi(t.access.allowApi);
      setAllowBulkImport(t.access.allowBulkImport);
    });
  }, [id, getTenant]);

  const brandingDirty = useMemo(() => {
    if (!tenant) return false;
    return brandColor !== tenant.branding.primaryColor || logoUrl !== tenant.branding.logoUrl || tagline !== tenant.branding.tagline;
  }, [tenant, brandColor, logoUrl, tagline]);

  const planDirty = useMemo(() => {
    if (!tenant) return false;
    return selectedPlan !== tenant.plan;
  }, [tenant, selectedPlan]);

  const accessDirty = useMemo(() => {
    if (!tenant) return false;
    const a = tenant.access;
    return (
      JSON.stringify([...enabledModules].sort()) !== JSON.stringify([...a.modulesEnabled].sort()) ||
      maxAdmins !== a.maxAdmins || maxStaff !== a.maxStaff ||
      allowApi !== a.allowApi || allowBulkImport !== a.allowBulkImport
    );
  }, [tenant, enabledModules, maxAdmins, maxStaff, allowApi, allowBulkImport]);

  const handleSaveBranding = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateBranding(id, { primaryColor: brandColor, logoUrl, tagline });
      setTenant(updated);
      showToast({ type: 'success', title: 'Branding updated', message: 'School branding has been saved' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlan = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updatePlan(id, { plan: selectedPlan });
      setTenant(updated);
      showToast({ type: 'success', title: 'Plan updated', message: `Plan changed to ${selectedPlan}` });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccess = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateAccess(id, { modulesEnabled: enabledModules, maxAdmins, maxStaff, allowApi, allowBulkImport });
      setTenant(updated);
      showToast({ type: 'success', title: 'Access updated', message: 'Tenant access control has been saved' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!id || !tenant) return;
    setSaving(true);
    try {
      const updated = tenant.status === 'suspended' ? await activateTenant(id) : await suspendTenant(id);
      setTenant(updated);
      showToast({
        type: updated.status === 'suspended' ? 'info' : 'success',
        title: updated.status === 'suspended' ? 'School suspended' : 'School activated',
        message: `${tenant.name} is now ${updated.status}`,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (mod: string) => {
    setEnabledModules((prev) => prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]);
  };

  if (!tenant) {
    return (
      <div className="max-w-[1280px] space-y-4">
        <div className="h-10 w-64 bg-[var(--card-bg-hover)] rounded-xl animate-pulse" />
        <div className="h-6 w-96 bg-[var(--card-bg-hover)] rounded-xl animate-pulse" />
        <div className="h-96 w-full bg-[var(--card-bg-hover)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const ss = statusStyle[tenant.status];

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/tenants')} className="mt-1 p-2 rounded-xl hover:bg-[var(--card-bg-hover)] transition-colors text-[var(--text-muted)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">{tenant.name}</h1>
              <span className={cn('px-2 py-0.5 rounded-md text-[0.625rem] font-bold uppercase', planBadgeStyle[tenant.plan])}>{tenant.plan}</span>
              <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold', ss.bg, ss.text)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', ss.dot)} /> {tenant.status}
              </div>
            </div>
            <div className="flex items-center gap-4 text-[0.75rem] text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {tenant.domain}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {tenant.city}, {tenant.state}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tenant.students.toLocaleString('en-IN')} students</span>
            </div>
          </div>
        </div>
        <Button
          variant={tenant.status === 'suspended' ? 'primary' : 'danger'}
          size="sm"
          onClick={handleToggleStatus}
          loading={saving}
          icon={tenant.status === 'suspended' ? <Power className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        >
          {tenant.status === 'suspended' ? 'Activate' : 'Suspend'}
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--card-bg-hover)] rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-medium transition-all',
              activeTab === tab.id
                ? 'bg-[var(--card-bg)] text-[#002c98] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── BRANDING TAB ──────────────────────────────────────── */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <Section title="Brand Color" description="Primary color used across the school's portal and communications">
            <div className="space-y-4">
              <div className="flex gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBrandColor(c)}
                    className={cn(
                      'w-9 h-9 rounded-xl transition-all cursor-pointer',
                      brandColor === c ? 'ring-2 ring-offset-2 ring-[var(--text-primary)] scale-110' : 'hover:scale-105',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <Input
                  label="Hex Code"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#002c98"
                  className="max-w-[160px]"
                />
              </div>

              {/* Preview */}
              <div className="mt-4">
                <p className="text-[0.75rem] font-semibold text-[var(--text-secondary)] mb-2">Preview</p>
                <div className="rounded-xl border border-[var(--border-subtle)] p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: brandColor }}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[0.875rem] font-bold" style={{ color: brandColor }}>{tenant.name}</p>
                    <p className="text-[0.75rem] text-[var(--text-muted)]">{tagline || 'Your tagline here'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Logo & Tagline" description="School logo URL and tagline for branding">
            <div className="space-y-4">
              <Input label="Logo URL" placeholder="https://example.com/logo.png" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} hint="Paste the URL of your school logo (PNG or SVG recommended)" />
              <Input label="Tagline" placeholder="e.g. Leaders of Tomorrow" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
          </Section>

          {brandingDirty && (
            <div className="flex justify-end">
              <Button onClick={handleSaveBranding} loading={saving} icon={<Save className="w-4 h-4" />}>
                Save Branding
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── PLAN TAB ──────────────────────────────────────────── */}
      {activeTab === 'plan' && (
        <div className="space-y-6">
          <Section title="Subscription Plan" description="Change the tenant's plan. Upgrades apply immediately, downgrades at the next billing cycle.">
            <div className="grid grid-cols-3 gap-4">
              {(Object.entries(planMeta) as [TenantPlan, typeof planMeta.starter][]).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPlan(key)}
                  className={cn(
                    'p-5 rounded-xl border-2 text-left transition-all cursor-pointer relative',
                    selectedPlan === key ? meta.selectedColor : meta.color,
                  )}
                >
                  {tenant.plan === key && (
                    <span className="absolute top-3 right-3 text-[0.5625rem] font-bold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">Current</span>
                  )}
                  <p className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{meta.label}</p>
                  <p className="text-[0.75rem] text-[var(--text-muted)] mt-1">{meta.desc}</p>
                  <p className="text-[1.125rem] font-extrabold text-[var(--text-primary)] mt-3 font-display">{meta.price}</p>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Plan Comparison" description="Feature availability by plan">
            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              <table className="w-full text-[0.8125rem]">
                <thead>
                  <tr className="bg-[var(--card-bg-hover)]">
                    <th className="text-left px-4 py-3 text-[0.75rem] font-semibold text-[var(--text-muted)]">Feature</th>
                    <th className="text-center px-4 py-3 text-[0.75rem] font-semibold text-slate-600">Starter</th>
                    <th className="text-center px-4 py-3 text-[0.75rem] font-semibold text-blue-700">Growth</th>
                    <th className="text-center px-4 py-3 text-[0.75rem] font-semibold text-violet-700">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {[
                    ['Max Students', '500', '2,000', 'Unlimited'],
                    ['API Access', '—', '—', '✓'],
                    ['Bulk Import', '✓', '✓', '✓'],
                    ['Custom Branding', '—', '✓', '✓'],
                    ['Priority Support', '—', '—', '✓'],
                    ['Max Admin Users', '3', '5', '10'],
                  ].map(([feature, s, g, e]) => (
                    <tr key={feature} className="hover:bg-[var(--card-bg-hover)] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{feature}</td>
                      <td className="px-4 py-2.5 text-center text-[var(--text-muted)]">{s}</td>
                      <td className="px-4 py-2.5 text-center text-[var(--text-muted)]">{g}</td>
                      <td className="px-4 py-2.5 text-center text-[var(--text-muted)]">{e}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {planDirty && (
            <div className="flex justify-end">
              <Button onClick={handleSavePlan} loading={saving} icon={<Save className="w-4 h-4" />}>
                Update Plan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── ACCESS CONTROL TAB ────────────────────────────────── */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <Section title="Module Access" description="Enable or disable modules for this tenant">
            <div className="grid grid-cols-3 gap-3">
              {ALL_MODULES.map((mod) => {
                const enabled = enabledModules.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleModule(mod)}
                    className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-left',
                      enabled
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-[var(--border-subtle)] bg-[var(--card-bg-hover)]',
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors',
                      enabled ? 'bg-emerald-500' : 'bg-[var(--border-subtle)]',
                    )}>
                      {enabled && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={cn(
                      'text-[0.8125rem] font-medium',
                      enabled ? 'text-emerald-800' : 'text-[var(--text-muted)]',
                    )}>
                      {moduleLabels[mod] || mod}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="User Limits" description="Maximum number of admin and staff accounts for this tenant">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Max Admin Users" type="number" min={1} max={50} value={String(maxAdmins)} onChange={(e) => setMaxAdmins(Number(e.target.value))} />
              <Input label="Max Staff Users" type="number" min={1} max={500} value={String(maxStaff)} onChange={(e) => setMaxStaff(Number(e.target.value))} />
            </div>
          </Section>

          <Section title="Capabilities" description="Toggle advanced capabilities for this tenant">
            <div className="space-y-3">
              {[
                { key: 'api', label: 'API Access', desc: 'Allow programmatic access via REST API', value: allowApi, toggle: () => setAllowApi(!allowApi), icon: Globe },
                { key: 'bulk', label: 'Bulk Import', desc: 'Allow CSV/Excel bulk data imports', value: allowBulkImport, toggle: () => setAllowBulkImport(!allowBulkImport), icon: Eye },
              ].map((cap) => (
                <div key={cap.key} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg-hover)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--card-bg)] flex items-center justify-center">
                      <cap.icon className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{cap.label}</p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">{cap.desc}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cap.toggle}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                      cap.value ? 'bg-emerald-500' : 'bg-slate-300',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
                      cap.value ? 'translate-x-5.5' : 'translate-x-0.5',
                    )} />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {accessDirty && (
            <div className="flex justify-end">
              <Button onClick={handleSaveAccess} loading={saving} icon={<Save className="w-4 h-4" />}>
                Save Access Control
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
