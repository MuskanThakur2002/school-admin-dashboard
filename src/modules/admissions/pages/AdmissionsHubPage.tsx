import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus2, MessageSquare, FileCheck, CheckCircle2, ArrowRight,
  Clock, Phone, Globe, UserPlus, Megaphone, Users, AlertTriangle, XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAdmissionsStore } from '@/stores/admissions.store';

const sourceIconFor = (source: string): React.ElementType => {
  const key = source.toLowerCase();
  if (key === 'walk-in' || key === 'walk_in') return Users;
  if (key === 'online' || key === 'social media' || key === 'website') return Globe;
  if (key === 'referral') return UserPlus;
  if (key === 'advertisement' || key === 'ad') return Megaphone;
  if (key === 'phone call' || key === 'phone') return Phone;
  return MoreHorizontal;
};

const statusStyle: Record<string, { dot: string; text: string; bg: string }> = {
  new: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  contacted: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  converted: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  lost: { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' },
  submitted: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  under_review: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  verified: { dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
  approved: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

export default function AdmissionsHubPage() {
  const navigate = useNavigate();
  const enquiries = useAdmissionsStore((s) => s.enquiries);
  const applications = useAdmissionsStore((s) => s.applications);
  const fetchEnquiries = useAdmissionsStore((s) => s.fetchEnquiries);
  const fetchApplications = useAdmissionsStore((s) => s.fetchApplications);

  const pending = useMemo(
    () => applications.filter((a) => a.status === 'verified'),
    [applications],
  );

  useEffect(() => {
    if (enquiries.length === 0) fetchEnquiries();
    if (applications.length === 0) fetchApplications();
  }, [enquiries.length, applications.length, fetchEnquiries, fetchApplications]);

  // Enquiry stats
  const newEnquiries = enquiries.filter((e) => e.status === 'new').length;
  const convertedEnquiries = enquiries.filter((e) => e.status === 'converted').length;
  const conversionRate = enquiries.length > 0 ? Math.round((convertedEnquiries / enquiries.length) * 100) : 0;

  // Application stats
  const submittedApps = applications.filter((a) => a.status === 'submitted').length;
  const underReviewApps = applications.filter((a) => a.status === 'under_review').length;
  const approvedApps = applications.filter((a) => a.status === 'approved').length;
  const rejectedApps = applications.filter((a) => a.status === 'rejected').length;

  // Recent activity — latest 6 items from both enquiries and applications
  const recentEnquiries = [...enquiries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const recentApplications = [...applications]
    .sort((a, b) => b.appliedDate.localeCompare(a.appliedDate))
    .slice(0, 4);

  return (
    <div className="max-w-[1280px]">
      {/* Header + primary CTA */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Admissions</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">
            Manage enquiries, applications, and approvals — or start a new admission directly.
          </p>
        </div>
        <button
          onClick={() => navigate('/admissions/new')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] bg-gradient-to-br from-[#002c98] to-[#3b6cf5] text-white text-[0.875rem] font-semibold shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:shadow-[0_6px_24px_rgba(0,44,152,0.45)] hover:brightness-110 transition-all"
        >
          <UserPlus2 className="w-[18px] h-[18px]" />
          New Admission
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pipeline stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: 'Enquiries', value: enquiries.length, color: 'text-blue-600' },
          { label: 'New', value: newEnquiries, color: 'text-violet-600' },
          { label: 'Submitted', value: submittedApps, color: 'text-blue-600' },
          { label: 'Reviewing', value: underReviewApps, color: 'text-amber-600' },
          { label: 'Approved', value: approvedApps, color: 'text-emerald-600' },
          { label: 'Rejected', value: rejectedApps, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--card-bg)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
            <p className="text-[0.625rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">{s.label}</p>
            <p className={cn('font-display text-[1.5rem] font-extrabold tracking-[-0.02em] leading-none', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Section cards — drill-down */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Enquiries */}
        <button
          onClick={() => navigate('/admissions/enquiries')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Enquiries</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Capture walk-in and online enquiries. Track follow-ups.</p>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] leading-none">{enquiries.length}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Total</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-emerald-600 leading-none">{conversionRate}%</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Converted</p>
            </div>
          </div>
        </button>

        {/* Applications */}
        <button
          onClick={() => navigate('/admissions/applications')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-violet-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Applications</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Pipeline view: submitted → verified. Manage documents.</p>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] leading-none">{applications.length}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Total</p>
            </div>
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-amber-600 leading-none">{submittedApps + underReviewApps}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">In Progress</p>
            </div>
          </div>
        </button>

        {/* Approvals */}
        <button
          onClick={() => navigate('/admissions/approvals')}
          className="text-left bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group relative overflow-hidden"
        >
          {pending.length > 0 && (
            <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[0.625rem] font-bold rounded-bl-xl">
              {pending.length} PENDING
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={1.8} />
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-ghost)] group-hover:text-[#002c98] group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">Approvals</h3>
          <p className="text-[0.75rem] text-[var(--text-muted)] mb-4">Review verified applications and approve admissions.</p>
          <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div>
              <p className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] leading-none">{approvedApps}</p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Approved</p>
            </div>
            <div>
              <p className={cn('font-display text-[1.25rem] font-extrabold leading-none', pending.length > 0 ? 'text-red-500' : 'text-[var(--text-muted)]')}>
                {pending.length}
              </p>
              <p className="text-[0.625rem] text-[var(--text-muted)] mt-0.5">Pending</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent activity split */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent Enquiries */}
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">Recent Enquiries</h3>
            <button
              onClick={() => navigate('/admissions/enquiries')}
              className="text-[0.75rem] font-semibold text-[#002c98] hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {recentEnquiries.length === 0 ? (
              <div className="py-12 text-center text-[0.75rem] text-[var(--text-muted)]">
                No enquiries yet
              </div>
            ) : recentEnquiries.map((e, idx) => {
              const st = statusStyle[e.status];
              const SourceIcon = sourceIconFor(e.source);
              return (
                <div
                  key={e.id}
                  onClick={() => navigate('/admissions/enquiries')}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--card-bg-hover)] transition-colors cursor-pointer',
                    idx < recentEnquiries.length - 1 && 'border-t border-[var(--border-subtle)]',
                    idx === 0 && 'border-t border-[var(--border-subtle)]',
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                    <span className="text-white text-[0.625rem] font-bold">
                      {e.studentName.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{e.studentName}</p>
                    <div className="flex items-center gap-2 text-[0.6875rem] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{e.parentPhone}</span>
                      <span className="flex items-center gap-1"><SourceIcon className="w-3 h-3" />{e.source}</span>
                    </div>
                  </div>
                  <span className="text-[0.6875rem] text-[var(--text-ghost)]">Class {e.classInterest}</span>
                  <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full', st.bg)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                    <span className={cn('text-[0.625rem] font-semibold capitalize', st.text)}>{e.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">Recent Applications</h3>
            <button
              onClick={() => navigate('/admissions/applications')}
              className="text-[0.75rem] font-semibold text-[#002c98] hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {recentApplications.length === 0 ? (
              <div className="py-12 text-center text-[0.75rem] text-[var(--text-muted)]">
                No applications yet
              </div>
            ) : recentApplications.map((a, idx) => {
              const st = statusStyle[a.status] || statusStyle.submitted;
              const StatusIcon = a.status === 'rejected' ? XCircle : a.status === 'approved' ? CheckCircle2 : Clock;
              return (
                <div
                  key={a.id}
                  onClick={() => navigate('/admissions/applications')}
                  className={cn(
                    'flex items-center gap-3 px-6 py-3.5 hover:bg-[var(--card-bg-hover)] transition-colors cursor-pointer',
                    idx < recentApplications.length - 1 && 'border-t border-[var(--border-subtle)]',
                    idx === 0 && 'border-t border-[var(--border-subtle)]',
                  )}
                >
                  <StatusIcon className={cn('w-4 h-4 shrink-0', st.text)} strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{a.studentName}</p>
                    <p className="text-[0.6875rem] text-[var(--text-muted)]">
                      Class {a.classApplied} &middot; {a.appliedDate}
                    </p>
                  </div>
                  <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full', st.bg)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                    <span className={cn('text-[0.625rem] font-semibold capitalize', st.text)}>{a.status.replace('_', ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending approvals banner (if any) */}
      {pending.length > 0 && (
        <div
          onClick={() => navigate('/admissions/approvals')}
          className="mt-5 flex items-center gap-4 px-6 py-4 rounded-2xl bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[0.875rem] font-bold text-amber-900">
              {pending.length} application{pending.length !== 1 ? 's' : ''} awaiting your approval
            </p>
            <p className="text-[0.75rem] text-amber-700 mt-0.5">Click to review and approve verified applications</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-700" />
        </div>
      )}
    </div>
  );
}
