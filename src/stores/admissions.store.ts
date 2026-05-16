import { create } from 'zustand';
import { enquiriesApi } from '@/services/modules/enquiries.api';
import { applicationsApi, toApiGender } from '@/services/modules/applications.api';
import { studentsApi } from '@/services/modules/students.api';
import { ledgerApi } from '@/services/modules/ledger.api';
import { paymentApi } from '@/services/modules/payment.api';
import { useAuthStore } from '@/stores/auth.store';
import { useStudentsStore } from '@/stores/students.store';
import { useUIStore } from '@/stores/ui.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Enquiry,
  Application,
  ApplicationDocument,
  ApproveApplicationDto,
  CreateEnquiryDto,
  EnquiryStatus,
  NewAdmissionDto,
} from '@/types/admissions.types';

/** Extra info needed to convert an enquiry into an application (backend-required fields). */
export interface ConvertEnquiryExtras {
  dateOfBirth: string;       // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  academicYearId: string;
}

/** Input for the post-approve initial-payment collection flow. */
export interface CollectInitialPaymentInput {
  studentEnrollmentId: string;
  academicYearId: string;
  amount: number;
  category: string;
  paymentMode: string;
  transactionRef?: string;
  remarks?: string;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

/** Pipeline counts shown on the AdmissionsHub. Each is a server-side total per status. */
export interface ApplicationStats {
  submitted: number;
  under_review: number;
  verified: number;
  approved: number;
  rejected: number;
  total: number;
}

interface AdmissionsState {
  // Data
  enquiries: Enquiry[];
  applications: Application[];
  /** Applications filtered server-side to `status=verified` — used by the Approval Queue. */
  pendingApprovals: Application[];
  /** Per-application document lists, keyed by applicationId. */
  documentsByApp: Record<string, ApplicationDocument[]>;

  // Pagination — backed by the server-side `total/page/limit` envelope.
  enquiriesTotal: number;
  enquiriesPage: number;
  enquiriesLimit: number;
  applicationsTotal: number;
  applicationsPage: number;
  applicationsLimit: number;
  pendingApprovalsTotal: number;
  pendingApprovalsPage: number;
  pendingApprovalsLimit: number;

  // Stats for the dashboard pipeline strip — only the totals, no rows.
  applicationStats: ApplicationStats;

  // Loading flags
  enquiriesLoading: boolean;
  applicationsLoading: boolean;
  pendingApprovalsLoading: boolean;
  statsLoading: boolean;
  documentsLoading: boolean;

  // Error
  error: string | null;

  // ─── Fetch actions ────────────────────────────
  fetchEnquiries: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchApplications: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchPendingApprovals: (page?: number, limit?: number) => Promise<void>;
  fetchApplicationStats: () => Promise<void>;

  // ─── Enquiry actions ──────────────────────────
  createEnquiry: (dto: CreateEnquiryDto) => Promise<Enquiry>;
  updateEnquiryStatus: (id: string, status: EnquiryStatus) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;
  convertEnquiryToApplication: (enquiryId: string, extras: ConvertEnquiryExtras) => Promise<Application>;

  // ─── Application actions ──────────────────────
  createApplication: (dto: NewAdmissionDto, academicYearId: string) => Promise<Application>;
  /** Advance from submitted → under_review → verified by calling the right endpoint for the current status. */
  advanceApplicationStatus: (id: string) => Promise<void>;

  // ─── Approval actions ─────────────────────────
  approveApplication: (id: string, dto: ApproveApplicationDto) => Promise<Application>;
  rejectApplication: (id: string, reason: string) => Promise<void>;
  /**
   * Collect the initial admission payment for a freshly-approved student.
   * Chains two API calls: POST /ledgers (Debit) then POST /payments referencing
   * that ledger entry's id. Returns the created Payment so the UI can show the
   * receipt number.
   */
  collectInitialPayment: (input: CollectInitialPaymentInput) => Promise<{ receiptNumber: string; amount: number }>;

  // ─── Documents ────────────────────────────────
  fetchApplicationDocuments: (appId: string) => Promise<void>;
  /**
   * Upload a file and persist a document record. `type` is the document category
   * (e.g. "aadhar", "pan", "birth_certificate") — see documentTypeOptions.
   */
  uploadApplicationDocument: (appId: string, file: File, type: string) => Promise<void>;
  verifyApplicationDocument: (appId: string, docId: string) => Promise<void>;
}

/** Merge document counts onto an application so the table progress bar reflects the loaded docs. */
function withDocCounts(app: Application, docs: ApplicationDocument[]): Application {
  return {
    ...app,
    documents: docs,
    documentsCount: docs.length,
    documentsVerified: docs.filter((d) => d.isVerified).length,
  };
}

/** Normalize a free-text doc category to a slug. */
function normalizeDocType(type: string): string {
  return type.trim().toLowerCase().replace(/\s+/g, '_') || 'other';
}

const DEFAULT_PAGE_SIZE = 100;
const EMPTY_STATS: ApplicationStats = {
  submitted: 0, under_review: 0, verified: 0, approved: 0, rejected: 0, total: 0,
};

export const useAdmissionsStore = create<AdmissionsState>((set, get) => ({
  enquiries: [],
  applications: [],
  pendingApprovals: [],
  documentsByApp: {},
  enquiriesTotal: 0,
  enquiriesPage: 1,
  enquiriesLimit: DEFAULT_PAGE_SIZE,
  applicationsTotal: 0,
  applicationsPage: 1,
  applicationsLimit: DEFAULT_PAGE_SIZE,
  pendingApprovalsTotal: 0,
  pendingApprovalsPage: 1,
  pendingApprovalsLimit: DEFAULT_PAGE_SIZE,
  applicationStats: EMPTY_STATS,
  enquiriesLoading: false,
  applicationsLoading: false,
  pendingApprovalsLoading: false,
  statsLoading: false,
  documentsLoading: false,
  error: null,

  // ─── Fetch ────────────────────────────────────
  fetchEnquiries: async (page = 1, limit = DEFAULT_PAGE_SIZE, search) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ enquiries: [], enquiriesTotal: 0, enquiriesPage: 1, enquiriesLimit: limit });
      return;
    }
    set({ enquiriesLoading: true, error: null });
    try {
      const res = await enquiriesApi.list(schoolId, { page, limit, search });
      set({
        enquiries: res.data,
        enquiriesTotal: res.total,
        enquiriesPage: res.page,
        enquiriesLimit: res.limit,
        enquiriesLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, enquiriesLoading: false });
    }
  },

  fetchApplications: async (page = 1, limit = DEFAULT_PAGE_SIZE, search) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ applications: [], applicationsTotal: 0, applicationsPage: 1, applicationsLimit: limit });
      return;
    }
    set({ applicationsLoading: true, error: null });
    try {
      const res = await applicationsApi.list(schoolId, { page, limit, search });
      set({
        applications: res.data,
        applicationsTotal: res.total,
        applicationsPage: res.page,
        applicationsLimit: res.limit,
        applicationsLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, applicationsLoading: false });
    }
  },

  fetchPendingApprovals: async (page = 1, limit = DEFAULT_PAGE_SIZE) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ pendingApprovals: [], pendingApprovalsTotal: 0, pendingApprovalsPage: 1, pendingApprovalsLimit: limit });
      return;
    }
    set({ pendingApprovalsLoading: true, error: null });
    try {
      const res = await applicationsApi.list(schoolId, { page, limit, status: 'verified' });
      // Belt-and-suspenders: filter client-side too in case the backend ignores `?status=`.
      const filtered = res.data.filter((a) => a.status === 'verified');
      set({
        pendingApprovals: filtered,
        pendingApprovalsTotal: res.total,
        pendingApprovalsPage: res.page,
        pendingApprovalsLimit: res.limit,
        pendingApprovalsLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, pendingApprovalsLoading: false });
    }
  },

  fetchApplicationStats: async () => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ applicationStats: EMPTY_STATS });
      return;
    }
    set({ statsLoading: true });
    try {
      // 5 parallel cheap calls — limit=1 because we only need the `total` for each status.
      const statuses = ['submitted', 'under_review', 'verified', 'approved', 'rejected'] as const;
      const results = await Promise.all(
        statuses.map((s) =>
          applicationsApi.list(schoolId, { page: 1, limit: 1, status: s }).then((r) => r.total),
        ),
      );
      const [submitted, under_review, verified, approved, rejected] = results;
      const total = submitted + under_review + verified + approved + rejected;
      set({
        applicationStats: { submitted, under_review, verified, approved, rejected, total },
        statsLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, statsLoading: false });
    }
  },

  // ─── Enquiries ────────────────────────────────
  createEnquiry: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await enquiriesApi.create(schoolId, dto);
    set((state) => ({ enquiries: [created, ...state.enquiries] }));
    return created;
  },

  updateEnquiryStatus: async (id, status) => {
    const schoolId = resolveSchoolId();
    const current = get().enquiries.find((e) => e.id === id);
    if (!current) throw new Error('Enquiry not found');
    const updated = await enquiriesApi.update(schoolId, id, {
      studentName: current.studentName,
      parentName: current.parentName,
      parentPhone: current.parentPhone,
      parentEmail: current.parentEmail,
      classInterest: current.classInterest,
      source: current.source,
      notes: current.notes,
      status,
    });
    set((state) => ({
      enquiries: state.enquiries.map((e) => (e.id === id ? updated : e)),
    }));
  },

  deleteEnquiry: async (id) => {
    const schoolId = resolveSchoolId();
    await enquiriesApi.remove(schoolId, id);
    set((state) => ({ enquiries: state.enquiries.filter((e) => e.id !== id) }));
  },

  convertEnquiryToApplication: async (enquiryId, extras) => {
    const schoolId = resolveSchoolId();
    const enquiry = get().enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) throw new Error('Enquiry not found');

    const app = await applicationsApi.create(schoolId, {
      enquiryId: enquiry.id,
      studentName: enquiry.studentName,
      dateOfBirth: extras.dateOfBirth,
      gender: toApiGender(extras.gender),
      parentName: enquiry.parentName,
      phoneNumber: enquiry.parentPhone,
      email: enquiry.parentEmail || '',
      classApplied: enquiry.classInterest,
      academicYearId: extras.academicYearId,
      status: 'Pending',
    });

    const converted = await enquiriesApi.update(schoolId, enquiryId, {
      studentName: enquiry.studentName,
      parentName: enquiry.parentName,
      parentPhone: enquiry.parentPhone,
      parentEmail: enquiry.parentEmail,
      classInterest: enquiry.classInterest,
      source: enquiry.source,
      notes: enquiry.notes,
      status: 'converted',
    });

    set((state) => ({
      enquiries: state.enquiries.map((e) => (e.id === enquiryId ? converted : e)),
      applications: [app, ...state.applications],
    }));
    return app;
  },

  // ─── Applications ─────────────────────────────
  createApplication: async (dto, academicYearId) => {
    const schoolId = resolveSchoolId();
    const fullName = `${dto.firstName} ${dto.lastName}`.trim();
    const created = await applicationsApi.create(schoolId, {
      studentName: fullName,
      dateOfBirth: dto.dateOfBirth,
      gender: toApiGender(dto.gender),
      parentName: dto.parentName,
      phoneNumber: dto.parentPhone,
      email: dto.parentEmail || '',
      classApplied: dto.classApplied,
      academicYearId,
      status: 'Pending',
      address: dto.address || undefined,
    });
    set((state) => ({ applications: [created, ...state.applications] }));
    return created;
  },

  advanceApplicationStatus: async (id) => {
    const schoolId = resolveSchoolId();
    const current = get().applications.find((a) => a.id === id);
    if (!current) throw new Error('Application not found');

    let updated: Application;
    if (current.status === 'submitted') {
      updated = await applicationsApi.startReview(schoolId, id);
    } else if (current.status === 'under_review') {
      updated = await applicationsApi.verify(schoolId, id);
    } else {
      throw new Error(`Cannot advance from status: ${current.status}`);
    }

    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? withDocCounts(updated, state.documentsByApp[id] ?? []) : a,
      ),
    }));
  },

  // ─── Approvals ────────────────────────────────
  approveApplication: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await applicationsApi.approve(schoolId, id, {
      assignedClass: dto.assignedClass,
      assignedSection: dto.assignedSection,
    });

    // Backfill student-level fields the approve endpoint doesn't accept.
    // These come from the same approve modal so we apply them atomically from the
    // user's perspective, but the backend needs two calls.
    const studentId = updated.createdStudentId;
    const hasBackfill = studentId && (dto.parentId || dto.transportRoute || dto.medicalNotes);
    if (hasBackfill) {
      try {
        await studentsApi.update(schoolId, studentId!, {
          ...(dto.parentId ? { parentId: dto.parentId } : {}),
          ...(dto.transportRoute ? { transportRoute: dto.transportRoute } : {}),
          ...(dto.medicalNotes ? { medicalNotes: dto.medicalNotes } : {}),
        });
      } catch (err) {
        // Approve already succeeded — don't fail the whole flow, but surface the warning.
        useUIStore.getState().showToast({
          type: 'error',
          title: 'Student created, but extra fields failed to save',
          message: (err as Error).message,
        });
      }
    }

    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? withDocCounts(updated, state.documentsByApp[id] ?? []) : a,
      ),
    }));
    // Surface the newly-created student in the Students module without a manual refresh.
    useStudentsStore.getState().fetchStudents().catch(() => {});
    return updated;
  },

  rejectApplication: async (id, reason) => {
    const schoolId = resolveSchoolId();
    const updated = await applicationsApi.reject(schoolId, id, reason);
    set((state) => ({
      applications: state.applications.map((a) =>
        a.id === id ? withDocCounts(updated, state.documentsByApp[id] ?? []) : a,
      ),
    }));
  },

  collectInitialPayment: async (input) => {
    const schoolId = resolveSchoolId();
    const { user } = useAuthStore.getState();
    if (!user?.id) throw new Error('Not authenticated');

    // 1. Create the Debit ledger entry (what's owed).
    const debit = await ledgerApi.create(schoolId, {
      studentEnrollmentId: input.studentEnrollmentId,
      academicYearId: input.academicYearId,
      entryType: 'Debit',
      category: input.category,
      amount: input.amount,
      runningBalance: 0, // backend recomputes
      reference: 'Initial admission payment',
      paymentMode: input.paymentMode,
      remarks: input.remarks ?? '',
      createdById: user.id,
    });

    // 2. Create the Payment referencing the Debit entry. The backend creates the
    //    corresponding Credit entry server-side, so we don't write a second ledger row.
    const payment = await paymentApi.create(schoolId, {
      studentEnrollmentId: input.studentEnrollmentId,
      ledgerEntryId: debit.id,
      amount: input.amount,
      paymentMode: input.paymentMode,
      transactionRef: input.transactionRef ?? '',
      status: 'Success',
      receiptNumber: '', // backend generates
      paidAt: new Date().toISOString(),
    });

    return { receiptNumber: payment.receiptNumber, amount: Number(payment.amount) || input.amount };
  },

  // ─── Documents ────────────────────────────────
  fetchApplicationDocuments: async (appId) => {
    const schoolId = resolveSchoolId();
    set({ documentsLoading: true });
    try {
      const docs = await applicationsApi.listDocuments(schoolId, appId);
      set((state) => ({
        documentsByApp: { ...state.documentsByApp, [appId]: docs },
        applications: state.applications.map((a) =>
          a.id === appId ? withDocCounts(a, docs) : a,
        ),
        documentsLoading: false,
      }));
    } catch (err) {
      set({ error: (err as Error).message, documentsLoading: false });
    }
  },

  uploadApplicationDocument: async (appId, file, type) => {
    const schoolId = resolveSchoolId();
    // 1. Upload the file (multipart) and get the storage key back.
    const { fileUrl, fileName } = await applicationsApi.uploadDocumentFile(schoolId, appId, file);
    // 2. Persist the document record with the admin-chosen category.
    await applicationsApi.createDocumentRecord(schoolId, appId, {
      type: normalizeDocType(type),
      fileName,
      fileUrl,
    });
    // 3. Reload the list so the new doc appears with a fresh signed URL.
    await get().fetchApplicationDocuments(appId);
  },

  verifyApplicationDocument: async (appId, docId) => {
    const schoolId = resolveSchoolId();
    await applicationsApi.verifyDocument(schoolId, appId, docId);
    await get().fetchApplicationDocuments(appId);
  },
}));

// Helper selectors
export const selectPendingApprovals = (state: AdmissionsState) =>
  state.applications.filter((a) => a.status === 'verified');

export const selectNewEnquiries = (state: AdmissionsState) =>
  state.enquiries.filter((e) => e.status === 'new');
