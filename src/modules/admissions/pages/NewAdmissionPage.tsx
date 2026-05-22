import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, User, Users, MapPin, FileText,
  Plus, UserPlus,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useParentStore } from '@/stores/parent.store';
import { useSettingsStore } from '@/stores/settings.store';
import { genderOptions } from '@/utils/constants';
import { useClassOptions } from '@/hooks/useClassOptions';

// ─── Step definitions ──────────────────────────────────────────
const steps = [
  { id: 'student', label: 'Student Details', icon: User },
  { id: 'parent', label: 'Guardian', icon: Users },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'review', label: 'Review', icon: FileText },
] as const;

type StepId = typeof steps[number]['id'];
type Gender = 'male' | 'female' | 'other';

// ─── Component ─────────────────────────────────────────────────
export default function NewAdmissionPage() {
  const navigate = useNavigate();
  const createApplication = useAdmissionsStore((s) => s.createApplication);
  const academicYears = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const classOptions = useClassOptions();
  const showToast = useUIStore((s) => s.showToast);

  // Parent picker / inline create
  const parents = useParentStore((s) => s.parents);
  const fetchParents = useParentStore((s) => s.fetchParents);
  const createParent = useParentStore((s) => s.createParent);
  const ensureParentRole = useSettingsStore((s) => s.ensureParentRole);

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepId>('student');
  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  // Form state — every field maps 1:1 to what the backend stores.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [classApplied, setClassApplied] = useState('');
  // Parent fields — sent to the backend as text on the Application.
  // Filled either by picking an existing Parent or via the inline create form.
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [address, setAddress] = useState('');

  // Parent mode: pick from list, or create inline.
  const [parentMode, setParentMode] = useState<'pick' | 'create'>('pick');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [newParentPassword, setNewParentPassword] = useState(() =>
    Math.random().toString(36).slice(2, 12),
  );
  const [newParentAnnualIncome, setNewParentAnnualIncome] = useState('');
  const [newFatherName, setNewFatherName] = useState('');
  const [newMotherName, setNewMotherName] = useState('');
  const [creatingParent, setCreatingParent] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (academicYears.length === 0) fetchYears();
    if (parents.length === 0) fetchParents(1, 100);
  }, [academicYears.length, parents.length, fetchYears, fetchParents]);

  // ─── Parent options + role lookup ────────────────────────────
  const parentOptions = useMemo(
    () => [
      { label: parents.length === 0 ? 'No parents yet — create one below' : 'Select parent...', value: '' },
      ...parents.map((p) => ({
        label: p.user?.name ? `${p.user.name}${p.user.email ? ` — ${p.user.email}` : ''}` : p.id,
        value: p.id,
      })),
    ],
    [parents],
  );
  const handlePickParent = (id: string) => {
    setSelectedParentId(id);
    const p = parents.find((x) => x.id === id);
    if (p) {
      setParentName(p.user?.name ?? '');
      setParentEmail(p.user?.email ?? '');
      setParentPhone(p.user?.phoneNumber ?? '');
    } else {
      setParentName('');
      setParentEmail('');
      setParentPhone('');
    }
  };

  const handleCreateParent = async () => {
    if (!parentName.trim() || !newParentPassword.trim()) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Name and password are required.' });
      return;
    }
    const incomeStr = newParentAnnualIncome.trim();
    let incomeNum = 0;
    if (incomeStr !== '') {
      incomeNum = Number(incomeStr);
      if (!Number.isFinite(incomeNum) || incomeNum < 0) {
        showToast({ type: 'error', title: 'Invalid annual income', message: 'Annual income must be a non-negative number.' });
        return;
      }
    }
    setCreatingParent(true);
    try {
      const parentRole = await ensureParentRole();
      const created = await createParent({
        user: {
          name: parentName.trim(),
          email: parentEmail.trim(),
          password: newParentPassword,
          phoneNumber: parentPhone.trim() || undefined,
          roleId: parentRole.id,
          isActive: true,
        },
        parent: {
          annualIncome: incomeNum,
          fatherName: newFatherName.trim() || undefined,
          motherName: newMotherName.trim() || undefined,
        },
      });
      showToast({
        type: 'success',
        title: 'Guardian created',
        message: `Initial password: ${newParentPassword} (share with the guardian).`,
      });
      // Switch to pick mode with the new parent selected.
      setParentMode('pick');
      setSelectedParentId(created.id);
      setNewParentPassword(Math.random().toString(36).slice(2, 12));
      setNewParentAnnualIncome('');
      setNewFatherName('');
      setNewMotherName('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to create guardian', message: (err as Error).message });
    } finally {
      setCreatingParent(false);
    }
  };

  // ─── Validation per step ─────────────────────────────────────
  const validateStep = (step: StepId): string | null => {
    if (step === 'student') {
      if (!firstName.trim()) return 'First name is required';
      if (!lastName.trim()) return 'Last name is required';
      if (!dateOfBirth) return 'Date of birth is required';
      if (!classApplied.trim()) return 'Class applied is required';
    }
    if (step === 'parent') {
      if (parentMode === 'pick') {
        if (!selectedParentId) return 'Please pick a guardian or switch to "Create new"';
      }
      if (parentMode === 'create') {
        if (!parentName.trim()) return 'Guardian name is required';
        if (parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) return 'Guardian email is not valid';
        return 'Please click "Create guardian" before continuing';
      }
    }
    if (step === 'address') {
      if (!address.trim()) return 'Address is required';
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      showToast({ type: 'error', title: 'Missing fields', message: err });
      return;
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < steps.length) setCurrentStep(steps[nextIdx].id);
  };

  const goBack = () => {
    if (stepIndex > 0) setCurrentStep(steps[stepIndex - 1].id);
  };

  const handleSubmit = async () => {
    for (const s of steps) {
      if (s.id === 'review') continue;
      const err = validateStep(s.id);
      if (err) {
        showToast({ type: 'error', title: 'Validation failed', message: err });
        setCurrentStep(s.id);
        return;
      }
    }

    const activeYear = academicYears.find((y) => y.isCurrent) ?? academicYears[0];
    if (!activeYear) {
      showToast({ type: 'error', title: 'No academic year', message: 'Set up an academic year before creating an application' });
      return;
    }

    setSubmitting(true);
    try {
      await createApplication({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        gender,
        classApplied,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentEmail: parentEmail.trim() || undefined,
        address: address.trim() || undefined,
      }, activeYear.id);
      showToast({
        type: 'success',
        title: 'Application submitted',
        message: `${firstName} ${lastName} — awaiting verification`,
      });
      navigate('/admissions/applications');
    } catch (err) {
      showToast({ type: 'error', title: 'Submission failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[960px]">
      <button
        onClick={() => navigate('/admissions')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admissions
      </button>

      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">New Admission</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Capture student details and submit the admission application</p>
      </div>

      {/* Stepper */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-5">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isCompleted = idx < stepIndex;
            const StepIcon = step.icon;
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => isCompleted && setCurrentStep(step.id)}
                  className="flex items-center gap-2.5 group"
                  disabled={!isCompleted && !isActive}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      isActive && 'bg-gradient-to-br from-[#002c98] to-[#3b6cf5] shadow-[0_2px_8px_rgba(0,44,152,0.3)]',
                      isCompleted && 'bg-emerald-50',
                      !isActive && !isCompleted && 'bg-[var(--card-bg-hover)]',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    ) : (
                      <StepIcon className={cn('w-[18px] h-[18px]', isActive ? 'text-white' : 'text-[var(--text-muted)]')} strokeWidth={1.8} />
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className={cn(
                      'text-[0.6875rem] font-medium uppercase tracking-[0.06em]',
                      isActive ? 'text-[#002c98]' : 'text-[var(--text-muted)]',
                    )}>
                      Step {idx + 1}
                    </p>
                    <p className={cn(
                      'text-[0.8125rem] font-semibold',
                      isActive || isCompleted ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
                    )}>
                      {step.label}
                    </p>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-[2px] mx-3 rounded-full',
                    isCompleted ? 'bg-emerald-200' : 'bg-[var(--border-subtle)]',
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-5">
        {/* ─── Step 1: Student Details ─── */}
        {currentStep === 'student' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Student Information</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Basic demographics and class applied for</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Aarav" />
              <Input label="Last Name *" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Mehta" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Date of Birth *" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              <Select
                label="Gender *"
                options={genderOptions}
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
              />
              <Select
                label="Class Applied For *"
                options={classOptions}
                value={classApplied}
                onChange={(e) => setClassApplied(e.target.value)}
                placeholder="Select class"
              />
            </div>
          </div>
        )}

        {/* ─── Step 2: Parent ─── */}
        {currentStep === 'parent' && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Guardian</h2>
                <p className="text-[0.75rem] text-[var(--text-muted)]">
                  Pick an existing guardian, or create a new one. The student will be linked to this guardian on approval.
                </p>
              </div>
              {parentMode === 'pick' ? (
                <button
                  onClick={() => {
                    setParentMode('create');
                    setSelectedParentId('');
                    setParentName('');
                    setParentEmail('');
                    setParentPhone('');
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create new
                </button>
              ) : (
                <button
                  onClick={() => {
                    setParentMode('pick');
                    setParentName('');
                    setParentEmail('');
                    setParentPhone('');
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-semibold text-[var(--text-tertiary)] bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Pick existing
                </button>
              )}
            </div>

            {parentMode === 'pick' && (
              <>
                <Select
                  label="Existing guardian *"
                  options={parentOptions}
                  value={selectedParentId}
                  onChange={(e) => handlePickParent(e.target.value)}
                />
                {selectedParentId && (
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-[0.6875rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-2">Linked guardian</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[0.625rem] text-emerald-700 uppercase mb-0.5">Name</p>
                        <p className="text-[0.8125rem] font-semibold text-emerald-900">{parentName}</p>
                      </div>
                      <div>
                        <p className="text-[0.625rem] text-emerald-700 uppercase mb-0.5">Phone</p>
                        <p className="text-[0.8125rem] font-semibold text-emerald-900">{parentPhone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[0.625rem] text-emerald-700 uppercase mb-0.5">Email</p>
                        <p className="text-[0.8125rem] font-semibold text-emerald-900 truncate">{parentEmail || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
                {parents.length === 0 && (
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                      No guardians in the system yet. Click <strong>+ Create new</strong> above to add one.
                    </p>
                  </div>
                )}
              </>
            )}

            {parentMode === 'create' && (
              <div className="rounded-xl bg-[var(--card-bg-hover)] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#002c98]" />
                  <p className="text-[0.8125rem] font-bold text-[var(--text-primary)]">New guardian details</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Full Name *" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Rajesh Mehta" />
                  <Input label="Phone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. 9876543210" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="e.g. guardian@email.com" />
                  <Input
                    label="Initial password *"
                    value={newParentPassword}
                    onChange={(e) => setNewParentPassword(e.target.value)}
                    placeholder="Auto-suggested"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Father name" value={newFatherName} onChange={(e) => setNewFatherName(e.target.value)} placeholder="e.g. Rajesh Mehta" />
                  <Input label="Mother name" value={newMotherName} onChange={(e) => setNewMotherName(e.target.value)} placeholder="e.g. Meera Mehta" />
                </div>
                <Input
                  label="Annual income (INR)"
                  type="number"
                  min={0}
                  value={newParentAnnualIncome}
                  onChange={(e) => setNewParentAnnualIncome(e.target.value)}
                  placeholder="100000"
                />
                <Button
                  onClick={handleCreateParent}
                  loading={creatingParent}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4" /> Create guardian
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Address ─── */}
        {currentStep === 'address' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Residential Address</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Where the student lives</p>
            </div>
            <div>
              <label className="block text-[0.6875rem] font-semibold text-[var(--text-tertiary)] mb-1.5">
                Address *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / flat, street, area, city, state, pincode"
                rows={3}
                className="w-full bg-[var(--card-bg)] rounded-lg px-3 py-2 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] resize-none"
              />
            </div>
          </div>
        )}

        {/* ─── Step 4: Review ─── */}
        {currentStep === 'review' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Review & Submit</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Verify the details below before submitting the application</p>
            </div>

            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Student</p>
              <div className="grid grid-cols-2 gap-4">
                <SummaryField label="Full Name" value={`${firstName} ${lastName}`} />
                <SummaryField label="Date of Birth" value={dateOfBirth} />
                <SummaryField label="Gender" value={gender} />
                <SummaryField label="Class Applied" value={`Class ${classApplied}`} />
              </div>
            </div>

            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Parent</p>
              <div className="grid grid-cols-3 gap-4">
                <SummaryField label="Name" value={parentName} />
                <SummaryField label="Phone" value={parentPhone} />
                <SummaryField label="Email" value={parentEmail || '—'} />
              </div>
            </div>

            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Address</p>
              <p className="text-[0.8125rem] text-[var(--text-primary)] whitespace-pre-wrap">{address}</p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-[0.6875rem] font-semibold text-blue-700 uppercase tracking-[0.06em] mb-2">On submission</p>
              <ul className="space-y-1 text-[0.75rem] text-blue-700">
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Application will be created and sent for document verification</span></li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>On approval, admission number will be auto-generated</span></li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Student profile and enrollment are created atomically by the backend</span></li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="tertiary" onClick={goBack} disabled={stepIndex === 0}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {currentStep === 'review' ? (
          <Button onClick={handleSubmit} loading={submitting}>
            <Check className="w-4 h-4" /> Submit Application
          </Button>
        ) : (
          <Button onClick={goNext}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.625rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5 capitalize">{label}</p>
      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] capitalize">{value}</p>
    </div>
  );
}
