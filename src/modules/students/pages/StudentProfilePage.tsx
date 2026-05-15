import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, GraduationCap, Calendar, Wallet, Building2, Users,
  FileText, CheckCircle2, Clock, ExternalLink, Pencil, XCircle, Plane, ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStudentsStore } from '@/stores/students.store';
import { useAuthStore } from '@/stores/auth.store';
import { useAcademicStore } from '@/stores/academic.store';
import { applicationsApi } from '@/services/modules/applications.api';
import { enrollmentsApi } from '@/services/modules/enrollments.api';
import { attendanceApi } from '@/services/modules/attendance.api';
import { isSuperAdmin } from '@/types/auth.types';
import { EditStudentModal } from '@/modules/students/components/EditStudentModal';
import type { Student, StudentEnrollment } from '@/types/student.types';
import type { AttendanceRecord } from '@/types/attendance.types';
import type { ApplicationDocument } from '@/types/admissions.types';

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

  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);

  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getStudent(id)
      .then((s) => setStudent(s))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getStudent]);

  useEffect(() => {
    if (!student?.applicationId) {
      setDocuments([]);
      return;
    }
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) return;

    setDocsLoading(true);
    setDocsError(null);
    applicationsApi
      .listDocuments(schoolId, student.applicationId)
      .then((docs) => setDocuments(docs))
      .catch((err) => setDocsError((err as Error).message))
      .finally(() => setDocsLoading(false));
  }, [student?.applicationId]);

  // Need class names to label enrollments.
  useEffect(() => {
    if (classes.length === 0) fetchClasses();
  }, [classes.length, fetchClasses]);

  // Fetch this student's enrollments — used by Current Enrollment, Enrollment
  // History, and to scope the Attendance lookup below.
  useEffect(() => {
    if (!student?.id) return;
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) return;

    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    enrollmentsApi
      .list(schoolId, { studentId: student.id, limit: 100 })
      .then((res) => setEnrollments(res.data))
      .catch((err) => setEnrollmentsError((err as Error).message))
      .finally(() => setEnrollmentsLoading(false));
  }, [student?.id]);

  // Current enrollment = most recently joined. Used as the source for the
  // Attendance section (which queries by studentEnrollmentId).
  const currentEnrollment = useMemo(() => {
    if (enrollments.length === 0) return null;
    const sorted = [...enrollments].sort((a, b) => {
      const da = a.joinedAt ?? a.createdAt;
      const db = b.joinedAt ?? b.createdAt;
      return db.localeCompare(da);
    });
    return sorted[0];
  }, [enrollments]);

  useEffect(() => {
    if (!currentEnrollment?.id) {
      setAttendance([]);
      return;
    }
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) return;

    setAttendanceLoading(true);
    setAttendanceError(null);
    attendanceApi
      .list(schoolId, { studentEnrollmentId: currentEnrollment.id, limit: 30 })
      .then((res) => setAttendance(res.data))
      .catch((err) => setAttendanceError((err as Error).message))
      .finally(() => setAttendanceLoading(false));
  }, [currentEnrollment?.id]);

  const attendanceCounts = useMemo(() => {
    const c = { total: attendance.length, present: 0, absent: 0, late: 0, leave: 0 };
    for (const r of attendance) {
      if (r.status === 'Present') c.present += 1;
      else if (r.status === 'Absent') c.absent += 1;
      else if (r.status === 'Late') c.late += 1;
      else if (r.status === 'Leave') c.leave += 1;
    }
    return c;
  }, [attendance]);

  const currentEnrollmentLabel = useMemo(() => {
    if (!currentEnrollment) return null;
    const className = classes.find((c) => c.id === currentEnrollment.classSection?.classMasterId)?.name;
    const section = currentEnrollment.classSection?.section;
    if (!className && !section) return null;
    return `${className ?? 'Class'} – ${section ?? '—'}`;
  }, [currentEnrollment, classes]);

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
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.75rem] font-semibold text-white bg-[#002c98] hover:bg-[#001f6e] transition-all shadow-[0_2px_8px_rgba(0,44,152,0.25)]"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
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
            <Field label="Current Class" value={currentEnrollmentLabel || (enrollmentsLoading ? 'Loading…' : 'Not enrolled')} />
            <Field label="Roll Number" value={currentEnrollment ? String(currentEnrollment.rollNumber) : ''} />
            <Field label="Application ID" value={student.applicationId || ''} />
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

      <div className="mt-5">
        <SectionCard title="Documents" icon={FileText}>
          {!student.applicationId ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">
              No application linked — documents are uploaded during admission.
            </p>
          ) : docsLoading ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">Loading documents...</p>
          ) : docsError ? (
            <p className="text-[0.8125rem] text-red-600 py-2">{docsError}</p>
          ) : documents.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">No documents uploaded yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border-color,#eef0f3)]">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)] mt-0.5">
                        {doc.type} &middot; Uploaded {doc.uploadedAt?.split('T')[0] ?? '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                      doc.isVerified ? 'bg-emerald-50' : 'bg-amber-50',
                    )}>
                      {doc.isVerified ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                      ) : (
                        <Clock className="w-3 h-3 text-amber-600" strokeWidth={2.5} />
                      )}
                      <span className={cn(
                        'text-[0.6875rem] font-semibold',
                        doc.isVerified ? 'text-emerald-700' : 'text-amber-700',
                      )}>
                        {doc.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.6875rem] font-semibold text-[#002c98] hover:bg-blue-50 transition-colors"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Attendance (last 30 records)" icon={ClipboardCheck}>
          {!currentEnrollment ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">
              {enrollmentsLoading ? 'Loading…' : 'Student is not currently enrolled — attendance starts after enrollment.'}
            </p>
          ) : attendanceLoading ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">Loading attendance…</p>
          ) : attendanceError ? (
            <p className="text-[0.8125rem] text-red-600 py-2">{attendanceError}</p>
          ) : attendance.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">No attendance recorded yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Present', value: attendanceCounts.present, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Absent',  value: attendanceCounts.absent,  icon: XCircle,      color: 'text-red-600 bg-red-50' },
                  { label: 'Late',    value: attendanceCounts.late,    icon: Clock,        color: 'text-amber-600 bg-amber-50' },
                  { label: 'Leave',   value: attendanceCounts.leave,   icon: Plane,        color: 'text-violet-600 bg-violet-50' },
                ].map((s) => (
                  <div key={s.label} className={cn('rounded-lg px-3 py-2', s.color)}>
                    <div className="flex items-center gap-1.5">
                      <s.icon className="w-3 h-3" strokeWidth={2.5} />
                      <span className="text-[0.6875rem] font-semibold uppercase tracking-wide">{s.label}</span>
                    </div>
                    <p className="font-display text-[1.125rem] font-extrabold mt-0.5 leading-none">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-[var(--border-color,#eef0f3)] max-h-[280px] overflow-y-auto">
                {attendance.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-[0.8125rem] font-medium text-[var(--text-primary)]">{r.date}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={cn(
                        'text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full',
                        r.status === 'Present' && 'bg-emerald-50 text-emerald-700',
                        r.status === 'Absent' && 'bg-red-50 text-red-700',
                        r.status === 'Late' && 'bg-amber-50 text-amber-700',
                        r.status === 'Leave' && 'bg-blue-50 text-blue-700',
                      )}>
                        {r.status}
                      </span>
                      {r.remarks && (
                        <span className="text-[0.6875rem] text-[var(--text-muted)] truncate max-w-[120px]">{r.remarks}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Enrollment History" icon={GraduationCap}>
          {enrollmentsLoading ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">Loading enrollments…</p>
          ) : enrollmentsError ? (
            <p className="text-[0.8125rem] text-red-600 py-2">{enrollmentsError}</p>
          ) : enrollments.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">No enrollment records yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border-color,#eef0f3)]">
              {enrollments.map((e) => {
                const className = classes.find((c) => c.id === e.classSection?.classMasterId)?.name ?? '—';
                const section = e.classSection?.section ?? '—';
                const isCurrent = currentEnrollment?.id === e.id;
                return (
                  <div key={e.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                          {className} – {section}
                        </p>
                        {isCurrent && (
                          <span className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-[#002c98] uppercase tracking-wide">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[0.6875rem] text-[var(--text-muted)] mt-0.5">
                        Roll #{e.rollNumber} · Joined {e.joinedAt ?? '—'}
                        {e.leftAt && e.leftAt !== e.joinedAt && ` · Left ${e.leftAt}`}
                      </p>
                    </div>
                    <span className="text-[0.6875rem] font-semibold text-[var(--text-tertiary)] capitalize">
                      {e.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <EditStudentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        student={student}
        onUpdated={(s) => setStudent(s)}
      />
    </div>
  );
}
