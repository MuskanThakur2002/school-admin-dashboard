import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, BookOpen, Calendar, Clock,
  Phone, Mail, MapPin, Briefcase, Heart,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTeacherStore } from '@/stores/teacher.store';
import type { Teacher } from '@/types/teacher.types';

// ─── Mock timetable for teacher profile ─────────────────────
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const periods = ['1', '2', '3', '4', '5', '6', '7', '8'];

function generateMockTimetable(teacher: Teacher) {
  const slots: { day: string; period: string; subject: string; class: string }[] = [];
  const subj = teacher.subjects[0] || 'Free';
  let idx = 0;
  for (const ca of teacher.classAssignments) {
    for (const sec of ca.sections) {
      const dayIdx = idx % days.length;
      const periodIdx = (idx * 2) % periods.length;
      slots.push({ day: days[dayIdx], period: periods[periodIdx], subject: subj, class: `${ca.classShortName}-${sec}` });
      slots.push({ day: days[dayIdx], period: periods[(periodIdx + 1) % periods.length], subject: subj, class: `${ca.classShortName}-${sec}` });
      if (days[(dayIdx + 2) % days.length]) {
        slots.push({ day: days[(dayIdx + 2) % days.length], period: periods[periodIdx], subject: teacher.subjects[1] || subj, class: `${ca.classShortName}-${sec}` });
      }
      idx++;
    }
  }
  return slots;
}

// ─── Helpers ─────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5">
      <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-[0.8125rem] text-[var(--text-primary)] font-medium">{value || '—'}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" strokeWidth={2} />
        </div>
        <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────
const tabs = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'assignments', label: 'Assignments', icon: BookOpen },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'workload', label: 'Workload', icon: Clock },
];

// ─── Component ───────────────────────────────────────────────

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getTeacher = useTeacherStore((s) => s.getTeacher);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getTeacher(id)
      .then((t) => setTeacher(t))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getTeacher]);

  if (loading) {
    return (
      <div className="max-w-[1280px]">
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading teacher profile...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="max-w-[1280px]">
        <button
          onClick={() => navigate('/teachers')}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Teachers
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] font-semibold text-red-600 mb-1">Teacher not found</p>
          <p className="text-[0.75rem] text-[var(--text-muted)]">{error || `No teacher found with ID: ${id}`}</p>
        </div>
      </div>
    );
  }

  const fullName = `${teacher.firstName} ${teacher.lastName}`;
  const initials = `${teacher.firstName[0] || ''}${teacher.lastName[0] || ''}`;
  const timetableSlots = generateMockTimetable(teacher);
  const totalPeriods = timetableSlots.length;
  const totalClasses = teacher.classAssignments.length;
  const totalSections = teacher.classAssignments.reduce((sum, ca) => sum + ca.sections.length, 0);

  return (
    <div className="max-w-[1280px]">
      {/* Back */}
      <button
        onClick={() => navigate('/teachers')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Teachers
      </button>

      {/* Profile header */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <span className="font-display text-[1.5rem] font-extrabold text-white">{initials}</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
                {fullName}
              </h1>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                teacher.status === 'active' ? 'bg-emerald-50' : teacher.status === 'on_leave' ? 'bg-amber-50' : 'bg-slate-50',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  teacher.status === 'active' ? 'bg-emerald-500' : teacher.status === 'on_leave' ? 'bg-amber-500' : 'bg-slate-400',
                )} />
                <span className={cn(
                  'text-[0.6875rem] font-semibold',
                  teacher.status === 'active' ? 'text-emerald-700' : teacher.status === 'on_leave' ? 'text-amber-700' : 'text-slate-500',
                )}>
                  {teacher.status === 'on_leave' ? 'On Leave' : teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                </span>
              </div>
            </div>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {teacher.employeeId} &middot; {teacher.qualification}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[0.75rem] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {teacher.phone}</span>
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {teacher.email}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined: {teacher.joiningDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--card-bg)] rounded-xl p-1 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-[0.8125rem] font-semibold transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-[#0f172a] text-white shadow-sm'
                : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
            )}
          >
            <tab.icon className="w-4 h-4" strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SectionCard title="Personal Information" icon={User}>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Full Name" value={fullName} />
              <Field label="Date of Birth" value={teacher.dateOfBirth} />
              <Field label="Gender" value={teacher.gender} />
              <Field label="Blood Group" value={teacher.bloodGroup || ''} />
              <Field label="Email" value={teacher.email} />
              <Field label="Phone" value={teacher.phone} />
              <Field label="Emergency Contact" value={teacher.emergencyContact || ''} />
            </div>
          </SectionCard>
          <SectionCard title="Professional Information" icon={Briefcase}>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Employee ID" value={teacher.employeeId} />
              <Field label="Qualification" value={teacher.qualification} />
              <Field label="Specialization" value={teacher.specialization || ''} />
              <Field label="Joining Date" value={teacher.joiningDate} />
              <Field label="Status" value={teacher.status === 'on_leave' ? 'On Leave' : teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)} />
              <Field label="Subjects" value={teacher.subjects.join(', ')} />
            </div>
          </SectionCard>
          <SectionCard title="Address" icon={MapPin}>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Street Address" value={teacher.address} />
              <Field label="City" value={teacher.city} />
              <Field label="State" value={teacher.state} />
              <Field label="Pincode" value={teacher.pincode} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── Assignments ─── */}
      {activeTab === 'assignments' && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1.5fr_2fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Class', 'Sections', 'Subject'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>
          {teacher.classAssignments.map((ca, idx) => (
            <div
              key={ca.classShortName}
              className={cn(
                'grid grid-cols-[1.5fr_1.5fr_2fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
                idx < teacher.classAssignments.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">Class {ca.classShortName}</span>
              <div className="flex gap-1.5">
                {ca.sections.map((sec) => (
                  <span key={sec} className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[0.6875rem] font-semibold text-blue-700">{sec}</span>
                ))}
              </div>
              <span className="text-[0.8125rem] text-[var(--text-secondary)]">{teacher.subjects.join(', ')}</span>
            </div>
          ))}
          {teacher.classAssignments.length === 0 && (
            <div className="py-16 text-center">
              <BookOpen className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-2" />
              <p className="text-[0.8125rem] text-[var(--text-muted)]">No class assignments</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Timetable ─── */}
      {activeTab === 'timetable' && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-[var(--card-bg-hover)]">
                  <th className="text-left text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] px-4 py-3.5">Day / Period</th>
                  {periods.map((p) => (
                    <th key={p} className="text-center text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] px-2 py-3.5">P{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day, dayIdx) => (
                  <tr key={day} className={cn(dayIdx < days.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                    <td className="px-4 py-3 text-[0.8125rem] font-semibold text-[var(--text-primary)]">{day}</td>
                    {periods.map((p) => {
                      const slot = timetableSlots.find((s) => s.day === day && s.period === p);
                      return (
                        <td key={p} className="px-2 py-3 text-center">
                          {slot ? (
                            <div className="px-1.5 py-1 rounded-lg bg-blue-50">
                              <p className="text-[0.6875rem] font-semibold text-blue-700">{slot.subject}</p>
                              <p className="text-[0.5625rem] text-blue-500">{slot.class}</p>
                            </div>
                          ) : (
                            <span className="text-[0.6875rem] text-[var(--text-ghost)]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Workload ─── */}
      {activeTab === 'workload' && (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Periods / Week', value: totalPeriods, icon: Clock, color: 'bg-blue-50 text-blue-600' },
              { label: 'Classes', value: totalClasses, icon: BookOpen, color: 'bg-violet-50 text-violet-600' },
              { label: 'Sections', value: totalSections, icon: Heart, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Subjects', value: teacher.subjects.length, icon: Briefcase, color: 'bg-amber-50 text-amber-600' },
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

          <SectionCard title="Day-wise Breakdown" icon={Calendar}>
            <div className="space-y-3">
              {days.map((day) => {
                const daySlots = timetableSlots.filter((s) => s.day === day);
                const pct = periods.length > 0 ? Math.round((daySlots.length / periods.length) * 100) : 0;
                return (
                  <div key={day} className="flex items-center gap-4">
                    <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)] w-24 shrink-0">{day}</span>
                    <div className="flex-1 bg-[var(--card-bg-hover)] rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#002c98] to-[#3b6cf5] transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        <span className="text-[0.5625rem] font-bold text-white">{daySlots.length}p</span>
                      </div>
                    </div>
                    <span className="text-[0.75rem] text-[var(--text-muted)] w-12 text-right">{daySlots.length}/{periods.length}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
