import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, XCircle, FileText, User, Calendar,
  AlertTriangle, GraduationCap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useParentStore } from '@/stores/parent.store';
import { useFeeStore } from '@/stores/fee.store';
import { useAuthStore } from '@/stores/auth.store';
import { feeApi } from '@/services/modules/fee.api';
import { isSuperAdmin } from '@/types/auth.types';
import type { Application } from '@/types/admissions.types';
import type { FeeStructure } from '@/types/fee.types';

// Matches the conventional names schools use for the joining/admission charge.
// Drives both the auto-fill in the payment step and the "no matching head" warning.
const ADMISSION_HEAD_PATTERN = /admission|joining|registration|enrollment/i;

export default function ApprovalWorkflowPage() {
  // Verified applications come from a dedicated server-side filtered fetch so the
  // queue stays correct even when there are more than `limit` applications total.
  const pending = useAdmissionsStore((s) => s.pendingApprovals);
  const loading = useAdmissionsStore((s) => s.pendingApprovalsLoading);
  const total = useAdmissionsStore((s) => s.pendingApprovalsTotal);
  const page = useAdmissionsStore((s) => s.pendingApprovalsPage);
  const limit = useAdmissionsStore((s) => s.pendingApprovalsLimit);
  const fetchPendingApprovals = useAdmissionsStore((s) => s.fetchPendingApprovals);
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
    () => pending.find((a) => a.id === selectedAppId) || null,
    [pending, selectedAppId],
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

  // Approval modal is a 4-step flow now:
  //   approve  → assign class + section, create student/enrollment
  //   feePlan  → link the new enrollment to a fee structure (required for the
  //              student to owe ongoing fees). Concession/scholarship optional.
  //   payment  → collect joining payment (skippable — fee plan is already saved).
  //   receipt  → confirmation. Closes the modal on Done.
  // We separated feePlan from payment so an admin who Skips payment still leaves
  // the student linked to a fee structure (previously skipping cancelled both).
  type ApproveStep = 'approve' | 'feePlan' | 'payment' | 'receipt';
  const [step, setStep] = useState<ApproveStep>('approve');

  // Set after a successful approve. Carries the new enrollment id and academic
  // year forward into the feePlan and payment steps.
  const [paymentContext, setPaymentContext] = useState<null | {
    enrollmentId: string;
    academicYearId: string;
    admissionNumber: string;
    studentName: string;
  }>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payCategory, setPayCategory] = useState('Admission Fee');
  const [payMode, setPayMode] = useState<'cash' | 'cheque' | 'upi' | 'neft' | 'dd' | 'card' | 'online'>('cash');
  const [payTxnRef, setPayTxnRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [payReceipt, setPayReceipt] = useState<{ receiptNumber: string | null; amount: number } | null>(null);
  const collectInitialPayment = useAdmissionsStore((s) => s.collectInitialPayment);

  // Fee plan picker — required so the new enrollment gets linked to a fee structure
  // for ongoing fees, and so the modal can auto-fill the admission-fee amount.
  const feeStructures = useFeeStore((s) => s.structures);
  const feeStructuresLoading = useFeeStore((s) => s.structuresLoading);
  const fetchFeeStructures = useFeeStore((s) => s.fetchStructures);
  const createFeeAssignment = useFeeStore((s) => s.createAssignment);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [structureDetail, setStructureDetail] = useState<FeeStructure | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [concessionPercent, setConcessionPercent] = useState('0');
  const [scholarshipAmount, setScholarshipAmount] = useState('0');

  useEffect(() => {
    fetchPendingApprovals(1, 100);
    if (classes.length === 0) fetchClasses();
    if (parents.length === 0) fetchParents(1, 100);
  }, [fetchPendingApprovals, fetchClasses, fetchParents, classes.length, parents.length]);

  // Load fee structures as soon as approve succeeds (step transitions out of
  // 'approve'), so the feePlan step's dropdown isn't empty.
  useEffect(() => {
    if (step !== 'approve' && feeStructures.length === 0) {
      fetchFeeStructures(1, 100);
    }
  }, [step, feeStructures.length, fetchFeeStructures]);

  // Structures filtered to the new student's academic year. The list endpoint
  // doesn't return nested items, so we lazy-load the picked structure's detail
  // separately to scan for the admission-fee head.
  const eligibleStructures = useMemo(
    () => feeStructures.filter((s) => !paymentContext || s.academicYearId === paymentContext.academicYearId),
    [feeStructures, paymentContext],
  );

  // On structure pick: fetch its items and auto-fill amount/category from the
  // FeeHead whose name contains "admission". Admin can still override both.
  useEffect(() => {
    if (!selectedStructureId || !paymentContext) {
      setStructureDetail(null);
      return;
    }
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) return;
    let cancelled = false;
    setStructureLoading(true);
    feeApi.getStructure(schoolId, selectedStructureId)
      .then((detail) => {
        if (cancelled) return;
        setStructureDetail(detail);
        const admissionItem = detail.feeStructureItems.find(
          (it) => ADMISSION_HEAD_PATTERN.test(it.feeHead?.name ?? ''),
        );
        if (admissionItem) {
          setPayAmount(String(Number(admissionItem.amount) || ''));
          setPayCategory(admissionItem.feeHead?.name ?? 'Admission Fee');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        showToast({ type: 'error', title: 'Could not load fee plan', message: (err as Error).message });
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedStructureId, paymentContext, showToast]);

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
      // Pivot the open modal into the fee-plan step instead of closing it.
      // The student is approved + enrolled — next we link them to a fee
      // structure before optionally collecting the joining payment.
      if (updated.createdEnrollmentId && updated.academicYearId) {
        setPaymentContext({
          enrollmentId: updated.createdEnrollmentId,
          academicYearId: updated.academicYearId,
          admissionNumber: updated.admissionNo ?? '',
          studentName: updated.studentName,
        });
        setStep('feePlan');
      } else {
        // Approve succeeded but the backend didn't return the enrollment id
        // we need to drive the fee-plan / payment steps. Tell the admin so
        // they know to set fees up manually rather than thinking it's done.
        showToast({
          type: 'error',
          title: 'Fee plan not assigned',
          message: 'Approved, but enrollment id missing in response. Assign fees from Fee Engine → Assignments.',
        });
        setApproveModalOpen(false);
        setSelectedAppId(null);
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Approval failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const closeApproveModal = () => {
    setApproveModalOpen(false);
    setSelectedAppId(null);
    setStep('approve');
    setPaymentContext(null);
    setPayAmount('');
    setPayCategory('Admission Fee');
    setPayMode('cash');
    setPayTxnRef('');
    setPayRemarks('');
    setPayReceipt(null);
    setSelectedStructureId('');
    setStructureDetail(null);
    setConcessionPercent('0');
    setScholarshipAmount('0');
  };

  // Step 2 (feePlan): link the new enrollment to a fee structure. This is now
  // independent of payment — even if admin Skips payment in step 3, the
  // student still has a fee plan attached.
  const concessionNum = Number(concessionPercent);
  const scholarshipNum = Number(scholarshipAmount);
  const concessionInvalid = Number.isNaN(concessionNum) || concessionNum < 0 || concessionNum > 100;
  const scholarshipInvalid = Number.isNaN(scholarshipNum) || scholarshipNum < 0;

  const handleAssignFeePlan = async () => {
    if (!paymentContext) return;
    if (!selectedStructureId) {
      showToast({ type: 'error', title: 'Pick a fee plan', message: 'Choose a fee structure to link this student to.' });
      return;
    }
    if (concessionInvalid || scholarshipInvalid) {
      showToast({ type: 'error', title: 'Invalid discount', message: 'Fix the concession or scholarship value.' });
      return;
    }
    setSubmitting(true);
    try {
      await createFeeAssignment({
        studentEnrollmentId: paymentContext.enrollmentId,
        feeStructureId: selectedStructureId,
        concessionPercent: concessionNum,
        scholarshipAmount: scholarshipNum,
      });
      showToast({ type: 'success', title: 'Fee plan assigned', message: paymentContext.studentName });
      setStep('payment');
    } catch (err) {
      showToast({ type: 'error', title: 'Could not assign fee plan', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3 (payment): collect the joining payment. Fee assignment already
  // happened in step 2 — Skip here just closes the modal cleanly.
  const handleCollectPayment = async () => {
    if (!paymentContext) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast({ type: 'error', title: 'Invalid amount', message: 'Enter a positive amount.' });
      return;
    }
    if (!payCategory.trim()) {
      showToast({ type: 'error', title: 'Category required', message: 'Pick a fee category.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await collectInitialPayment({
        studentEnrollmentId: paymentContext.enrollmentId,
        academicYearId: paymentContext.academicYearId,
        amount,
        category: payCategory.trim(),
        paymentMode: payMode,
        transactionRef: payTxnRef.trim() || undefined,
        remarks: payRemarks.trim() || undefined,
      });
      setPayReceipt(res);
      setStep('receipt');
      showToast({
        type: 'success',
        title: 'Payment collected',
        message: res.receiptNumber ? `Receipt: ${res.receiptNumber}` : 'Receipt issued.',
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Payment failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const paymentModeOptions = [
    { label: 'Cash', value: 'cash' },
    { label: 'UPI', value: 'upi' },
    { label: 'Card', value: 'card' },
    { label: 'Cheque', value: 'cheque' },
    { label: 'NEFT', value: 'neft' },
    { label: 'DD', value: 'dd' },
    { label: 'Online', value: 'online' },
  ];

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

          {total > limit && (
            <div className="flex items-center justify-between px-6 py-3.5 rounded-2xl bg-[var(--card-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[0.75rem] text-[var(--text-muted)]">
                Showing {pending.length} of {total} pending approval{total === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchPendingApprovals(page - 1, limit)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[0.75rem] font-semibold text-[var(--text-tertiary)] bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <span className="text-[0.75rem] font-semibold text-[var(--text-tertiary)] px-2">
                  Page {page} of {Math.max(1, Math.ceil(total / limit))}
                </span>
                <button
                  onClick={() => fetchPendingApprovals(page + 1, limit)}
                  disabled={page >= Math.ceil(total / limit)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[0.75rem] font-semibold text-[var(--text-tertiary)] bg-[var(--card-bg-hover)] hover:bg-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Modal — 4-step flow: approve → feePlan → payment → receipt. */}
      {selectedApp && (
        <Modal
          open={approveModalOpen}
          onOpenChange={(open) => { if (!open) closeApproveModal(); else setApproveModalOpen(true); }}
          title={
            step === 'approve' ? `Approve: ${selectedApp.studentName}`
              : step === 'feePlan' ? `Assign fee plan: ${paymentContext?.studentName ?? selectedApp.studentName}`
              : step === 'payment' ? `Collect initial payment: ${paymentContext?.studentName ?? selectedApp.studentName}`
              : `Receipt: ${payReceipt?.receiptNumber || '—'}`
          }
          description={
            step === 'approve' ? 'Assign class and section to generate the admission number'
              : step === 'feePlan' ? `Admission ${paymentContext?.admissionNumber ?? ''} created. Link the student to a fee structure.`
              : step === 'payment' ? 'Collect the joining payment, or skip — the fee plan is already saved.'
              : 'Payment recorded successfully.'
          }
          size="md"
          footer={
            step === 'approve' ? (
              <>
                <Button variant="tertiary" onClick={closeApproveModal}>Cancel</Button>
                <Button onClick={handleApprove} loading={submitting}>
                  <CheckCircle2 className="w-4 h-4" /> Confirm Approval
                </Button>
              </>
            ) : step === 'feePlan' ? (
              <>
                <Button variant="tertiary" onClick={closeApproveModal} disabled={submitting}>
                  Skip without fee plan
                </Button>
                <Button onClick={handleAssignFeePlan} loading={submitting} disabled={submitting || !selectedStructureId || concessionInvalid || scholarshipInvalid}>
                  Assign Fee Plan
                </Button>
              </>
            ) : step === 'payment' ? (
              <>
                <Button variant="tertiary" onClick={closeApproveModal} disabled={submitting}>Skip</Button>
                <Button onClick={handleCollectPayment} loading={submitting} disabled={submitting}>
                  Collect &amp; Issue Receipt
                </Button>
              </>
            ) : (
              <Button onClick={closeApproveModal}>Done</Button>
            )
          }
        >
          {step === 'feePlan' && paymentContext ? (
            <div className="space-y-4">
              <Select
                label="Fee Plan *"
                options={[
                  {
                    label: feeStructuresLoading
                      ? 'Loading fee plans...'
                      : eligibleStructures.length
                        ? 'Select fee plan...'
                        : 'No fee plans for this year',
                    value: '',
                  },
                  ...eligibleStructures.map((s) => ({ label: s.name, value: s.id })),
                ]}
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                disabled={feeStructuresLoading || eligibleStructures.length === 0}
              />
              {selectedStructureId && structureLoading && (
                <p className="text-[0.6875rem] text-[var(--text-muted)]">Loading plan details...</p>
              )}
              {selectedStructureId && !structureLoading && structureDetail && (
                <div className="rounded-lg bg-[var(--card-bg-hover)] p-3">
                  <p className="text-[0.6875rem] font-semibold text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-1">Heads in this plan</p>
                  <p className="text-[0.75rem] text-[var(--text-secondary)] leading-relaxed">
                    {structureDetail.feeStructureItems.length === 0
                      ? 'This structure has no line items yet.'
                      : structureDetail.feeStructureItems
                          .map((it) => `${it.feeHead?.name ?? '—'} (₹${Number(it.amount).toLocaleString('en-IN')})`)
                          .join(' · ')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Concession (%)"
                    type="number"
                    value={concessionPercent}
                    onChange={(e) => setConcessionPercent(e.target.value)}
                    placeholder="0"
                  />
                  {concessionInvalid && (
                    <p className="text-[0.6875rem] text-red-500 mt-1">Must be between 0 and 100.</p>
                  )}
                </div>
                <div>
                  <Input
                    label="Scholarship (₹)"
                    type="number"
                    value={scholarshipAmount}
                    onChange={(e) => setScholarshipAmount(e.target.value)}
                    placeholder="0"
                  />
                  {scholarshipInvalid && (
                    <p className="text-[0.6875rem] text-red-500 mt-1">Must be 0 or greater.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-[0.6875rem] text-blue-700 leading-relaxed">
                  Future installments and fees will be owed against this structure. Concession and scholarship can also be adjusted later from Fee Assignments.
                </p>
              </div>
            </div>
          ) : step === 'payment' && paymentContext ? (
            <div className="space-y-4">
              {structureDetail && (
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-[0.625rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-1">Fee plan linked</p>
                  <p className="text-[0.8125rem] font-semibold text-emerald-900">{structureDetail.name}</p>
                </div>
              )}
              {structureDetail && !structureDetail.feeStructureItems.some((it) => ADMISSION_HEAD_PATTERN.test(it.feeHead?.name ?? '')) && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-[0.6875rem] text-amber-800 leading-relaxed">
                    {structureDetail.feeStructureItems.length === 0 ? (
                      <>This plan has no fee heads yet — enter the joining amount manually.</>
                    ) : (
                      <>
                        Could not auto-fill — no head in this plan matches "Admission / Joining / Registration". Plan has:{' '}
                        {structureDetail.feeStructureItems
                          .map((it) => `${it.feeHead?.name ?? '—'} (₹${Number(it.amount).toLocaleString('en-IN')})`)
                          .join(' · ')}
                        . Enter the joining amount manually.
                      </>
                    )}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Amount (₹) *"
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />
                <Input
                  label="Category *"
                  value={payCategory}
                  onChange={(e) => setPayCategory(e.target.value)}
                  placeholder="Admission Fee"
                />
              </div>
              <Select
                label="Payment mode *"
                options={paymentModeOptions}
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as typeof payMode)}
              />
              {payMode !== 'cash' && (
                <Input
                  label="Transaction reference"
                  value={payTxnRef}
                  onChange={(e) => setPayTxnRef(e.target.value)}
                  placeholder="UPI ID / cheque no / etc."
                />
              )}
              <Input
                label="Remarks"
                value={payRemarks}
                onChange={(e) => setPayRemarks(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
          ) : step === 'receipt' && paymentContext && payReceipt ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 p-5">
                <p className="text-[0.625rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-1">Receipt</p>
                <p className="text-[1.125rem] font-bold text-emerald-900">{payReceipt.receiptNumber || '—'}</p>
                <p className="text-[0.75rem] text-emerald-700 mt-2">
                  ₹{payReceipt.amount.toLocaleString('en-IN')} collected for {paymentContext.studentName}.
                </p>
              </div>
            </div>
          ) : (
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
                  <p className="text-[0.625rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-0.5">Guardian linked</p>
                  <p className="text-[0.75rem] font-semibold text-emerald-900">
                    {linkedParent.user?.name ?? '—'}
                    {linkedParent.user?.email ? ` · ${linkedParent.user.email}` : ''}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-[0.625rem] font-semibold text-amber-800 uppercase tracking-[0.06em] mb-0.5">No guardian linked</p>
                  <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                    No guardian matched this application's phone or email. Student will be created without a guardian link — fix from Students later.
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
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>You'll then assign a fee plan and optionally collect the joining payment</span>
                </li>
              </ul>
            </div>
          </div>
          )}
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
