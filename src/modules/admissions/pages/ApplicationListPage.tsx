import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock, CheckCircle2, XCircle, Search, X, Upload, ArrowRight,
  Download, User, Phone, GraduationCap, Calendar, FileText, Mail,
  AlertTriangle, ChevronRight, ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAdmissionsStore } from '@/stores/admissions.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useParentStore } from '@/stores/parent.store';
import { documentTypeOptions, formatDocumentTypeLabel } from '@/utils/constants';
import type { Application, ApplicationStatus } from '@/types/admissions.types';

// ─── Status config ──────────────────────────────────────────

const statusStyle: Record<ApplicationStatus, { dot: string; text: string; bg: string; label: string }> = {
  submitted: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', label: 'Submitted' },
  under_review: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Under Review' },
  verified: { dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50', label: 'Verified' },
  approved: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Approved' },
  rejected: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
};

type FilterValue = 'all' | ApplicationStatus;

const filterPills: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ─── Component ──────────────────────────────────────────────

export default function ApplicationListPage() {
  const applications = useAdmissionsStore((s) => s.applications);
  const loading = useAdmissionsStore((s) => s.applicationsLoading);
  const fetchApplications = useAdmissionsStore((s) => s.fetchApplications);
  const advanceStatus = useAdmissionsStore((s) => s.advanceApplicationStatus);
  const fetchDocuments = useAdmissionsStore((s) => s.fetchApplicationDocuments);
  const uploadDocument = useAdmissionsStore((s) => s.uploadApplicationDocument);
  const verifyDocument = useAdmissionsStore((s) => s.verifyApplicationDocument);
  const approveApplication = useAdmissionsStore((s) => s.approveApplication);
  const rejectApplication = useAdmissionsStore((s) => s.rejectApplication);
  const showToast = useUIStore((s) => s.showToast);

  // Class / section picker source for the approve modal.
  const classes = useAcademicStore((s) => s.classes);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  // Parent picker source for the approve modal.
  const parents = useParentStore((s) => s.parents);
  const fetchParents = useParentStore((s) => s.fetchParents);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Approve/Reject inline state (inside drawer). Values are UUIDs.
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [assignedClassId, setAssignedClassId] = useState('');
  const [assignedSectionId, setAssignedSectionId] = useState('');
  const [assignedParentId, setAssignedParentId] = useState('');
  const [transportRoute, setTransportRoute] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Upload form state
  const [uploadFormOpen, setUploadFormOpen] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [uploadCustomType, setUploadCustomType] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (applications.length === 0) fetchApplications();
    if (classes.length === 0) fetchClasses();
    if (parents.length === 0) fetchParents(1, 100);
  }, [applications.length, classes.length, parents.length, fetchApplications, fetchClasses, fetchParents]);

  // Load documents whenever a drawer opens.
  useEffect(() => {
    if (selectedId) fetchDocuments(selectedId).catch(() => {});
  }, [selectedId, fetchDocuments]);

  // Derive selected app from store so it stays in sync
  const selectedApp = useMemo(
    () => applications.find((a) => a.id === selectedId) || null,
    [applications, selectedId],
  );

  // Close drawer and reset inline forms
  const closeDrawer = () => {
    setSelectedId(null);
    setShowApproveForm(false);
    setShowRejectForm(false);
    setAssignedClassId('');
    setAssignedSectionId('');
    setAssignedParentId('');
    setTransportRoute('');
    setMedicalNotes('');
    setRejectionReason('');
    setUploadFormOpen(false);
    setUploadType('');
    setUploadCustomType('');
    setUploadFile(null);
  };

  // Filtering
  const filtered = useMemo(() => {
    return applications.filter((a) => {
      const matchesFilter = filter === 'all' || a.status === filter;
      const matchesSearch = !search ||
        a.studentName.toLowerCase().includes(search.toLowerCase()) ||
        a.parentName.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [applications, filter, search]);

  // Counts per status for filter pills
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: applications.length };
    for (const a of applications) {
      c[a.status] = (c[a.status] || 0) + 1;
    }
    return c;
  }, [applications]);

  // ─── Actions ──────────────────────────────────────────
  const handleAdvance = async (app: Application) => {
    try {
      await advanceStatus(app.id);
      const label = app.status === 'submitted' ? 'now under review' : 'verified and ready for approval';
      showToast({ type: 'success', title: `${app.studentName} ${label}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  const resetUploadForm = () => {
    setUploadFormOpen(false);
    setUploadType('');
    setUploadCustomType('');
    setUploadFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canUpload =
    !!uploadFile &&
    !!uploadType &&
    (uploadType !== 'other' || uploadCustomType.trim().length > 0);

  const handleUpload = async () => {
    if (!selectedApp || !uploadFile || !uploadType) return;
    const finalType = uploadType === 'other' ? uploadCustomType : uploadType;
    setUploading(true);
    try {
      await uploadDocument(selectedApp.id, uploadFile, finalType);
      showToast({ type: 'success', title: 'Document uploaded', message: uploadFile.name });
      resetUploadForm();
    } catch (err) {
      showToast({ type: 'error', title: 'Upload failed', message: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyDoc = async (docId: string) => {
    if (!selectedApp) return;
    try {
      await verifyDocument(selectedApp.id, docId);
      showToast({ type: 'success', title: 'Document verified' });
    } catch (err) {
      showToast({ type: 'error', title: 'Verification failed', message: (err as Error).message });
    }
  };

  // Sections that belong to the currently selected class.
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

  const openApproveForm = () => {
    if (!selectedApp) return;
    // Pre-select the class master whose name matches the captured `classApplied` (best-effort).
    const classMatch = classes.find(
      (c) => c.name.toLowerCase() === selectedApp.classApplied?.toLowerCase(),
    );
    setAssignedClassId(classMatch?.id ?? '');
    setAssignedSectionId('');
    // Pre-select a parent if their phone or email matches the application's text fields.
    const phone = selectedApp.parentPhone?.trim();
    const email = selectedApp.parentEmail?.trim().toLowerCase();
    const parentMatch = parents.find((p) => {
      const pPhone = p.user?.phoneNumber?.trim();
      const pEmail = p.user?.email?.trim().toLowerCase();
      return (phone && pPhone === phone) || (email && pEmail === email);
    });
    setAssignedParentId(parentMatch?.id ?? '');
    setTransportRoute('');
    setMedicalNotes('');
    setShowApproveForm(true);
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    if (!assignedClassId || !assignedSectionId) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Class and section are required' });
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
        message: `${updated.admissionNo} — ${updated.studentName} → ${className}${sectionName ? ` · ${sectionName}` : ''}`,
      });
      setShowApproveForm(false);
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
      setShowRejectForm(false);
      setRejectionReason('');
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
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Applications</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage all admission applications in one place</p>
        </div>
        <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
          <Download className="w-4 h-4" strokeWidth={2} /> Export
        </button>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {filterPills.map((p) => {
            const isActive = filter === p.value;
            const st = p.value !== 'all' ? statusStyle[p.value as ApplicationStatus] : null;
            return (
              <button
                key={p.value}
                onClick={() => setFilter(p.value)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
                  isActive
                    ? 'bg-[#0f172a] text-white shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
                )}
              >
                {st && <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />}
                {p.label}
                <span className={cn(
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[0.625rem] font-bold',
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]',
                )}>
                  {counts[p.value] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[240px] max-w-sm ml-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student or parent name..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2.4fr_0.9fr_1.4fr_1.1fr_1.3fr_40px] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Student', 'Class', 'Documents', 'Date', 'Status', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {loading && applications.length === 0 ? (
          <div className="py-16 text-center text-[0.875rem] text-[var(--text-muted)]">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No applications found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Try adjusting your search or filters</p>
          </div>
        ) : filtered.map((app, idx) => {
          const st = statusStyle[app.status];
          const initials = app.studentName.split(' ').map((n) => n[0]).join('');
          // documentsCount=0 means docs haven't been fetched yet (lazy on drawer open).
          const docsKnown = app.documentsCount > 0;
          const docPct = docsKnown
            ? Math.round((app.documentsVerified / app.documentsCount) * 100)
            : 0;
          return (
            <div
              key={app.id}
              onClick={() => setSelectedId(app.id)}
              className={cn(
                'grid grid-cols-[2.4fr_0.9fr_1.4fr_1.1fr_1.3fr_40px] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < filtered.length - 1 && 'border-b border-[var(--border-subtle)]',
                selectedId === app.id && 'bg-[var(--card-bg-hover)]',
              )}
            >
              {/* Student */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.6875rem] font-bold">{initials}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{app.studentName}</p>
                    <span className="font-mono text-[0.625rem] font-semibold text-[var(--text-muted)] shrink-0">
                      #{app.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">{app.parentName}</p>
                </div>
              </div>

              {/* Class */}
              <span className="text-[0.8125rem] font-semibold text-[var(--text-secondary)]">
                Class {app.classApplied}
              </span>

              {/* Documents progress (only shown after docs are fetched on drawer open) */}
              {docsKnown ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[5px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all',
                        docPct === 100 ? 'bg-emerald-500' : docPct > 50 ? 'bg-amber-400' : 'bg-blue-400')}
                      style={{ width: `${docPct}%` }}
                    />
                  </div>
                  <span className="text-[0.625rem] text-[var(--text-muted)] font-medium whitespace-nowrap">
                    {app.documentsVerified}/{app.documentsCount}
                  </span>
                </div>
              ) : (
                <span className="text-[0.625rem] text-[var(--text-ghost)] italic">Open to view</span>
              )}

              {/* Date */}
              <span className="text-[0.75rem] text-[var(--text-muted)]">{app.appliedDate}</span>

              {/* Status */}
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold', st.text)}>{st.label}</span>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-[var(--text-ghost)]" />
            </div>
          );
        })}

        <div className="px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filtered.length} of {applications.length} applications</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SLIDE-IN DRAWER
          ═══════════════════════════════════════════ */}
      {selectedApp && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in-0 duration-200"
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[560px] bg-[var(--app-bg)] shadow-[-16px_0_48px_rgba(0,0,0,0.12)] overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Drawer header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[var(--card-bg)] border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white font-display font-bold text-[0.8125rem]">
                    {selectedApp.studentName.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)] truncate">{selectedApp.studentName}</h2>
                    <span className="font-mono text-[0.6875rem] font-semibold text-[var(--text-muted)] shrink-0">
                      #{selectedApp.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] truncate">
                    Class {selectedApp.classApplied}
                    {selectedApp.admissionNo && ` · ${selectedApp.admissionNo}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Current status */}
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                statusStyle[selectedApp.status].bg,
              )}>
                <span className={cn('w-2 h-2 rounded-full', statusStyle[selectedApp.status].dot)} />
                <span className={cn('text-[0.75rem] font-bold uppercase tracking-wide', statusStyle[selectedApp.status].text)}>
                  {statusStyle[selectedApp.status].label}
                </span>
                {selectedApp.verifiedDate && (
                  <span className="ml-auto text-[0.6875rem] text-[var(--text-muted)]">
                    Verified on {selectedApp.verifiedDate}
                  </span>
                )}
              </div>

              {/* ─── Action section ─── */}
              {selectedApp.status !== 'approved' && selectedApp.status !== 'rejected' && (
                <div className="rounded-xl bg-[var(--card-bg)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Actions</p>

                  {/* Approve form (inline) */}
                  {showApproveForm && (
                    <div className="space-y-4 mb-4">
                      {/* Soft gate: no verified docs */}
                      {selectedApp.documentsVerified === 0 && (
                        <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                          <p className="text-[0.75rem] font-bold text-amber-900 mb-1">
                            ⚠ No documents verified
                          </p>
                          <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                            {selectedApp.documentsCount === 0
                              ? 'No documents uploaded yet. Approving creates the student without paperwork.'
                              : `${selectedApp.documentsCount} uploaded but ${selectedApp.documentsVerified} verified. Verify above before approving — or proceed anyway.`}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
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
                          label="Section *"
                          options={sectionOptions}
                          value={assignedSectionId}
                          onChange={(e) => setAssignedSectionId(e.target.value)}
                          disabled={!assignedClassId}
                        />
                      </div>
                      {assignedClassId && (selectedClass?.sections.length ?? 0) === 0 && (
                        <div className="rounded-lg bg-amber-50 p-3">
                          <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                            This class has no sections yet. Create one in Academic Setup first.
                          </p>
                        </div>
                      )}

                      {/* Parent linkage — auto-matched by phone/email from the admission form.
                          Read-only here; admin can change linkage later via Students edit. */}
                      {(() => {
                        const linkedParent = parents.find((p) => p.id === assignedParentId);
                        return linkedParent ? (
                          <div className="rounded-lg bg-emerald-50 p-3">
                            <p className="text-[0.625rem] font-semibold text-emerald-800 uppercase tracking-[0.06em] mb-0.5">Parent linked</p>
                            <p className="text-[0.75rem] font-semibold text-emerald-900">
                              {linkedParent.user?.name ?? '—'}
                              {linkedParent.user?.email ? ` · ${linkedParent.user.email}` : ''}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-amber-50 p-3">
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

                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-[0.6875rem] text-blue-700 leading-relaxed">
                          On approval: admission number is generated, student profile is created, and the student is enrolled atomically by the backend. Optional fields above are applied with a follow-up update.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="tertiary" onClick={() => setShowApproveForm(false)}>Cancel</Button>
                        <Button onClick={handleApprove} loading={submitting} className="flex-1">
                          <CheckCircle2 className="w-4 h-4" /> Confirm Approval
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reject form (inline) */}
                  {showRejectForm && (
                    <div className="space-y-4 mb-4">
                      <Input
                        label="Rejection Reason *"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Incomplete documents after follow-up"
                      />
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">
                        The parent will be notified and this application will be archived.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="tertiary" onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}>Cancel</Button>
                        <Button variant="danger" onClick={handleReject} loading={submitting} className="flex-1">
                          <XCircle className="w-4 h-4" /> Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Default action buttons */}
                  {!showApproveForm && !showRejectForm && (
                    <div className="space-y-2">
                      {selectedApp.status === 'submitted' && (
                        <button
                          onClick={() => handleAdvance(selectedApp)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-blue-50 text-blue-700 text-[0.8125rem] font-semibold hover:bg-blue-100 transition-all"
                        >
                          <Clock className="w-4 h-4" /> Start Review <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {selectedApp.status === 'under_review' && (
                        <button
                          onClick={() => handleAdvance(selectedApp)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-violet-50 text-violet-700 text-[0.8125rem] font-semibold hover:bg-violet-100 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark Verified <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {selectedApp.status === 'verified' && (
                        <button
                          onClick={openApproveForm}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve & Create Student
                        </button>
                      )}
                      <button
                        onClick={() => setShowRejectForm(true)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-red-600 hover:bg-red-50 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> Reject Application
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Approved info */}
              {selectedApp.status === 'approved' && (
                <div className="rounded-xl bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                    <p className="text-[0.8125rem] font-bold text-emerald-900">Application Approved</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[0.625rem] text-emerald-700 font-medium uppercase tracking-[0.06em]">Admission No.</p>
                      <p className="text-[0.8125rem] font-bold text-emerald-900">{selectedApp.admissionNo}</p>
                    </div>
                    <div>
                      <p className="text-[0.625rem] text-emerald-700 font-medium uppercase tracking-[0.06em]">Assigned</p>
                      <p className="text-[0.8125rem] font-bold text-emerald-900">Class {selectedApp.assignedClass}-{selectedApp.assignedSection}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rejected info */}
              {selectedApp.status === 'rejected' && (
                <div className="rounded-xl bg-red-50 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" strokeWidth={2.5} />
                    <p className="text-[0.8125rem] font-bold text-red-900">Application Rejected</p>
                  </div>
                  {selectedApp.rejectionReason && (
                    <p className="text-[0.75rem] text-red-700 mt-2 leading-relaxed">{selectedApp.rejectionReason}</p>
                  )}
                </div>
              )}

              {/* Applicant details */}
              <div className="rounded-xl bg-[var(--card-bg)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">Applicant Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <DrawerField icon={User} label="Student" value={selectedApp.studentName} />
                  <DrawerField icon={GraduationCap} label="Class Applied" value={`Class ${selectedApp.classApplied}`} />
                  <DrawerField icon={Calendar} label="Applied" value={selectedApp.appliedDate} />
                  <DrawerField icon={User} label="Parent" value={selectedApp.parentName} />
                  <DrawerField icon={Phone} label="Phone" value={selectedApp.parentPhone} />
                  <DrawerField icon={Mail} label="Email" value={selectedApp.parentEmail || '—'} />
                  {selectedApp.previousSchool && (
                    <DrawerField icon={FileText} label="Previous School" value={selectedApp.previousSchool} />
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="rounded-xl bg-[var(--card-bg)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em]">Documents</p>
                  <span className="text-[0.6875rem] font-semibold text-[var(--text-tertiary)]">
                    {selectedApp.documentsVerified}/{selectedApp.documentsCount} verified
                  </span>
                </div>

                {/* Upload control */}
                {selectedApp.status !== 'approved' && selectedApp.status !== 'rejected' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    />

                    {!uploadFormOpen ? (
                      <button
                        onClick={() => setUploadFormOpen(true)}
                        className="w-full mb-3 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[#002c98] bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload document
                      </button>
                    ) : (
                      <div className="rounded-xl bg-[var(--card-bg-hover)] p-3 mb-3 space-y-2.5">
                        <Select
                          label="Document type *"
                          options={documentTypeOptions}
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value)}
                          placeholder="Select type..."
                        />
                        {uploadType === 'other' && (
                          <Input
                            label="Custom type *"
                            value={uploadCustomType}
                            onChange={(e) => setUploadCustomType(e.target.value)}
                            placeholder="e.g. Caste Certificate"
                          />
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[0.75rem] font-medium text-[var(--text-tertiary)] bg-[var(--card-bg)] hover:bg-[var(--border-subtle)] transition-colors truncate"
                        >
                          <Upload className="w-3 h-3 shrink-0" />
                          <span className="truncate">{uploadFile ? uploadFile.name : 'Choose file'}</span>
                        </button>
                        <div className="flex gap-2 pt-1">
                          <Button variant="tertiary" onClick={resetUploadForm} disabled={uploading}>Cancel</Button>
                          <Button onClick={handleUpload} loading={uploading} disabled={!canUpload} className="flex-1">
                            Upload
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedApp.documents.length === 0 ? (
                  <p className="text-[0.75rem] text-[var(--text-muted)] py-2 text-center">
                    No documents uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedApp.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--card-bg-hover)]">
                        <div className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0',
                          doc.isVerified ? 'bg-emerald-100' : 'bg-slate-100')}>
                          {doc.isVerified
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
                            : <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={2.5} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                            {formatDocumentTypeLabel(doc.type)}
                          </p>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.6875rem] text-[var(--text-muted)] truncate hover:underline inline-flex items-center gap-1"
                          >
                            {doc.fileName}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {doc.uploadedAt && (
                            <p className="text-[0.625rem] text-[var(--text-ghost)]">
                              Uploaded {doc.uploadedAt.split('T')[0]}
                            </p>
                          )}
                        </div>
                        {!doc.isVerified && selectedApp.status !== 'approved' && selectedApp.status !== 'rejected' && (
                          <button
                            onClick={() => handleVerifyDoc(doc.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[0.625rem] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Verify
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remarks */}
              {selectedApp.remarks && (
                <div className="rounded-xl bg-[var(--card-bg)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <p className="text-[0.6875rem] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2">Verification Remarks</p>
                  <p className="text-[0.8125rem] text-[var(--text-secondary)] leading-relaxed">{selectedApp.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helper ─────────────────────────────────────────────────

function DrawerField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[0.625rem] text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5">
        <Icon className="w-3 h-3" strokeWidth={2} />
        <span>{label}</span>
      </div>
      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

