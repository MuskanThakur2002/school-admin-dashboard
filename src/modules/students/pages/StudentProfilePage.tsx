import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, GraduationCap, Calendar, Wallet, Building2, Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStudentsStore } from '@/stores/students.store';
import type { Student } from '@/types/student.types';

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

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getStudent = useStudentsStore((s) => s.getStudent);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getStudent(id)
      .then((s) => setStudent(s))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getStudent]);

  if (loading) {
    return (
      <div className="max-w-[1280px]">
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-[1280px]">
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] font-semibold text-red-600 mb-1">Student not found</p>
          <p className="text-[0.75rem] text-[var(--text-muted)]">{error || `No student found with ID: ${id}`}</p>
        </div>
      </div>
    );
  }

  const initials = (student.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

  const isActive = student.status?.toLowerCase() === 'active';

  return (
    <div className="max-w-[1280px]">
      <button
        onClick={() => navigate('/students')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <span className="font-display text-[1.5rem] font-extrabold text-white">{initials}</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
                {student.name}
              </h1>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                isActive ? 'bg-emerald-50' : 'bg-slate-50',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isActive ? 'bg-emerald-500' : 'bg-slate-400',
                )} />
                <span className={cn(
                  'text-[0.6875rem] font-semibold capitalize',
                  isActive ? 'text-emerald-700' : 'text-slate-500',
                )}>
                  {student.status}
                </span>
              </div>
            </div>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {student.admissionNumber} &middot; {student.gender}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[0.75rem] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> DOB: {student.dateOfBirth || '—'}</span>
              {student.enrollmentDate && (
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Enrolled: {student.enrollmentDate}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigate(`/ledger/${student.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-all"
            >
              <Wallet className="w-3.5 h-3.5" /> View Ledger
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Full Name" value={student.name} />
            <Field label="Date of Birth" value={student.dateOfBirth} />
            <Field label="Gender" value={student.gender} />
            <Field label="Status" value={student.status} />
          </div>
        </SectionCard>

        <SectionCard title="Enrolment" icon={GraduationCap}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Admission No." value={student.admissionNumber} />
            <Field label="Enrolment Date" value={student.enrollmentDate || ''} />
            <Field label="Application ID" value={student.applicationId || ''} />
            <Field label="Sibling Group" value={student.siblingGroupId || ''} />
          </div>
        </SectionCard>

        <SectionCard title="Parent" icon={Users}>
          <div className="grid grid-cols-1 gap-x-6">
            <Field label="Parent ID" value={student.parentId} />
            <button
              onClick={() => navigate(`/parents/${student.parentId}`)}
              className="mt-1 text-left text-[0.75rem] font-semibold text-[#002c98] hover:underline"
            >
              View parent profile →
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Other" icon={Building2}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Transport Route" value={student.transportRoute || ''} />
            <Field label="Medical Notes" value={student.medicalNotes || ''} />
            {student.school && <Field label="School" value={student.school.name} />}
            <Field label="Created" value={student.createdAt?.split('T')[0] ?? ''} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
