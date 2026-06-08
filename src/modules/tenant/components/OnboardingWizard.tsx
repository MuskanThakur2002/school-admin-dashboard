import { useEffect, useMemo, useState } from 'react';
import { Building2, User, Globe, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { cn } from '@/utils/cn';
import type { TenantPlan, CreateTenantDto } from '@/types/tenant.types';

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: CreateTenantDto) => Promise<void>;
}

const steps = [
  { id: 1, label: 'School Info', icon: Building2 },
  { id: 2, label: 'Admin Contact', icon: User },
  { id: 3, label: 'Plan & Domain', icon: Globe },
  { id: 4, label: 'Review', icon: CheckCircle2 },
];

// State/city data comes from `country-state-city`, dynamically imported
// only when the wizard opens (see component) to keep it out of the bundle.
type CscModule = typeof import('country-state-city');

const boardOptions = [
  { label: 'CBSE', value: 'CBSE' },
  { label: 'ICSE', value: 'ICSE' },
  { label: 'State Board', value: 'State Board' },
  { label: 'IB', value: 'IB' },
  { label: 'IGCSE', value: 'IGCSE' },
];

const planOptions: { value: TenantPlan; label: string; desc: string; price: string }[] = [
  { value: 'trial', label: 'Trial', desc: '14-day free trial, all modules', price: 'Free' },
  { value: 'starter', label: 'Starter', desc: 'Up to 500 students, basic modules', price: '₹5,000/mo' },
  { value: 'growth', label: 'Growth', desc: 'Up to 2,000 students, all modules', price: '₹12,000/mo' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Unlimited students, API access, priority support', price: '₹25,000/mo' },
];

const planColors: Record<TenantPlan, string> = {
  trial: 'border-emerald-300 bg-emerald-50',
  starter: 'border-slate-300 bg-slate-50',
  growth: 'border-blue-300 bg-blue-50',
  enterprise: 'border-violet-300 bg-violet-50',
};

const planSelectedColors: Record<TenantPlan, string> = {
  trial: 'border-emerald-500 bg-emerald-50 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]',
  starter: 'border-slate-500 bg-slate-50 shadow-[0_0_0_2px_rgba(100,116,139,0.2)]',
  growth: 'border-blue-500 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]',
  enterprise: 'border-violet-500 bg-violet-50 shadow-[0_0_0_2px_rgba(139,92,246,0.2)]',
};

export function OnboardingWizard({ open, onOpenChange, onSubmit }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [plan, setPlan] = useState<TenantPlan>('starter');
  const [domain, setDomain] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Lazy-load the (large) country-state-city dataset only once the wizard
  // is opened, so it never weighs down the initial bundle.
  const [csc, setCsc] = useState<CscModule | null>(null);
  useEffect(() => {
    if (open && !csc) import('country-state-city').then(setCsc);
  }, [open, csc]);

  const inStates = useMemo(() => csc?.State.getStatesOfCountry('IN') ?? [], [csc]);
  const stateOptions = useMemo(
    () => inStates.map((s) => ({ label: s.name, value: s.name })),
    [inStates],
  );
  const cityOptions = useMemo(() => {
    const code = inStates.find((s) => s.name === state)?.isoCode;
    return code && csc
      ? csc.City.getCitiesOfState('IN', code).map((c) => ({ label: c.name, value: c.name }))
      : [];
  }, [csc, inStates, state]);

  const resetForm = () => {
    setStep(1);
    setName(''); setCity(''); setState(''); setBoard('CBSE');
    setAdminEmail(''); setAdminPhone('');
    setPlan('starter'); setDomain('');
    setErrors({});
    setSaving(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!name.trim()) errs.name = 'School name is required';
      if (!city.trim()) errs.city = 'City is required';
      if (!state) errs.state = 'State is required';
    } else if (step === 2) {
      if (!adminEmail.trim()) errs.adminEmail = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) errs.adminEmail = 'Invalid email';
      if (!adminPhone.trim()) errs.adminPhone = 'Phone is required';
      else if (!/^\d{10}$/.test(adminPhone)) errs.adminPhone = 'Enter 10-digit phone number';
    } else if (step === 3) {
      if (!domain.trim()) errs.domain = 'Domain prefix is required';
      else if (!/^[a-z0-9-]+$/.test(domain)) errs.domain = 'Only lowercase letters, numbers, and hyphens';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        city: city.trim(),
        state,
        board,
        plan,
        domain: `${domain}.admindesk.io`,
        adminEmail: adminEmail.trim(),
        adminPhone: adminPhone.trim(),
      });
      handleOpenChange(false);
    } catch {
      setSaving(false);
    }
  };

  const generatedDomain = domain ? `${domain}.admindesk.io` : '';

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Onboard New School"
      description={`Step ${step} of 4 — ${steps[step - 1].label}`}
      size="lg"
      footer={
        <>
          {step > 1 && (
            <Button variant="tertiary" onClick={prev} icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button onClick={next} icon={<ArrowRight className="w-4 h-4" />}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={saving} icon={<CheckCircle2 className="w-4 h-4" />}>
              Create School
            </Button>
          )}
        </>
      }
    >
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s) => (
          <div key={s.id} className="flex-1">
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-[0.75rem] font-medium transition-all',
              step === s.id
                ? 'bg-[#002c98]/10 text-[#002c98]'
                : step > s.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-[var(--card-bg-hover)] text-[var(--text-muted)]',
            )}>
              {step > s.id ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <s.icon className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: School Info */}
      {step === 1 && (
        <div className="space-y-4">
          <Input label="School Name" placeholder="e.g. Delhi Public School — Noida" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="State" options={stateOptions} value={state} onChange={(e) => { setState(e.target.value); setCity(''); }} placeholder="Select state" error={errors.state} />
            <Select label="City" options={cityOptions} value={city} onChange={(e) => setCity(e.target.value)} placeholder={state ? 'Select city' : 'Select state first'} disabled={!state} error={errors.city} className="disabled:opacity-60 disabled:cursor-not-allowed" />
          </div>
          <Select label="Board / Affiliation" options={boardOptions} value={board} onChange={(e) => setBoard(e.target.value)} />
        </div>
      )}

      {/* Step 2: Admin Contact */}
      {step === 2 && (
        <div className="space-y-4">
          <Input label="Admin Email" type="email" placeholder="admin@school.edu.in" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} error={errors.adminEmail} />
          <Input label="Admin Phone" type="tel" placeholder="9876543210" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} error={errors.adminPhone} hint="10-digit mobile number" />
        </div>
      )}

      {/* Step 3: Plan & Domain */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block text-[0.75rem] font-semibold text-[var(--text-secondary)] tracking-wide mb-2">Select Plan</label>
            <div className="grid grid-cols-3 gap-3">
              {planOptions.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlan(p.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all cursor-pointer',
                    plan === p.value ? planSelectedColors[p.value] : planColors[p.value],
                  )}
                >
                  <p className="text-[0.8125rem] font-bold text-[var(--text-primary)]">{p.label}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] mt-1">{p.desc}</p>
                  <p className="text-[0.875rem] font-extrabold text-[var(--text-primary)] mt-2 font-display">{p.price}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Input
              label="Domain Prefix"
              placeholder="e.g. dps-noida"
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              error={errors.domain}
              hint={generatedDomain ? `Your URL: ${generatedDomain}` : 'Letters, numbers, hyphens only'}
            />
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-[var(--card-bg-hover)] rounded-xl p-5 space-y-3">
            <h4 className="text-[0.8125rem] font-bold text-[var(--text-primary)]">Review Details</h4>
            {[
              ['School Name', name],
              ['Location', `${city}, ${state}`],
              ['Board', board],
              ['Admin Email', adminEmail],
              ['Admin Phone', adminPhone],
              ['Plan', plan.charAt(0).toUpperCase() + plan.slice(1)],
              ['Domain', generatedDomain],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[0.8125rem]">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-medium text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.6875rem] text-[var(--text-muted)]">
            The school will be created in "onboarding" status. The admin will receive login credentials via email.
          </p>
        </div>
      )}
    </Modal>
  );
}
