import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, User, Users, MapPin, FileText,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import { useAcademicStore } from '@/stores/academic.store';
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

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepId>('student');
  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  // Form state — every field maps 1:1 to what the backend stores.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [classApplied, setClassApplied] = useState('');
  // Guardian fields — at least one parent (name + phone) is required; the
  // other parent and the email are optional. Mapped onto the Application's
  // single parentName/phoneNumber/email on submit.
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [address, setAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (academicYears.length === 0) fetchYears();
  }, [academicYears.length, fetchYears]);

  // ─── Validation per step ─────────────────────────────────────
  const validateStep = (step: StepId): string | null => {
    if (step === 'student') {
      if (!firstName.trim()) return 'First name is required';
      if (!dateOfBirth) return 'Date of birth is required';
      if (!classApplied.trim()) return 'Class applied is required';
    }
    if (step === 'parent') {
      const fatherComplete = !!fatherName.trim() && !!fatherPhone.trim();
      const motherComplete = !!motherName.trim() && !!motherPhone.trim();
      // Each parent must be all-or-nothing (a name needs a phone and vice versa).
      if (fatherName.trim() && !fatherPhone.trim()) return "Father's phone number is required";
      if (fatherPhone.trim() && !fatherName.trim()) return "Father's name is required";
      if (motherName.trim() && !motherPhone.trim()) return "Mother's phone number is required";
      if (motherPhone.trim() && !motherName.trim()) return "Mother's name is required";
      // At least one parent must be fully provided.
      if (!fatherComplete && !motherComplete) {
        return "Enter at least one parent's name and phone number";
      }
      if (guardianEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail.trim())) {
        return 'Guardian email is not valid';
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

    // Map both parents onto the Application's single contact fields. The
    // primary (whichever is fully filled, father first) drives the phone.
    const father = fatherName.trim();
    const mother = motherName.trim();
    const combinedName = father && mother ? `${father} & ${mother}` : father || mother;
    const primaryPhone = (father ? fatherPhone.trim() : '') || motherPhone.trim();

    setSubmitting(true);
    try {
      await createApplication({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        gender,
        classApplied,
        parentName: combinedName,
        parentPhone: primaryPhone,
        parentEmail: guardianEmail.trim() || undefined,
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
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Mehta" />
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

        {/* ─── Step 2: Guardian ─── */}
        {currentStep === 'parent' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Guardian Details</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">
                Enter the father's and/or mother's details. At least one parent's name and phone number is required.
              </p>
            </div>

            {/* Father */}
            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5 space-y-4">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em]">Father</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Father's Name" value={fatherName} onChange={(e) => setFatherName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="e.g. Rajesh Mehta" />
                <Input label="Father's Phone" inputMode="numeric" value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="e.g. 9876543210" />
              </div>
            </div>

            {/* Mother */}
            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5 space-y-4">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em]">Mother</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Mother's Name" value={motherName} onChange={(e) => setMotherName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="e.g. Meera Mehta" />
                <Input label="Mother's Phone" inputMode="numeric" value={motherPhone} onChange={(e) => setMotherPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="e.g. 9876543210" />
              </div>
            </div>

            <Input label="Email (optional)" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="e.g. guardian@email.com" />
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
                <SummaryField label="Class Applied" value={classApplied} />
              </div>
            </div>

            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Guardian</p>
              <div className="grid grid-cols-2 gap-4">
                <SummaryField label="Father's Name" value={fatherName || '—'} />
                <SummaryField label="Father's Phone" value={fatherPhone || '—'} />
                <SummaryField label="Mother's Name" value={motherName || '—'} />
                <SummaryField label="Mother's Phone" value={motherPhone || '—'} />
                <SummaryField label="Email" value={guardianEmail || '—'} />
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
