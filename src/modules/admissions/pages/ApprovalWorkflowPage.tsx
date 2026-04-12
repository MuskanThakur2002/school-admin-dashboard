import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, XCircle, FileText, User, Calendar,
  AlertTriangle, GraduationCap,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import type { Application } from '@/types/admissions.types';

const sectionOptions = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
];

export default function ApprovalWorkflowPage() {
  const applications = useAdmissionsStore((s) => s.applications);
  const loading = useAdmissionsStore((s) => s.applicationsLoading);
  const pending = useMemo(
    () => applications.filter((a) => a.status === 'verified'),
    [applications],
  );
  const fetchApplications = useAdmissionsStore((s) => s.fetchApplications);
  const approveApplication = useAdmissionsStore((s) => s.approveApplication);
  const rejectApplication = useAdmissionsStore((s) => s.rejectApplication);
  const showToast = useUIStore((s) => s.showToast);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const [assignedClass, setAssignedClass] = useState('');
  const [assignedSection, setAssignedSection] = useState('A');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const openApprove = (app: Application) => {
    setSelectedApp(app);
    setAssignedClass(app.classApplied);
    setAssignedSection('A');
    setApproveModalOpen(true);
  };

  const openReject = (app: Application) => {
    setSelectedApp(app);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!assignedClass || !assignedSection) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Please assign a class and section' });
      return;
    }
    setSubmitting(true);
    try {
      const updated = await approveApplication(selectedApp.id, { assignedClass, assignedSection });
      showToast({
        type: 'success',
        title: 'Application approved',
        message: `${updated.admissionNo} created — ${updated.studentName} assigned to ${updated.assignedClass}-${updated.assignedSection}`,
      });
      setApproveModalOpen(false);
      setSelectedApp(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Approval failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      showToast({ type: 'error', title: 'Reason required', message: 'Please provide a rejection reason' });
      return;
    }
    setSubmitting(true);
    try {
      await rejectApplication(selectedApp.id, rejectionReason);
      showToast({ type: 'error', title: 'Application rejected', message: selectedApp.studentName });
      setRejectModalOpen(false);
      setSelectedApp(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Rejection failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Approval Queue</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">
            {pending.length} application{pending.length !== 1 ? 's' : ''} awaiting your decision
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
            <span className="text-[0.75rem] font-semibold text-amber-700">{pending.length} pending</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && pending.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading approvals...</p>
        </div>
      ) : pending.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-[1.25rem] font-bold text-[var(--text-primary)] mb-1">All caught up!</h2>
          <p className="text-[0.875rem] text-[var(--text-muted)]">No applications are pending approval right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((app, idx) => {
            const initials = app.studentName.split(' ').map((n) => n[0]).join('');
            const docsComplete = app.documentsVerified === app.documentsCount;
            return (
              <div
                key={app.id}
                className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(0,44,152,0.25)]">
                    <span className="text-white font-display font-bold text-[0.9375rem]">{initials}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-[1rem] font-bold text-[var(--text-primary)]">{app.studentName}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-[#f0f4ff] text-[0.625rem] font-bold text-[#002c98] tracking-wide">
                        {app.applicationNo}
                      </span>
                      {!docsComplete && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[0.625rem] font-bold text-amber-600 tracking-wide">
                          Docs Pending ({app.documentsVerified}/{app.documentsCount})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.75rem] text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.8} />
                        {app.parentName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.8} />
                        Class {app.classApplied}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.8} />
                        Applied {app.appliedDate}
                      </span>
                      {app.previousSchool && (
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.8} />
                          {app.previousSchool}
                        </span>
                      )}
                    </div>

                    {app.remarks && (
                      <p className="mt-2.5 text-[0.75rem] text-[var(--text-tertiary)] bg-[var(--card-bg-hover)] rounded-lg px-3 py-2 leading-relaxed">
                        {app.remarks}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openApprove(app)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[0.75rem] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} /> Approve
                    </button>
                    <button
                      onClick={() => openReject(app)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[0.75rem] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" strokeWidth={2} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      {selectedApp && (
        <Modal
          open={approveModalOpen}
          onOpenChange={setApproveModalOpen}
          title={`Approve: ${selectedApp.studentName}`}
          description={`${selectedApp.applicationNo} — Assign class and section to generate admission number`}
          size="md"
          footer={
            <>
              <Button variant="tertiary" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
              <Button onClick={handleApprove} loading={submitting}>
                <CheckCircle2 className="w-4 h-4" /> Confirm Approval
              </Button>
            </>
          }
        >
          <div className="space-y-5">
            {/* Student info */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg-hover)]">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                <span className="text-white font-display font-bold text-[0.8125rem]">
                  {selectedApp.studentName.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-[0.875rem] font-semibold text-[var(--text-primary)]">{selectedApp.studentName}</p>
                <p className="text-[0.6875rem] text-[var(--text-muted)]">{selectedApp.parentName} &middot; Applied for Class {selectedApp.classApplied}</p>
              </div>
            </div>

            {/* Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Assign Class *"
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                placeholder="e.g. V"
              />
              <Select
                label="Assign Section *"
                options={sectionOptions}
                value={assignedSection}
                onChange={(e) => setAssignedSection(e.target.value)}
              />
            </div>

            {/* Info card about what happens next */}
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-[0.6875rem] font-semibold text-blue-700 uppercase tracking-[0.06em] mb-2">On approval</p>
              <ul className="space-y-1 text-[0.75rem] text-blue-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>A unique admission number will be generated</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Student will be assigned to {assignedClass || '—'}-{assignedSection}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Ledger will be initialized with applicable fee plan</span>
                </li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedApp && (
        <Modal
          open={rejectModalOpen}
          onOpenChange={setRejectModalOpen}
          title={`Reject: ${selectedApp.studentName}`}
          description="Provide a reason for rejecting this application"
          size="sm"
          footer={
            <>
              <Button variant="tertiary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleReject} loading={submitting}>
                <XCircle className="w-4 h-4" /> Confirm Rejection
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Rejection Reason *"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete documents, class full, etc."
            />
            <p className="text-[0.6875rem] text-[var(--text-muted)]">
              The parent will be notified and this application will be archived.
            </p>
          </div>
        </Modal>
      )}

    </div>
  );
}
