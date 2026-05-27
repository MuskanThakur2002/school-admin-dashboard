import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, GraduationCap, BookOpen, Clock,
  ArrowRight, CheckCircle2, Users, LayoutGrid, RotateCcw,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAcademicStore } from '@/stores/academic.store';

export default function AcademicHubPage() {
  const navigate = useNavigate();
  const years = useAcademicStore((s) => s.years);
  const classes = useAcademicStore((s) => s.classes);
  const subjects = useAcademicStore((s) => s.subjects);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);

  useEffect(() => {
    if (years.length === 0) fetchYears();
    if (classes.length === 0) fetchClasses();
    if (subjects.length === 0) fetchSubjects();
  }, [years.length, classes.length, subjects.length, fetchYears, fetchClasses, fetchSubjects]);

  const activeYear = useMemo(() => years.find((y) => y.status === 'active'), [years]);
  const totalSections = useMemo(
    () => classes.reduce((sum, c) => sum + c.sections.length, 0),
    [classes],
  );
  const totalStudents = useMemo(
    () => classes.reduce((sum, c) => sum + c.sections.reduce((s, sec) => s + sec.studentCount, 0), 0),
    [classes],
  );

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Academic Setup</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">
            Configure academic years, class hierarchy, subjects, and timetables.
          </p>
        </div>

        {/* Active year banner */}
        {activeYear && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] shadow-[0_4px_16px_rgba(0,44,152,0.25)]">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-[18px] h-[18px] text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[0.625rem] font-semibold text-white/70 uppercase tracking-[0.06em]">Active Year</p>
              <p className="font-display text-[1.0625rem] font-extrabold text-white tracking-[-0.02em]">{activeYear.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Academic Years', value: years.length, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
          { label: 'Classes', value: classes.length, icon: LayoutGrid, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Sections', value: totalSections, icon: GraduationCap, color: 'bg-violet-50 text-violet-600' },
          { label: 'Subjects', value: subjects.length, icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Academic Years */}
        <button
          onClick={() => navigate('/academic/years')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Academic Years</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Manage academic year configuration and lifecycle.</p>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] leading-none">{years.length}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Total</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-emerald-600 leading-none">{years.filter((y) => y.status === 'active').length}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Active</p>
            </div>
          </div>
        </button>

        {/* Classes & Sections */}
        <button
          onClick={() => navigate('/academic/classes')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-emerald-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Classes & Sections</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Manage class hierarchy and section assignments.</p>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] leading-none">{classes.length}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Classes</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-emerald-600 leading-none">{totalSections}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Sections</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-blue-600 leading-none">{totalStudents}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Students</p>
            </div>
          </div>
        </button>

        {/* Subjects */}
        <button
          onClick={() => navigate('/academic/subjects')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Subjects</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Define the subjects offered at your school.</p>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] leading-none">{subjects.length}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Total</p>
            </div>
          </div>
        </button>

        {/* Timetable */}
        <button
          onClick={() => navigate('/academic/timetable')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Timetable</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Configure weekly periods and subject assignment per class.</p>
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)] text-[0.6875rem] text-[var(--text-muted)]">
            <Users className="w-3 h-3" /> 6 periods × 5 days
          </div>
        </button>

        {/* Rollover */}
        <button
          onClick={() => navigate('/academic/rollover')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-indigo-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Rollover</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Clone academic structure into a new year.</p>
          <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)] text-[0.6875rem] text-[var(--text-muted)]">
            <RotateCcw className="w-3 h-3" /> Copy classes, sections, subjects & timetable
          </div>
        </button>
      </div>
    </div>
  );
}
