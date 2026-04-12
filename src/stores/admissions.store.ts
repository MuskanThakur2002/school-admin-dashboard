import { create } from 'zustand';
import { admissionsApi } from '@/services/modules/admissions.api';
import type {
  Enquiry,
  Application,
  CreateEnquiryDto,
  ApproveApplicationDto,
  EnquiryStatus,
  NewAdmissionDto,
} from '@/types/admissions.types';

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
  convertEnquiryToApplication: (enquiryId: string) => Promise<Application>;

  // ─── Application actions ──────────────────────
  createApplication: (dto: NewAdmissionDto) => Promise<Application>;
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
    set({ enquiriesLoading: true, error: null });
    try {
      const data = await admissionsApi.getEnquiries();
      set({ enquiries: data, enquiriesLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, enquiriesLoading: false });
    }
  },

  fetchApplications: async () => {
    set({ applicationsLoading: true, error: null });
    try {
      const data = await admissionsApi.getApplications();
      set({ applications: data, applicationsLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, applicationsLoading: false });
    }
  },

  // ─── Enquiries ────────────────────────────────
  createEnquiry: async (dto) => {
    const created = await admissionsApi.createEnquiry(dto);
    set((state) => ({ enquiries: [created, ...state.enquiries] }));
    return created;
  },

  updateEnquiryStatus: async (id, status) => {
    const updated = await admissionsApi.updateEnquiryStatus(id, status);
    set((state) => ({
      enquiries: state.enquiries.map((e) => (e.id === id ? updated : e)),
    }));
  },

  deleteEnquiry: async (id) => {
    await admissionsApi.deleteEnquiry(id);
    set((state) => ({ enquiries: state.enquiries.filter((e) => e.id !== id) }));
  },

  convertEnquiryToApplication: async (enquiryId) => {
    const app = await admissionsApi.convertEnquiryToApplication(enquiryId);
    // Re-fetch enquiries (status was updated to 'converted') and applications
    const [enquiries, applications] = await Promise.all([
      admissionsApi.getEnquiries(),
      admissionsApi.getApplications(),
    ]);
    set({ enquiries, applications });
    return app;
  },

  // ─── Applications ─────────────────────────────
  createApplication: async (dto) => {
    const created = await admissionsApi.createApplication(dto);
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
