import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, User, Users, MapPin, FileText,
  GraduationCap, Search, X, Plus, Trash2, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import { useDemoStudentsStore } from '@/stores/students.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { DemoStudent, ParentGuardian } from '@/types/student.types';
import type { ApplicantDetails, ApplicantAddress } from '@/types/admissions.types';
import {
  genderOptions, bloodGroupOptions, religionOptions,
  categoryOptions, nationalityOptions, motherTongueOptions, stateOptions,
} from '@/utils/constants';
import { useClassOptions } from '@/hooks/useClassOptions';
import { useFeeStore } from '@/stores/fee.store';

// ─── Step definitions ──────────────────────────────────────────
const steps = [
  { id: 'student', label: 'Student Details', icon: User },
  { id: 'parents', label: 'Parents', icon: Users },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'siblings', label: 'Siblings', icon: GraduationCap },
  { id: 'review', label: 'Review', icon: FileText },
] as const;

type StepId = typeof steps[number]['id'];

// ─── Initial state ─────────────────────────────────────────────
const initialApplicant: ApplicantDetails = {
  firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
  nationality: 'Indian', bloodGroup: '', religion: '', category: '', motherTongue: '',
};

const initialAddress: ApplicantAddress = {
  line1: '', line2: '', city: '', state: '', pincode: '',
};

const emptyParent = (relation: 'father' | 'mother' | 'guardian'): ParentGuardian => ({
  id: crypto.randomUUID(), name: '', relation, phone: '', email: '', occupation: '', annualIncome: '',
});

// ─── Component ─────────────────────────────────────────────────
export default function NewAdmissionPage() {
  const navigate = useNavigate();
  const createApplication = useAdmissionsStore((s) => s.createApplication);
  const academicYears = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const searchStudents = useDemoStudentsStore((s) => s.searchStudents);
  const getStructureForClass = useFeeStore((s) => s.getStructureForClass);
  const classOptions = useClassOptions();
  const showToast = useUIStore((s) => s.showToast);

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepId>('student');
  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  // Fee structure preview
  const [feePreview, setFeePreview] = useState<{ name: string; total: number } | null>(null);

  // Form state
  const [applicant, setApplicant] = useState<ApplicantDetails>(initialApplicant);
  const [classApplied, setClassApplied] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [parents, setParents] = useState<ParentGuardian[]>([
    emptyParent('father'),
    emptyParent('mother'),
  ]);
  const [address, setAddress] = useState<ApplicantAddress>(initialAddress);
  const [remarks, setRemarks] = useState('');

  // Sibling search
  const [siblingQuery, setSiblingQuery] = useState('');
  const [siblingResults, setSiblingResults] = useState<DemoStudent[]>([]);
  const [selectedSiblings, setSelectedSiblings] = useState<DemoStudent[]>([]);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Debounced sibling search
  // Look up fee structure when class changes
  useEffect(() => {
    if (!classApplied) { setFeePreview(null); return; }
    getStructureForClass(classApplied).then((s) => {
      setFeePreview(s ? { name: s.name, total: s.totalAmount } : null);
    });
  }, [classApplied, getStructureForClass]);

  useEffect(() => {
    if (academicYears.length === 0) fetchYears();
  }, [academicYears.length, fetchYears]);

  useEffect(() => {
    if (!siblingQuery.trim()) {
      setSiblingResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchStudents(siblingQuery);
        setSiblingResults(
          results.filter((r) => !selectedSiblings.some((s) => s.id === r.id)),
        );
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [siblingQuery, searchStudents, selectedSiblings]);

  // ─── Validation per step ─────────────────────────────────────
  const validateStep = (step: StepId): string | null => {
    if (step === 'student') {
      if (!applicant.firstName.trim()) return 'First name is required';
      if (!applicant.lastName.trim()) return 'Last name is required';
      if (!applicant.dateOfBirth) return 'Date of birth is required';
      if (!classApplied.trim()) return 'Class applied is required';
    }
    if (step === 'parents') {
      const father = parents.find((p) => p.relation === 'father');
      const mother = parents.find((p) => p.relation === 'mother');
      if (!father?.name.trim() && !mother?.name.trim()) return 'At least one parent is required';
      const filled = parents.filter((p) => p.name.trim());
      for (const p of filled) {
        if (!p.phone.trim()) return `${p.relation} phone number is required`;
      }
    }
    if (step === 'address') {
      if (!address.line1.trim()) return 'Address line 1 is required';
      if (!address.city.trim()) return 'City is required';
      if (!address.state.trim()) return 'State is required';
      if (!address.pincode.trim()) return 'Pincode is required';
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

  const updateParent = (id: string, field: keyof ParentGuardian, value: string) => {
    setParents((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const addGuardian = () => {
    setParents((prev) => [...prev, emptyParent('guardian')]);
  };

  const removeParent = (id: string) => {
    setParents((prev) => prev.filter((p) => p.id !== id));
  };

  const addSibling = (s: DemoStudent) => {
    setSelectedSiblings((prev) => [...prev, s]);
    setSiblingQuery('');
    setSiblingResults([]);
  };

  const removeSibling = (id: string) => {
    setSelectedSiblings((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async () => {
    // Final validation — run all steps
    for (const s of steps) {
      if (s.id === 'siblings' || s.id === 'review') continue;
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
      const filledParents = parents.filter((p) => p.name.trim());
      const app = await createApplication({
        applicant,
        classApplied,
        parents: filledParents,
        address,
        previousSchool: previousSchool || undefined,
        siblingIds: selectedSiblings.length > 0 ? selectedSiblings.map((s) => s.id) : undefined,
        remarks: remarks || undefined,
      }, activeYear.id);
      showToast({
        type: 'success',
        title: 'Application submitted',
        message: `${app.applicationNo} — awaiting verification`,
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
      {/* Back */}
      <button
        onClick={() => navigate('/admissions')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Admissions
      </button>

      {/* Header */}
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

      {/* Form content */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-5">
        {/* ─── Step 1: Student Details ─── */}
        {currentStep === 'student' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Student Information</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Basic demographics and class applied for</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name *" value={applicant.firstName} onChange={(e) => setApplicant({ ...applicant, firstName: e.target.value })} placeholder="e.g. Aarav" />
              <Input label="Last Name *" value={applicant.lastName} onChange={(e) => setApplicant({ ...applicant, lastName: e.target.value })} placeholder="e.g. Mehta" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Date of Birth *" type="date" value={applicant.dateOfBirth} onChange={(e) => setApplicant({ ...applicant, dateOfBirth: e.target.value })} />
              <Select
                label="Gender *"
                options={genderOptions}
                value={applicant.gender}
                onChange={(e) => setApplicant({ ...applicant, gender: e.target.value as ApplicantDetails['gender'] })}
              />
              <Select
                label="Class Applied For *"
                options={classOptions}
                value={classApplied}
                onChange={(e) => setClassApplied(e.target.value)}
                placeholder="Select class"
              />
            </div>
            {/* Fee structure preview */}
            {feePreview && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-blue-700 text-[0.625rem] font-bold">₹</span>
                </div>
                <div className="flex-1">
                  <p className="text-[0.6875rem] font-semibold text-blue-800">Fee Structure: {feePreview.name}</p>
                  <p className="text-[0.625rem] text-blue-600">
                    Annual fee of {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feePreview.total)} will be auto-assigned on approval
                  </p>
                </div>
              </div>
            )}
            {classApplied && !feePreview && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-amber-700 text-[0.625rem] font-bold">!</span>
                </div>
                <p className="text-[0.6875rem] text-amber-700">No fee structure found for this class. Create one in Fee Engine first.</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <Select
                label="Blood Group"
                options={bloodGroupOptions}
                value={applicant.bloodGroup || ''}
                onChange={(e) => setApplicant({ ...applicant, bloodGroup: e.target.value })}
                placeholder="Select"
              />
              <Select
                label="Religion"
                options={religionOptions}
                value={applicant.religion || ''}
                onChange={(e) => setApplicant({ ...applicant, religion: e.target.value })}
                placeholder="Select"
              />
              <Select
                label="Category"
                options={categoryOptions}
                value={applicant.category || ''}
                onChange={(e) => setApplicant({ ...applicant, category: e.target.value })}
                placeholder="Select"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Nationality"
                options={nationalityOptions}
                value={applicant.nationality}
                onChange={(e) => setApplicant({ ...applicant, nationality: e.target.value })}
              />
              <Select
                label="Mother Tongue"
                options={motherTongueOptions}
                value={applicant.motherTongue || ''}
                onChange={(e) => setApplicant({ ...applicant, motherTongue: e.target.value })}
                placeholder="Select"
              />
            </div>
            <Input label="Previous School" value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} placeholder="e.g. DPS Noida" />
          </div>
        )}

        {/* ─── Step 2: Parents ─── */}
        {currentStep === 'parents' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Parent / Guardian Details</h2>
                <p className="text-[0.75rem] text-[var(--text-muted)]">At least one parent is required. Add additional guardians if needed.</p>
              </div>
              <button
                onClick={addGuardian}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Guardian
              </button>
            </div>

            {parents.map((parent) => (
              <div key={parent.id} className="rounded-xl bg-[var(--card-bg-hover)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-[0.6875rem] font-bold text-blue-700 capitalize">
                    {parent.relation}
                  </span>
                  {parent.relation === 'guardian' && (
                    <button
                      onClick={() => removeParent(parent.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input label="Full Name *" value={parent.name} onChange={(e) => updateParent(parent.id, 'name', e.target.value)} placeholder="e.g. Rajesh Mehta" />
                  <Input label="Phone *" value={parent.phone} onChange={(e) => updateParent(parent.id, 'phone', e.target.value)} placeholder="e.g. 9876543210" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input label="Email" value={parent.email} onChange={(e) => updateParent(parent.id, 'email', e.target.value)} placeholder="e.g. parent@email.com" />
                  <Input label="Occupation" value={parent.occupation} onChange={(e) => updateParent(parent.id, 'occupation', e.target.value)} placeholder="e.g. Business Owner" />
                </div>
                <Input label="Annual Income (INR)" value={parent.annualIncome} onChange={(e) => updateParent(parent.id, 'annualIncome', e.target.value)} placeholder="e.g. 12,00,000" />
              </div>
            ))}
          </div>
        )}

        {/* ─── Step 3: Address ─── */}
        {currentStep === 'address' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Residential Address</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Where the student lives</p>
            </div>
            <Input label="Address Line 1 *" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="e.g. 42 Green Park Society" />
            <Input label="Address Line 2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="e.g. Near City Mall" />
            <div className="grid grid-cols-3 gap-4">
              <Input label="City *" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="e.g. Mumbai" />
              <Select
                label="State *"
                options={stateOptions}
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                placeholder="Select state"
              />
              <Input label="Pincode *" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="e.g. 400001" />
            </div>
            <Input label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any additional notes for this admission" />
          </div>
        )}

        {/* ─── Step 4: Siblings ─── */}
        {currentStep === 'siblings' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Sibling Mapping</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Link this student to siblings already enrolled. Optional.</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
              <input
                type="text"
                value={siblingQuery}
                onChange={(e) => setSiblingQuery(e.target.value)}
                placeholder="Search by name or admission no..."
                className="w-full bg-[var(--card-bg-hover)] rounded-xl pl-10 pr-9 py-3 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
              />
              {siblingQuery && (
                <button onClick={() => setSiblingQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results */}
            {searching && siblingQuery && (
              <p className="text-[0.75rem] text-[var(--text-muted)]">Searching...</p>
            )}
            {!searching && siblingResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Results</p>
                {siblingResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addSibling(s)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)] transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                      <span className="text-white text-[0.6875rem] font-bold">{s.firstName[0]}{s.lastName[0]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{s.firstName} {s.lastName}</p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">{s.admissionNo} &middot; Class {s.class}-{s.section}</p>
                    </div>
                    <Plus className="w-4 h-4 text-[#002c98]" />
                  </button>
                ))}
              </div>
            )}
            {!searching && siblingQuery && siblingResults.length === 0 && (
              <p className="text-[0.75rem] text-[var(--text-muted)] py-2">No matching students found</p>
            )}

            {/* Selected */}
            {selectedSiblings.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.6875rem] font-medium text-emerald-600 uppercase tracking-[0.06em]">Linked Siblings ({selectedSiblings.length})</p>
                {selectedSiblings.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    <div className="flex-1">
                      <p className="text-[0.8125rem] font-semibold text-emerald-900">{s.firstName} {s.lastName}</p>
                      <p className="text-[0.6875rem] text-emerald-700">{s.admissionNo} &middot; Class {s.class}-{s.section}</p>
                    </div>
                    <button
                      onClick={() => removeSibling(s.id)}
                      className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedSiblings.length === 0 && !siblingQuery && (
              <div className="rounded-xl bg-[var(--card-bg-hover)] py-8 text-center">
                <GraduationCap className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-2" />
                <p className="text-[0.75rem] text-[var(--text-muted)]">No siblings linked yet</p>
                <p className="text-[0.625rem] text-[var(--text-ghost)] mt-0.5">Skip this step if there are no siblings enrolled</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 5: Review ─── */}
        {currentStep === 'review' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Review & Submit</h2>
              <p className="text-[0.75rem] text-[var(--text-muted)]">Verify the details below before submitting the application</p>
            </div>

            {/* Student summary */}
            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Student</p>
              <div className="grid grid-cols-3 gap-4">
                <SummaryField label="Full Name" value={`${applicant.firstName} ${applicant.lastName}`} />
                <SummaryField label="Date of Birth" value={applicant.dateOfBirth} />
                <SummaryField label="Gender" value={applicant.gender} />
                <SummaryField label="Class Applied" value={`Class ${classApplied}`} />
                <SummaryField label="Blood Group" value={applicant.bloodGroup || '—'} />
                <SummaryField label="Nationality" value={applicant.nationality} />
              </div>
              {previousSchool && (
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <SummaryField label="Previous School" value={previousSchool} />
                </div>
              )}
            </div>

            {/* Parents */}
            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Parents / Guardians</p>
              <div className="space-y-3">
                {parents.filter((p) => p.name.trim()).map((p) => (
                  <div key={p.id} className="grid grid-cols-3 gap-4">
                    <SummaryField label={p.relation} value={p.name} />
                    <SummaryField label="Phone" value={p.phone} />
                    <SummaryField label="Email" value={p.email || '—'} />
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
              <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Address</p>
              <p className="text-[0.8125rem] text-[var(--text-primary)]">
                {address.line1}{address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.city}, {address.state} - {address.pincode}
              </p>
            </div>

            {/* Siblings */}
            {selectedSiblings.length > 0 && (
              <div className="rounded-xl bg-[var(--card-bg-hover)] p-5">
                <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Linked Siblings</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSiblings.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-[0.6875rem] font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {s.firstName} {s.lastName} ({s.admissionNo})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fee plan info */}
            {feePreview && (
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-[0.6875rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-1">Fee Plan (auto-assigned on approval)</p>
                <div className="flex items-center justify-between">
                  <p className="text-[0.8125rem] font-semibold text-emerald-900">{feePreview.name}</p>
                  <p className="font-display text-[1rem] font-extrabold text-emerald-800">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feePreview.total)}/year
                  </p>
                </div>
              </div>
            )}

            {/* Info banner */}
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-[0.6875rem] font-semibold text-blue-700 uppercase tracking-[0.06em] mb-2">On submission</p>
              <ul className="space-y-1 text-[0.75rem] text-blue-700">
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Application will be created and sent for document verification</span></li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>On approval, admission number will be auto-generated</span></li>
                <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>Student profile will be created with ledger initialized{feePreview ? ` (${feePreview.name} — ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(feePreview.total)})` : ''}</span></li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
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

// ─── Helper ────────────────────────────────────────────────────
function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.625rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5 capitalize">{label}</p>
      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] capitalize">{value}</p>
    </div>
  );
}
