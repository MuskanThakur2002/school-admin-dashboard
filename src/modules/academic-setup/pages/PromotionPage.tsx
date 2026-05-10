import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Users, GraduationCap, AlertTriangle,
  Pause, Award, UserX, Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useDemoStudentsStore } from '@/stores/students.store';
import type { DemoStudent } from '@/types/student.types';
import type { PromotionAction } from '@/services/modules/students.api';

// ─── Action config ─────────────────────────────────────────

const actionConfig: Record<PromotionAction, {
  label: string;
  short: string;
  description: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  dot: string;
}> = {
  promote: {
    label: 'Promote to next class',
    short: 'Promote',
    description: 'Student moves to the selected target class & section',
    icon: ArrowRight,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  retain: {
    label: 'Retain in same class',
    short: 'Retain',
    description: 'Student stays in the current class next year',
    icon: Pause,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  graduate: {
    label: 'Graduate (pass out)',
    short: 'Graduate',
    description: 'Mark as alumni — final class pass-out',
    icon: Award,
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    dot: 'bg-violet-500',
  },
  withdraw: {
    label: 'Withdraw / TC issued',
    short: 'Withdraw',
    description: 'Student is leaving the school — transfer certificate issued',
    icon: UserX,
    bg: 'bg-red-50',
    text: 'text-red-600',
    dot: 'bg-red-500',
  },
};

const actionOptions = [
  { label: 'Promote', value: 'promote' },
  { label: 'Retain', value: 'retain' },
  { label: 'Graduate', value: 'graduate' },
  { label: 'Withdraw', value: 'withdraw' },
];

// ─── Per-student decision state ────────────────────────────

interface StudentDecision {
  student: DemoStudent;
  action: PromotionAction;
  targetClass: string;
  targetSection: string;
  included: boolean;
}

// ─── Component ─────────────────────────────────────────────

export default function PromotionPage() {
  const navigate = useNavigate();
  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const students = useDemoStudentsStore((s) => s.students);
  const fetchStudents = useDemoStudentsStore((s) => s.fetchStudents);
  const bulkPromote = useDemoStudentsStore((s) => s.bulkPromote);
  const showToast = useUIStore((s) => s.showToast);

  const [sourceClassId, setSourceClassId] = useState('');
  const [sourceSectionId, setSourceSectionId] = useState('');
  const [decisions, setDecisions] = useState<StudentDecision[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState<Record<PromotionAction, number> | null>(null);

  useEffect(() => {
    if (classes.length === 0) fetchClasses();
    if (students.length === 0) fetchStudents();
  }, [classes.length, students.length, fetchClasses, fetchStudents]);

  const sourceClass = classes.find((c) => c.id === sourceClassId);
  const sourceSection = sourceClass?.sections.find((s) => s.id === sourceSectionId);
  const nextClass = useMemo(
    () => sourceClass ? classes.find((c) => c.grade === sourceClass.grade + 1) : null,
    [sourceClass, classes],
  );
  const isFinalClass = sourceClass && !nextClass;

  // Eligible students: active, in source class + section
  const eligibleStudents = useMemo(() => {
    if (!sourceClass || !sourceSection) return [];
    return students.filter((s) =>
      s.class === sourceClass.shortName &&
      s.section === sourceSection.name &&
      s.status === 'active',
    );
  }, [students, sourceClass, sourceSection]);

  // When source changes, rebuild decisions with smart defaults
  useEffect(() => {
    if (eligibleStudents.length === 0) {
      setDecisions([]);
      return;
    }
    const defaultAction: PromotionAction = isFinalClass ? 'graduate' : 'promote';
    const defaultTargetClass = nextClass?.shortName || '';
    const defaultTargetSection = nextClass?.sections[0]?.name || 'A';

    setDecisions(
      eligibleStudents.map((student) => ({
        student,
        action: defaultAction,
        targetClass: defaultTargetClass,
        targetSection: defaultTargetSection,
        included: true,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceClassId, sourceSectionId, eligibleStudents.length, isFinalClass, nextClass]);

  // ─── Decision helpers ────────────────────────────────────
  const updateDecision = (studentId: string, patch: Partial<StudentDecision>) => {
    setDecisions((prev) =>
      prev.map((d) => (d.student.id === studentId ? { ...d, ...patch } : d)),
    );
  };

  const toggleInclude = (studentId: string) => {
    setDecisions((prev) =>
      prev.map((d) => (d.student.id === studentId ? { ...d, included: !d.included } : d)),
    );
  };

  const setBulkAction = (action: PromotionAction) => {
    setDecisions((prev) => prev.map((d) => ({ ...d, action })));
    showToast({ type: 'info', title: `All set to ${actionConfig[action].short}`, message: 'You can override individual students' });
  };

  const toggleAll = () => {
    const allIncluded = decisions.every((d) => d.included);
    setDecisions((prev) => prev.map((d) => ({ ...d, included: !allIncluded })));
  };

  // ─── Counts per action (only for included) ──────────────
  const counts = useMemo(() => {
    const c: Record<PromotionAction, number> = { promote: 0, retain: 0, graduate: 0, withdraw: 0 };
    for (const d of decisions) {
      if (d.included) c[d.action]++;
    }
    return c;
  }, [decisions]);

  const includedCount = decisions.filter((d) => d.included).length;

  // ─── Submit ────────────────────────────────────────────
  const handleApply = async () => {
    const included = decisions.filter((d) => d.included);
    if (included.length === 0) {
      showToast({ type: 'error', title: 'No students selected' });
      return;
    }

    // Validate promotes have target
    for (const d of included) {
      if (d.action === 'promote' && (!d.targetClass || !d.targetSection)) {
        showToast({ type: 'error', title: 'Missing target', message: `${d.student.firstName} ${d.student.lastName} needs a target class & section` });
        return;
      }
    }

    setSubmitting(true);
    try {
      await bulkPromote(
        included.map((d) => ({
          studentId: d.student.id,
          action: d.action,
          targetClass: d.action === 'promote' ? d.targetClass : undefined,
          targetSection: d.action === 'promote' ? d.targetSection : undefined,
        })),
      );
      setSummary({ ...counts });
      setCompleted(true);
      showToast({
        type: 'success',
        title: 'Promotion applied',
        message: `${included.length} students processed`,
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSourceClassId('');
    setSourceSectionId('');
    setDecisions([]);
    setCompleted(false);
    setSummary(null);
  };

  // ─── Completion screen ─────────────────────────────────
  if (completed && summary) {
    return (
      <div className="max-w-[1280px]">
        <div className="bg-[var(--card-bg)] rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] max-w-xl mx-auto mt-12">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] mb-2">Promotion Completed</h2>
            <p className="text-[0.8125rem] text-[var(--text-muted)]">
              {sourceClass?.name} — Section {sourceSection?.name}
            </p>
          </div>

          {/* Summary breakdown */}
          <div className="space-y-2 mb-6">
            {(Object.keys(summary) as PromotionAction[]).map((action) => {
              const count = summary[action];
              if (count === 0) return null;
              const cfg = actionConfig[action];
              const Icon = cfg.icon;
              return (
                <div key={action} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl', cfg.bg)}>
                  <Icon className={cn('w-4 h-4', cfg.text)} strokeWidth={2} />
                  <span className={cn('text-[0.8125rem] font-semibold flex-1', cfg.text)}>{cfg.short}</span>
                  <span className={cn('font-display text-[1rem] font-extrabold', cfg.text)}>{count}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-center">
            <Button variant="tertiary" onClick={() => navigate('/academic')}>Back to Academic</Button>
            <Button onClick={reset}>Promote Another Class</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      <button
        onClick={() => navigate('/academic')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Academic Setup
      </button>

      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Promotion</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">
          Promote, retain, graduate, or withdraw students at the end of the academic year
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50/50 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-[18px] h-[18px] text-amber-600" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] mb-0.5">How promotion works</h3>
          <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
            Pick a source class + section to see all its active students. Each student has an action:
            <b> Promote</b> (move to next class), <b>Retain</b> (stay in same class),
            <b> Graduate</b> (final class pass-out), or <b>Withdraw</b> (TC issued).
            Set a default for everyone, then override individual students as needed.
          </p>
        </div>
      </div>

      {/* Source selector */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Step 1 — Select Source</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Source Class *"
            options={classes.map((c) => ({ label: c.name, value: c.id }))}
            value={sourceClassId}
            onChange={(e) => { setSourceClassId(e.target.value); setSourceSectionId(''); }}
            placeholder="Select class"
          />
          <Select
            label="Source Section *"
            options={(sourceClass?.sections || []).map((s) => ({ label: `Section ${s.name}`, value: s.id }))}
            value={sourceSectionId}
            onChange={(e) => setSourceSectionId(e.target.value)}
            placeholder={sourceClass ? 'Select section' : 'Select a class first'}
          />
        </div>
      </div>

      {/* Empty state */}
      {!sourceClass || !sourceSection ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <GraduationCap className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" />
          <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">Select a source class and section</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Eligible students will appear here</p>
        </div>
      ) : eligibleStudents.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Users className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" />
          <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No eligible students found</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">
            No active students in {sourceClass.name} — Section {sourceSection.name}
          </p>
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          <div className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-4">
            <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">
              Step 2 — Set Default Action for All
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(actionConfig) as PromotionAction[]).map((action) => {
                const cfg = actionConfig[action];
                const Icon = cfg.icon;
                // Hide "Graduate" for non-final classes, "Promote" for final classes
                if (isFinalClass && action === 'promote') return null;
                if (!isFinalClass && action === 'graduate') return null;
                return (
                  <button
                    key={action}
                    onClick={() => setBulkAction(action)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[0.75rem] font-semibold transition-all',
                      cfg.bg,
                      cfg.text,
                      'hover:brightness-95',
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                    Set all to {cfg.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Student table */}
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-24">
            <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] px-6 pt-5 mb-2">
              Step 3 — Review & Override Individual Students
            </p>

            {/* Table header */}
            <div className="flex items-center gap-4 px-6 py-3 bg-[var(--card-bg-hover)]">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2"
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                  includedCount === decisions.length
                    ? 'bg-[#002c98] border-[#002c98]'
                    : includedCount > 0
                      ? 'bg-[#002c98]/40 border-[#002c98]'
                      : 'bg-[var(--card-bg)] border-[var(--text-ghost)]',
                )}>
                  {includedCount > 0 && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  {includedCount}/{decisions.length} included
                </span>
              </button>
              <div className="ml-auto flex items-center gap-3 text-[0.6875rem]">
                {(['promote', 'retain', 'graduate', 'withdraw'] as PromotionAction[]).map((action) => {
                  const count = counts[action];
                  if (count === 0) return null;
                  const cfg = actionConfig[action];
                  return (
                    <div key={action} className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md', cfg.bg)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                      <span className={cn('font-semibold', cfg.text)}>{count} {cfg.short}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            {decisions.map((d, idx) => {
              const cfg = actionConfig[d.action];
              const targetSections = d.targetClass
                ? classes.find((c) => c.shortName === d.targetClass)?.sections || []
                : [];
              return (
                <div
                  key={d.student.id}
                  className={cn(
                    'grid grid-cols-[auto_auto_1fr_auto_auto] gap-4 items-center px-6 py-3.5 transition-colors',
                    d.included ? 'hover:bg-[var(--card-bg-hover)]' : 'opacity-40',
                    idx < decisions.length - 1 && 'border-b border-[var(--border-subtle)]',
                  )}
                >
                  {/* Include checkbox */}
                  <button onClick={() => toggleInclude(d.student.id)} className="shrink-0">
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center',
                      d.included ? 'bg-[#002c98] border-[#002c98]' : 'bg-[var(--card-bg)] border-[var(--text-ghost)]',
                    )}>
                      {d.included && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                    <span className="text-white text-[0.625rem] font-bold">
                      {d.student.firstName[0]}{d.student.lastName[0]}
                    </span>
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">
                      {d.student.firstName} {d.student.lastName}
                    </p>
                    <p className="text-[0.6875rem] text-[var(--text-muted)]">
                      {d.student.admissionNo} &middot; Roll #{d.student.rollNo}
                    </p>
                  </div>

                  {/* Action dropdown + target */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={d.action}
                      onChange={(e) => updateDecision(d.student.id, { action: e.target.value as PromotionAction })}
                      disabled={!d.included}
                      className={cn(
                        'appearance-none px-3 py-1.5 pr-8 rounded-lg text-[0.75rem] font-semibold cursor-pointer outline-none transition-all',
                        'bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>\')]',
                        'bg-no-repeat bg-[right_8px_center]',
                        cfg.bg, cfg.text,
                      )}
                    >
                      {actionOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {d.action === 'promote' && (
                      <>
                        <ArrowRight className="w-3 h-3 text-[var(--text-ghost)]" />
                        <select
                          value={d.targetClass}
                          onChange={(e) => updateDecision(d.student.id, { targetClass: e.target.value, targetSection: 'A' })}
                          disabled={!d.included}
                          className="appearance-none px-2.5 py-1.5 pr-7 rounded-lg text-[0.75rem] font-semibold bg-[var(--card-bg-hover)] text-[var(--text-primary)] outline-none cursor-pointer"
                          style={{
                            backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>\')',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                          }}
                        >
                          <option value="">Class</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.shortName}>{c.shortName}</option>
                          ))}
                        </select>
                        <select
                          value={d.targetSection}
                          onChange={(e) => updateDecision(d.student.id, { targetSection: e.target.value })}
                          disabled={!d.included || !d.targetClass}
                          className="appearance-none px-2.5 py-1.5 pr-7 rounded-lg text-[0.75rem] font-semibold bg-[var(--card-bg-hover)] text-[var(--text-primary)] outline-none cursor-pointer disabled:opacity-50"
                          style={{
                            backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>\')',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                          }}
                        >
                          {targetSections.length === 0 ? (
                            <option value="A">A</option>
                          ) : targetSections.map((s) => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>

                  {/* Current badge */}
                  <span className="text-[0.6875rem] text-[var(--text-muted)] whitespace-nowrap">
                    {d.student.class}-{d.student.section}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sticky footer — apply button */}
          <div className="fixed bottom-4 left-[250px] right-4 mx-auto max-w-[1264px] bg-[var(--card-bg)] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex items-center gap-4 z-30">
            <div className="flex items-center gap-2 shrink-0">
              <Zap className="w-4 h-4 text-[#002c98]" />
              <p className="text-[0.8125rem] font-bold text-[var(--text-primary)]">
                Ready to apply
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2 flex-1">
              {(['promote', 'retain', 'graduate', 'withdraw'] as PromotionAction[]).map((action) => {
                const count = counts[action];
                if (count === 0) return null;
                const cfg = actionConfig[action];
                const Icon = cfg.icon;
                return (
                  <div key={action} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg', cfg.bg)}>
                    <Icon className={cn('w-3 h-3', cfg.text)} strokeWidth={2.5} />
                    <span className={cn('text-[0.6875rem] font-semibold', cfg.text)}>{count} {cfg.short}</span>
                  </div>
                );
              })}
            </div>
            <Button
              onClick={handleApply}
              loading={submitting}
              disabled={includedCount === 0}
            >
              Apply to {includedCount} {includedCount === 1 ? 'Student' : 'Students'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
