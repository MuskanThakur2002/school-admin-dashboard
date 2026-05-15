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
import { useAcademicStore } from '@/stores/academic.store';
import { useParentStore } from '@/stores/parent.store';
import type { Application } from '@/types/admissions.types';

export default function ApprovalWorkflowPage() {
  const applications = useAdmissionsStore((s) => s.applications);
  const loading = useAdmissionsStore((s) => s.applicationsLoading);
  const pending = useMemo(
    () => applications.filter((a) => a.status === 'verified'),
    [applications],
  );
  const fetchApplications = useAdmissionsStore((s) => s.fetchApplications);
  const fetchDocuments = useAdmissionsStore((s) => s.fetchApplicationDocuments);
  const approveApplication = useAdmissionsStore((s) => s.approveApplication);
  const rejectApplication = useAdmissionsStore((s) => s.rejectApplication);
  const showToast = useUIStore((s) => s.showToast);

  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const parents = useParentStore((s) => s.parents);
  const fetchParents = useParentStore((s) => s.fetchParents);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const selectedApp = useMemo(
    () => applications.find((a) => a.id === selectedAppId) || null,
    [applications, selectedAppId],
  );
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const [assignedClassId, setAssignedClassId] = useState('');
  const [assignedSectionId, setAssignedSectionId] = useState('');
  const [assignedParentId, setAssignedParentId] = useState('');
  const [transportRoute, setTransportRoute] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApplications();
    if (classes.length === 0) fetchClasses();
    if (parents.length === 0) fetchParents(1, 100);
  }, [fetchApplications, fetchClasses, fetchParents, classes.length, parents.length]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === assignedClassId) || null,
    [classes, assignedClassId],
  );
  const classOptions = useMemo(
    () => [
      { label: 'Select class...', value: '' },
      ...classes.map((c) => ({ label: c.name, value: c.id })),
    ],
    [classes],
  );
  const sectionOptions = useMemo(
    () => [
      { label: selectedClass ? 'Select section...' : 'Pick a class first', value: '' },
      ...(selectedClass?.sections ?? []).map((s) => ({ label: `Section ${s.name}`, value: s.id })),
    ],
    [selectedClass],
  );

  const openApprove = (app: Application) => {
    setSelectedAppId(app.id);
    const classMatch = classes.find(
      (c) => c.name.toLowerCase() === app.classApplied?.toLowerCase(),
    );
    setAssignedClassId(classMatch?.id ?? '');
    setAssignedSectionId('');
    // Pre-select a parent by phone or email match against the application's text fields.
    const phone = app.parentPhone?.trim();
    const email = app.parentEmail?.trim().toLowerCase();
    const parentMatch = parents.find((p) => {
      const pPhone = p.user?.phoneNumber?.trim();
      const pEmail = p.user?.email?.trim().toLowerCase();
      return (phone && pPhone === phone) || (email && pEmail === email);
    });
    setAssignedParentId(parentMatch?.id ?? '');
    setTransportRoute('');
    setMedicalNotes('');
    setApproveModalOpen(true);
    // Load documents so the verified-docs warning reflects reality.
    fetchDocuments(app.id).catch(() => {});
  };

  const openReject = (app: Application) => {
    setSelectedAppId(app.id);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!assignedClassId || !assignedSectionId) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Please assign a class and section' });
      return;
    }
    setSubmitting(true);
    try {
      const updated = await approveApplication(selectedApp.id, {
        assignedClass: assignedClassId,
        assignedSection: assignedSectionId,
        parentId: assignedParentId || undefined,
        transportRoute: transportRoute.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
      });
      const className = selectedClass?.name ?? 'class';
      const sectionName = selectedClass?.sections.find((s) => s.id === assignedSectionId)?.name ?? '';
      showToast({
        type: 'success',
        title: 'Application approved',
        message: `${updated.admissionNo} created — ${updated.studentName} → ${className}${sectionName ? ` · ${sectionName}` : ''}`,
      });
      setApproveModalOpen(false);
      setSelectedAppId(null);
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
      setSelectedAppId(null);
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
            // documentsCount=0 means docs haven't been fetched (loaded lazily on app drawer open).
            const docsKnown = app.documentsCount > 0;
            const docsComplete = docsKnown && app.documentsVerified === app.documentsCount;
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
                      <span className="font-mono text-[0.625rem] font-semibold text-[var(--text-muted)]">
                        #{app.id.slice(0, 8).toUpperCase()}
                      </span>
                      {docsKnown && !docsComplete && (
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
          description="Assign class and section to generate the admission number"
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
                <p className="text-[0.6875rem] text-[var(--text-muted)]">
                  {selectedApp.parentName} &middot; Applied for Class {selectedApp.classApplied}
                  {selectedApp.documentsCount > 0 && (
                    <> &middot; Docs {selectedApp.documentsVerified}/{selectedApp.documentsCount} verified</>
                  )}
                </p>
              </div>
            </div>

            {/* Soft gate: no verified docs */}
            {selectedApp.documentsVerified === 0 && (
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
                <p className="text-[0.75rem] font-bold text-amber-900 mb-1">
                  ⚠ No documents verified
                </p>
                <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                  {selectedApp.documentsCount === 0
                    ? 'This application has no documents uploaded. Approving will create the student without any paperwork on file.'
                    : `${selectedApp.documentsCount} document${selectedApp.documentsCount === 1 ? '' : 's'} uploaded but none verified yet. Verify them from the application drawer before approving — or proceed anyway if you're sure.`}
                </p>
              </div>
            )}

            {/* Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Assign Class *"
                options={classOptions}
                value={assignedClassId}
                onChange={(e) => {
                  setAssignedClassId(e.target.value);
                  setAssignedSectionId('');
                }}
              />
              <Select
                label="Assign Section *"
                options={sectionOptions}
                value={assignedSectionId}
                onChange={(e) => setAssignedSectionId(e.target.value)}
                disabled={!assignedClassId}
              />
            </div>

            {assignedClassId && (selectedClass?.sections.length ?? 0) === 0 && (
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                  This class has no sections yet. Create one in Academic Setup first.
                </p>
              </div>
            )}

            {/* Parent linkage — auto-matched by phone/email from the admission form. */}
            {(() => {
              const linkedParent = parents.find((p) => p.id === assignedParentId);
              return linkedParent ? (
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[0.625rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-0.5">Parent linked</p>
                  <p className="text-[0.75rem] font-semibold text-emerald-900">
                    {linkedParent.user?.name ?? '—'}
                    {linkedParent.user?.email ? ` · ${linkedParent.user.email}` : ''}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[0.625rem] font-semibold text-amber-800 uppercase tracking-[0.06em] mb-0.5">No parent linked</p>
                  <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                    No parent matched this application's phone or email. Student will be created without a parent link — fix from Students later.
                  </p>
                </div>
              );
            })()}

            <Input
              label="Transport Route (optional)"
              value={transportRoute}
              onChange={(e) => setTransportRoute(e.target.value)}
              placeholder="e.g. Route 4 — Sector 12"
            />

            <div>
              <label className="block text-[0.6875rem] font-semibold text-[var(--text-tertiary)] mb-1.5">
                Medical Notes (optional)
              </label>
              <textarea
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Allergies, conditions, medication, etc."
                rows={2}
                className="w-full bg-[var(--card-bg)] rounded-lg px-3 py-2 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] resize-none"
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
                  <span>
                    Student will be enrolled in{' '}
                    {selectedClass?.name ?? '—'}
                    {selectedClass?.sections.find((s) => s.id === assignedSectionId)?.name
                      ? ` · Section ${selectedClass?.sections.find((s) => s.id === assignedSectionId)?.name}`
                      : ''}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Student profile and enrollment are created atomically by the backend</span>
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
