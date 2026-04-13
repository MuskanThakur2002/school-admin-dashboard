import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, RotateCcw, CheckCircle2,
  LayoutGrid, BookOpen, Clock, Users, Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { RolloverPreview, RolloverResult } from '@/types/academic.types';

type WizardStep = 'select' | 'configure' | 'preview' | 'done';

export default function RolloverWizardPage() {
  const navigate = useNavigate();
  const years = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const getRolloverPreview = useAcademicStore((s) => s.getRolloverPreview);
  const executeRollover = useAcademicStore((s) => s.executeRollover);
  const showToast = useUIStore((s) => s.showToast);

  const [step, setStep] = useState<WizardStep>('select');
  const [sourceYearId, setSourceYearId] = useState('');
  const [targetYearId, setTargetYearId] = useState('');
  const [copyClasses, setCopyClasses] = useState(true);
  const [copySections, setCopySections] = useState(true);
  const [copySubjects, setCopySubjects] = useState(true);
  const [copyTimetable, setCopyTimetable] = useState(false);
  const [preview, setPreview] = useState<RolloverPreview | null>(null);
  const [result, setResult] = useState<RolloverResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (years.length === 0) fetchYears();
  }, [years.length, fetchYears]);

  const activeYear = useMemo(() => years.find((y) => y.status === 'active'), [years]);
  const targetYears = useMemo(() => years.filter((y) => y.status === 'upcoming'), [years]);

  // Default source to active year
  useEffect(() => {
    if (activeYear && !sourceYearId) setSourceYearId(activeYear.id);
  }, [activeYear, sourceYearId]);

  const handleNextToConfig = () => {
    if (!sourceYearId || !targetYearId) {
      showToast({ type: 'error', title: 'Select both years', message: 'Choose a source and target academic year' });
      return;
    }
    setStep('configure');
  };

  const handleNextToPreview = async () => {
    if (!copyClasses && !copySubjects && !copyTimetable) {
      showToast({ type: 'error', title: 'Nothing to copy', message: 'Select at least one item to roll over' });
      return;
    }
    setLoading(true);
    try {
      const p = await getRolloverPreview(sourceYearId, targetYearId);
      setPreview(p);
      setStep('preview');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const r = await executeRollover({
        sourceYearId, targetYearId,
        copyClasses, copySections, copySubjects, copyTimetable,
      });
      setResult(r);
      setStep('done');
      showToast({ type: 'success', title: 'Rollover complete', message: 'Academic structure cloned successfully' });
    } catch (err) {
      showToast({ type: 'error', title: 'Rollover failed', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const sourceName = years.find((y) => y.id === sourceYearId)?.name ?? '—';
  const targetName = years.find((y) => y.id === targetYearId)?.name ?? '—';

  const stepIndex = ['select', 'configure', 'preview', 'done'].indexOf(step);

  return (
    <div className="max-w-[860px]">
      {/* Back */}
      <button
        onClick={() => navigate('/academic')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Academic Setup
      </button>

      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Academic Rollover</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Clone academic structure from one year into the next</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3 mb-8">
        {['Select Years', 'Configure', 'Preview', 'Done'].map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            {i > 0 && <div className={cn('w-8 h-px', i <= stepIndex ? 'bg-[#002c98]' : 'bg-[var(--border-subtle)]')} />}
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[0.75rem] font-bold transition-all',
                i < stepIndex ? 'bg-emerald-500 text-white' :
                i === stepIndex ? 'bg-[#002c98] text-white shadow-[0_2px_8px_rgba(0,44,152,0.3)]' :
                'bg-[var(--border-subtle)] text-[var(--text-muted)]',
              )}>
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-[0.75rem] font-medium hidden sm:block',
                i === stepIndex ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]',
              )}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Step 1: Select Years ─── */}
      {step === 'select' && (
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Select Academic Years</h2>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mb-6">Choose which year to copy from and which year to copy into.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Source */}
            <div>
              <label className="block text-[0.8125rem] font-medium text-[var(--text-primary)] mb-2">Source Year</label>
              <div className="space-y-2">
                {years.filter((y) => y.status === 'active' || y.status === 'archived').map((y) => (
                  <button
                    key={y.id}
                    onClick={() => setSourceYearId(y.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl transition-all',
                      sourceYearId === y.id
                        ? 'bg-[#002c98]/5 ring-2 ring-[#002c98]'
                        : 'bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)]',
                    )}
                  >
                    <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{y.name}</p>
                    <p className="text-[0.6875rem] text-[var(--text-muted)]">{y.totalClasses} classes · {y.totalStudents} students · {y.status}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div>
              <label className="block text-[0.8125rem] font-medium text-[var(--text-primary)] mb-2">Target Year</label>
              {targetYears.length === 0 ? (
                <div className="px-4 py-8 rounded-xl bg-[var(--card-bg-hover)] text-center">
                  <p className="text-[0.8125rem] text-[var(--text-muted)]">No upcoming years available. Create one first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {targetYears.map((y) => (
                    <button
                      key={y.id}
                      onClick={() => setTargetYearId(y.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 rounded-xl transition-all',
                        targetYearId === y.id
                          ? 'bg-[#002c98]/5 ring-2 ring-[#002c98]'
                          : 'bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)]',
                      )}
                    >
                      <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{y.name}</p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">{y.startDate} to {y.endDate}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNextToConfig} disabled={!sourceYearId || !targetYearId}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Configure ─── */}
      {step === 'configure' && (
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Configure Rollover</h2>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mb-6">
            Copying from <strong>{sourceName}</strong> into <strong>{targetName}</strong>. Select what to include.
          </p>

          <div className="space-y-3 mb-6">
            {[
              { key: 'classes', label: 'Classes', desc: 'Copy all class definitions (I through XII)', icon: LayoutGrid, color: 'text-emerald-600 bg-emerald-50', checked: copyClasses, toggle: setCopyClasses },
              { key: 'sections', label: 'Sections', desc: 'Copy sections within each class (A, B, C...)', icon: Users, color: 'text-violet-600 bg-violet-50', checked: copySections, toggle: setCopySections, indent: true },
              { key: 'subjects', label: 'Subjects & Mapping', desc: 'Copy subject definitions and class assignments', icon: BookOpen, color: 'text-blue-600 bg-blue-50', checked: copySubjects, toggle: setCopySubjects },
              { key: 'timetable', label: 'Timetable', desc: 'Copy period schedule and subject-teacher assignments', icon: Clock, color: 'text-amber-600 bg-amber-50', checked: copyTimetable, toggle: setCopyTimetable },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => item.toggle(!item.checked)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all',
                  item.checked ? 'bg-[#002c98]/5 ring-1 ring-[#002c98]/20' : 'bg-[var(--card-bg-hover)]',
                  item.indent && 'ml-6',
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', item.color)}>
                  <item.icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-[0.75rem] text-[var(--text-muted)]">{item.desc}</p>
                </div>
                <div className={cn(
                  'w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all',
                  item.checked ? 'bg-[#002c98] text-white' : 'bg-[var(--border-subtle)]',
                )}>
                  {item.checked && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="tertiary" onClick={() => setStep('select')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={handleNextToPreview} loading={loading}>
              Preview <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Preview ─── */}
      {step === 'preview' && preview && (
        <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[1rem] font-bold text-[var(--text-primary)] mb-1">Review & Confirm</h2>
          <p className="text-[0.8125rem] text-[var(--text-muted)] mb-6">
            The following structure will be cloned from <strong>{sourceName}</strong> into <strong>{targetName}</strong>.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Classes', value: copyClasses ? preview.classCount : 0, active: copyClasses },
              { label: 'Sections', value: copySections ? preview.sectionCount : 0, active: copySections },
              { label: 'Subjects', value: copySubjects ? preview.subjectCount : 0, active: copySubjects },
              { label: 'Timetable Slots', value: copyTimetable ? preview.timetableSlotCount : 0, active: copyTimetable },
            ].map((item) => (
              <div
                key={item.label}
                className={cn(
                  'rounded-xl px-4 py-4 text-center',
                  item.active ? 'bg-[#002c98]/5' : 'bg-[var(--card-bg-hover)] opacity-50',
                )}
              >
                <p className="font-display text-[1.5rem] font-extrabold text-[var(--text-primary)] leading-none">{item.value}</p>
                <p className="text-[0.6875rem] text-[var(--text-muted)] font-medium mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-amber-50 px-4 py-3 mb-6">
            <p className="text-[0.8125rem] font-medium text-amber-800">
              This will create new records in <strong>{targetName}</strong>. Student data will not be copied — only structural configuration.
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="tertiary" onClick={() => setStep('configure')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={handleExecute} loading={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Cloning...</>
              ) : (
                <><RotateCcw className="w-4 h-4 mr-1" /> Execute Rollover</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Done ─── */}
      {step === 'done' && result && (
        <div className="bg-[var(--card-bg)] rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.8} />
          </div>
          <h2 className="font-display text-[1.25rem] font-bold text-[var(--text-primary)] mb-2">Rollover Complete</h2>
          <p className="text-[0.875rem] text-[var(--text-muted)] mb-6">
            Academic structure has been cloned from <strong>{sourceName}</strong> into <strong>{targetName}</strong>.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-[600px] mx-auto">
            {[
              { label: 'Classes', value: result.classesCloned },
              { label: 'Sections', value: result.sectionsCloned },
              { label: 'Subjects', value: result.subjectsCloned },
              { label: 'Timetable Slots', value: result.timetableSlotsCloned },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-emerald-50 px-4 py-4">
                <p className="font-display text-[1.5rem] font-extrabold text-emerald-700 leading-none">{item.value}</p>
                <p className="text-[0.6875rem] text-emerald-600 font-medium mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="tertiary" onClick={() => navigate('/academic/years')}>View Academic Years</Button>
            <Button onClick={() => navigate('/academic')}>Back to Hub</Button>
          </div>
        </div>
      )}
    </div>
  );
}
