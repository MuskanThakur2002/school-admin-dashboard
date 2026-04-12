import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, User, Users, MapPin, Heart, FileText, GraduationCap, Bus,
  Phone, Mail, Calendar, CheckCircle2, Clock, Wallet, BookOpen,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStudentsStore } from '@/stores/students.store';
import type { Student } from '@/types/student.types';

// ─── Mock academic history & medical (not yet in the Student type) ──────
// When the backend exists these will come from dedicated endpoints.
const mockAcademicHistory = [
  { year: '2024-25', class: 'VII', section: 'A', roll: 1, pct: 89.4, rank: 3, result: 'Promoted' },
  { year: '2023-24', class: 'VI', section: 'A', roll: 1, pct: 91.2, rank: 2, result: 'Promoted' },
  { year: '2022-23', class: 'V', section: 'B', roll: 5, pct: 87.8, rank: 5, result: 'Promoted' },
];

const mockMedical = {
  allergies: 'None',
  conditions: '—',
  medications: '—',
  emergency: '',
  lastCheckup: '—',
  insurance: '—',
};

const mockTransport = {
  mode: 'School Bus',
  route: 'Route 5 — Nearest Stop',
  stop: 'Gate',
  busNo: '—',
  pickup: '7:15 AM',
  drop: '2:45 PM',
};

const mockDocuments = [
  { name: 'Birth Certificate', status: 'verified', date: '—' },
  { name: 'Aadhaar Card', status: 'verified', date: '—' },
  { name: 'Passport Photo', status: 'verified', date: '—' },
  { name: 'Previous School TC', status: 'verified', date: '—' },
  { name: 'Address Proof', status: 'verified', date: '—' },
];

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
  { id: 'parents', label: 'Parents', icon: Users },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'transport', label: 'Transport', icon: Bus },
  { id: 'medical', label: 'Medical', icon: Heart },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
];

// ─── Component ───────────────────────────────────────────────

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getStudent = useStudentsStore((s) => s.getStudent);
  const students = useStudentsStore((s) => s.students);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getStudent(id)
      .then((s) => setStudent(s))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getStudent]);

  // Derive sibling students from the loaded students cache
  const siblings = student?.siblingIds
    ? students.filter((s) => student.siblingIds!.includes(s.id))
    : [];

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

  const fullName = `${student.firstName} ${student.lastName}`;
  const initials = `${student.firstName[0] || ''}${student.lastName[0] || ''}`;
  const primaryParent = student.parents?.[0] || {
    name: student.parentName,
    relation: 'father' as const,
    phone: student.parentPhone,
    email: student.parentEmail || '',
    id: 'p-primary',
  };

  return (
    <div className="max-w-[1280px]">
      {/* Back */}
      <button
        onClick={() => navigate('/students')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Students
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
                student.status === 'active' ? 'bg-emerald-50' : 'bg-slate-50',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  student.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400',
                )} />
                <span className={cn(
                  'text-[0.6875rem] font-semibold capitalize',
                  student.status === 'active' ? 'text-emerald-700' : 'text-slate-500',
                )}>
                  {student.status}
                </span>
              </div>
            </div>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)]">
              {student.admissionNo} &middot; Class {student.class}-{student.section} &middot; Roll #{student.rollNo}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[0.75rem] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> DOB: {student.dateOfBirth || '—'}</span>
              {primaryParent.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {primaryParent.phone}</span>}
              {primaryParent.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {primaryParent.email}</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigate(`/ledger/${student.id}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-all"
            >
              <Wallet className="w-3.5 h-3.5" /> View Ledger
            </button>
          </div>
        </div>

        {/* Sibling links */}
        {siblings.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--border-subtle)]">
            <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Siblings
            </p>
            <div className="flex flex-wrap gap-2">
              {siblings.map((sib) => (
                <button
                  key={sib.id}
                  onClick={() => navigate(`/students/${sib.id}`)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)] transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                    <span className="text-white text-[0.5625rem] font-bold">
                      {sib.firstName[0]}{sib.lastName[0]}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-[0.75rem] font-semibold text-[var(--text-primary)]">
                      {sib.firstName} {sib.lastName}
                    </p>
                    <p className="text-[0.625rem] text-[var(--text-muted)]">
                      Class {sib.class}-{sib.section}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
              <Field label="Date of Birth" value={student.dateOfBirth} />
              <Field label="Gender" value={student.gender} />
              <Field label="Blood Group" value={student.bloodGroup || ''} />
              <Field label="Religion" value={student.religion || ''} />
              <Field label="Category" value={student.category || ''} />
              <Field label="Nationality" value={student.nationality} />
              <Field label="Mother Tongue" value={student.motherTongue || ''} />
            </div>
          </SectionCard>
          <SectionCard title="Academic Information" icon={GraduationCap}>
            <div className="grid grid-cols-2 gap-x-6">
              <Field label="Admission No." value={student.admissionNo} />
              <Field label="Class / Section" value={`${student.class} — ${student.section}`} />
              <Field label="Roll No." value={String(student.rollNo)} />
              <Field label="Date of Joining" value={student.joinDate} />
              {student.previousSchool && <Field label="Previous School" value={student.previousSchool} />}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── Parents ─── */}
      {activeTab === 'parents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(student.parents && student.parents.length > 0 ? student.parents : [primaryParent]).map((parent) => (
            <SectionCard key={parent.id} title={parent.relation} icon={Users}>
              <div className="grid grid-cols-2 gap-x-6">
                <Field label="Name" value={parent.name} />
                <Field label="Relation" value={parent.relation} />
                <Field label="Phone" value={parent.phone} />
                <Field label="Email" value={parent.email || ''} />
                <Field label="Occupation" value={parent.occupation || ''} />
                <Field label="Annual Income" value={parent.annualIncome ? `INR ${parent.annualIncome}` : ''} />
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* ─── Address ─── */}
      {activeTab === 'address' && (
        <SectionCard title="Residential Address" icon={MapPin}>
          <div className="grid grid-cols-2 gap-x-6 max-w-xl">
            <Field label="Street Address" value={student.address} />
            <Field label="City" value={student.city} />
            <Field label="State" value={student.state} />
            <Field label="Pincode" value={student.pincode} />
          </div>
        </SectionCard>
      )}

      {/* ─── Transport ─── */}
      {activeTab === 'transport' && (
        <SectionCard title="Transport Details" icon={Bus}>
          {student.transportRoute ? (
            <div className="grid grid-cols-2 gap-x-6 max-w-xl">
              <Field label="Mode" value={mockTransport.mode} />
              <Field label="Route" value={student.transportRoute} />
              <Field label="Stop Name" value={mockTransport.stop} />
              <Field label="Bus No." value={mockTransport.busNo} />
              <Field label="Pickup Time" value={mockTransport.pickup} />
              <Field label="Drop Time" value={mockTransport.drop} />
            </div>
          ) : (
            <div className="py-8 text-center">
              <Bus className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-2" />
              <p className="text-[0.8125rem] text-[var(--text-muted)]">No transport assigned</p>
              <p className="text-[0.6875rem] text-[var(--text-ghost)] mt-1">Student is not using school transport</p>
            </div>
          )}
        </SectionCard>
      )}

      {/* ─── Medical ─── */}
      {activeTab === 'medical' && (
        <SectionCard title="Medical Information" icon={Heart}>
          <div className="grid grid-cols-2 gap-x-6 max-w-xl">
            <Field label="Allergies" value={mockMedical.allergies} />
            <Field label="Conditions" value={student.medicalNotes || mockMedical.conditions} />
            <Field label="Medications" value={mockMedical.medications} />
            <Field label="Emergency Contact" value={mockMedical.emergency || `${primaryParent.name} — ${primaryParent.phone}`} />
            <Field label="Last Health Checkup" value={mockMedical.lastCheckup} />
            <Field label="Insurance Policy" value={mockMedical.insurance} />
          </div>
        </SectionCard>
      )}

      {/* ─── Documents ─── */}
      {activeTab === 'documents' && (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
            {['Document', 'Status', 'Uploaded'].map((h) => (
              <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
            ))}
          </div>
          {mockDocuments.map((doc, idx) => (
            <div
              key={doc.name}
              className={cn(
                'grid grid-cols-[2fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
                idx < mockDocuments.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.8} />
                <span className="text-[0.8125rem] text-[var(--text-primary)] font-medium">{doc.name}</span>
              </div>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit',
                doc.status === 'verified' ? 'bg-emerald-50' : 'bg-amber-50',
              )}>
                {doc.status === 'verified'
                  ? <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                  : <Clock className="w-3 h-3 text-amber-600" strokeWidth={2.5} />
                }
                <span className={cn('text-[0.6875rem] font-semibold capitalize', doc.status === 'verified' ? 'text-emerald-700' : 'text-amber-700')}>
                  {doc.status}
                </span>
              </div>
              <span className="text-[0.75rem] text-[var(--text-muted)]">{doc.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Academic History ─── */}
      {activeTab === 'academic' && (
        <div>
          {mockAcademicHistory.length === 0 ? (
            <SectionCard title="Academic History" icon={BookOpen}>
              <div className="py-8 text-center">
                <BookOpen className="w-8 h-8 text-[var(--text-ghost)] mx-auto mb-2" />
                <p className="text-[0.8125rem] text-[var(--text-muted)]">No academic history yet</p>
                <p className="text-[0.6875rem] text-[var(--text-ghost)] mt-1">Records will appear after the first term</p>
              </div>
            </SectionCard>
          ) : (
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
                {['Year', 'Class', 'Section', 'Roll', 'Percentage', 'Rank', 'Result'].map((h) => (
                  <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
                ))}
              </div>
              {mockAcademicHistory.map((record, idx) => (
                <div
                  key={record.year}
                  className={cn(
                    'grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr_1fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
                    idx < mockAcademicHistory.length - 1 && 'border-b border-[var(--border-subtle)]',
                  )}
                >
                  <span className="text-[0.75rem] font-bold text-[#002c98]">{record.year}</span>
                  <span className="text-[0.8125rem] text-[var(--text-secondary)]">Class {record.class}</span>
                  <span className="text-[0.8125rem] text-[var(--text-secondary)]">{record.section}</span>
                  <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">#{record.roll}</span>
                  <span className="text-[0.8125rem] font-bold text-[var(--text-primary)]">{record.pct}%</span>
                  <span className="text-[0.8125rem] font-bold text-[var(--text-primary)]">#{record.rank}</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit bg-emerald-50">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                    <span className="text-[0.6875rem] font-semibold text-emerald-700">{record.result}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
