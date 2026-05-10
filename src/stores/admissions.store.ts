import { create } from 'zustand';
import { admissionsApi } from '@/services/modules/admissions.api';
import { enquiriesApi } from '@/services/modules/enquiries.api';
import { applicationsApi, toApiGender } from '@/services/modules/applications.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Enquiry,
  Application,
  CreateEnquiryDto,
  ApproveApplicationDto,
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

  // Loading flags
  enquiriesLoading: boolean;
  applicationsLoading: boolean;

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
  advanceApplicationStatus: (id: string) => Promise<void>;
  uploadDocument: (appId: string, docId: string, filename: string) => Promise<void>;

  // ─── Approval actions ─────────────────────────
  approveApplication: (id: string, dto: ApproveApplicationDto) => Promise<Application>;
  rejectApplication: (id: string, reason: string) => Promise<void>;
}

export const useAdmissionsStore = create<AdmissionsState>((set) => ({
  enquiries: [],
  applications: [],
  enquiriesLoading: false,
  applicationsLoading: false,
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
    const current = useAdmissionsStore.getState().enquiries.find((e) => e.id === id);
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
    const enquiry = useAdmissionsStore.getState().enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) throw new Error('Enquiry not found');

    // 1. Create the application on the real backend (requires DOB/gender/AY).
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

    // 2. Mark the originating enquiry as converted.
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
    const primaryParent = dto.parents[0];
    const fullName = `${dto.applicant.firstName} ${dto.applicant.lastName}`.trim();
    const created = await applicationsApi.create(schoolId, {
      studentName: fullName,
      dateOfBirth: dto.applicant.dateOfBirth,
      gender: toApiGender(dto.applicant.gender),
      parentName: primaryParent?.name || '',
      phoneNumber: primaryParent?.phone || '',
      email: primaryParent?.email || '',
      classApplied: dto.classApplied,
      academicYearId,
      status: 'Pending',
      address: dto.address?.line1 || undefined,
    });
    set((state) => ({ applications: [created, ...state.applications] }));
    return created;
  },

  advanceApplicationStatus: async (id) => {
    const updated = await admissionsApi.advanceApplicationStatus(id);
    set((state) => ({
      applications: state.applications.map((a) => (a.id === id ? updated : a)),
    }));
  },

  uploadDocument: async (appId, docId, filename) => {
    const updated = await admissionsApi.uploadDocument(appId, docId, filename);
    set((state) => ({
      applications: state.applications.map((a) => (a.id === appId ? updated : a)),
    }));
  },

  // ─── Approvals ────────────────────────────────
  approveApplication: async (id, dto) => {
    const updated = await admissionsApi.approveApplication(id, dto);
    set((state) => ({
      applications: state.applications.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },

  rejectApplication: async (id, reason) => {
    const updated = await admissionsApi.rejectApplication(id, reason);
    set((state) => ({
      applications: state.applications.map((a) => (a.id === id ? updated : a)),
    }));
  },
}));

// Helper selectors
export const selectPendingApprovals = (state: AdmissionsState) =>
  state.applications.filter((a) => a.status === 'verified');

export const selectNewEnquiries = (state: AdmissionsState) =>
  state.enquiries.filter((e) => e.status === 'new');
