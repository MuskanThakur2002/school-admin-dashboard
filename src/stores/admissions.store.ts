import { create } from 'zustand';
import { enquiriesApi } from '@/services/modules/enquiries.api';
import { applicationsApi, toApiGender } from '@/services/modules/applications.api';
import { studentsApi } from '@/services/modules/students.api';
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

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

interface AdmissionsState {
  // Data
  enquiries: Enquiry[];
  applications: Application[];
  /** Per-application document lists, keyed by applicationId. */
  documentsByApp: Record<string, ApplicationDocument[]>;

  // Loading flags
  enquiriesLoading: boolean;
  applicationsLoading: boolean;
  documentsLoading: boolean;

  // Error
  error: string | null;

  // ─── Fetch actions ────────────────────────────
  fetchEnquiries: () => Promise<void>;
  fetchApplications: () => Promise<void>;

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

export const useAdmissionsStore = create<AdmissionsState>((set, get) => ({
  enquiries: [],
  applications: [],
  documentsByApp: {},
  enquiriesLoading: false,
  applicationsLoading: false,
  documentsLoading: false,
  error: null,

  // ─── Fetch ────────────────────────────────────
  fetchEnquiries: async () => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) { set({ enquiries: [] }); return; }
    set({ enquiriesLoading: true, error: null });
    try {
      const res = await enquiriesApi.list(schoolId, { page: 1, limit: 100 });
      set({ enquiries: res.data, enquiriesLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, enquiriesLoading: false });
    }
  },

  fetchApplications: async () => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) { set({ applications: [] }); return; }
    set({ applicationsLoading: true, error: null });
    try {
      const res = await applicationsApi.list(schoolId, { page: 1, limit: 100 });
      set({ applications: res.data, applicationsLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, applicationsLoading: false });
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
