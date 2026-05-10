import { api } from '@/services/api-client';
import { USE_MOCK_API } from '@/mocks/mock-mode';
import type {
  Application,
  ApplicationStatus,
} from '@/types/admissions.types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Backend DTO ────────────────────────────────────────────────
interface ApplicationDto {
  id: string;
  schoolId: string;
  enquiryId: string | null;
  applicationNumber: string | null;
  studentName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  parentName: string;
  phoneNumber: string;
  email: string;
  address: string | null;
  classApplied: string;
  academicYearId: string;
  status: string; // Currently only "Pending"; future: UnderReview, Verified, Approved, Rejected
  documents: unknown | null;
  submittedAt: string | null;
  reviewedById: string | null;
  createdAt: string;
  updatedAt: string;
}

// Frontend statuses → backend (only Pending is supported today).
// We default everything else to Pending on POST so writes don't fail.
const STATUS_TO_API: Record<ApplicationStatus, string> = {
  submitted: 'Pending',
  under_review: 'Pending',
  verified: 'Pending',
  approved: 'Pending',
  rejected: 'Pending',
};

const STATUS_FROM_API = (s: string): ApplicationStatus => {
  switch (s) {
    case 'Pending': return 'submitted';
    case 'UnderReview': return 'under_review';
    case 'Verified': return 'verified';
    case 'Approved': return 'approved';
    case 'Rejected': return 'rejected';
    default: return 'submitted';
  }
};

const GENDER_TO_API = (g: 'male' | 'female' | 'other'): 'Male' | 'Female' | 'Other' => {
  if (g === 'male') return 'Male';
  if (g === 'female') return 'Female';
  return 'Other';
};

// ─── Mappers ────────────────────────────────────────────────────
function toApplication(dto: ApplicationDto): Application {
  // Display-friendly application no: backend may not generate one yet,
  // so fall back to first 8 chars of UUID.
  const applicationNo = dto.applicationNumber ?? `APP-${dto.id.slice(0, 8).toUpperCase()}`;

  return {
    id: dto.id,
    applicationNo,
    enquiryId: dto.enquiryId ?? undefined,
    studentName: dto.studentName,
    parentName: dto.parentName,
    parentPhone: dto.phoneNumber,
    parentEmail: dto.email ?? '',
    classApplied: dto.classApplied,
    appliedDate: (dto.submittedAt || dto.createdAt || '').split('T')[0],
    status: STATUS_FROM_API(dto.status),

    // Frontend-only fields default to empty/undefined when fetched from backend.
    documents: [],
    documentsCount: 0,
    documentsVerified: 0,
  };
}

export interface CreateApplicationApiBody {
  enquiryId?: string;
  studentName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  parentName: string;
  phoneNumber: string;
  email: string;
  classApplied: string;
  academicYearId: string;
  status: string; // Always "Pending" today
  address?: string;
}

export interface ApplicationListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ApplicationStatus;
}

export interface ApplicationListResponse {
  data: Application[];
  total: number;
  page: number;
  limit: number;
}

function buildQuery(params?: ApplicationListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', STATUS_TO_API[params.status]);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ─── Mock fallback (keeps existing UI working when USE_MOCK_API=true) ──
let mockApplicationsDb: Application[] = [];
const mockDelay = <T>(v: T): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), 150));

export const applicationsApi = {
  /** GET /schools/:schoolId/applications — requires MANAGE_APPLICATIONS */
  list: async (
    schoolId: string,
    params?: ApplicationListParams,
  ): Promise<ApplicationListResponse> => {
    if (USE_MOCK_API) {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 100;
      let filtered = [...mockApplicationsDb];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.studentName.toLowerCase().includes(q) ||
            a.parentName.toLowerCase().includes(q) ||
            a.applicationNo.toLowerCase().includes(q),
        );
      }
      if (params?.status) filtered = filtered.filter((a) => a.status === params.status);
      const start = (page - 1) * limit;
      return mockDelay({
        data: filtered.slice(start, start + limit),
        total: filtered.length,
        page,
        limit,
      });
    }
    const res = await api.get<PaginatedEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications${buildQuery(params)}`,
    );
    return {
      data: res.data.map(toApplication),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  },

  /** GET /schools/:schoolId/applications/:id — requires MANAGE_APPLICATIONS */
  getById: async (schoolId: string, id: string): Promise<Application> => {
    if (USE_MOCK_API) {
      const a = mockApplicationsDb.find((x) => x.id === id);
      if (!a) return Promise.reject(new Error('Application not found'));
      return mockDelay(a);
    }
    const res = await api.get<ApiEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications/${id}`,
    );
    return toApplication(res.data);
  },

  /** POST /schools/:schoolId/applications — requires MANAGE_APPLICATIONS */
  create: async (
    schoolId: string,
    body: CreateApplicationApiBody,
  ): Promise<Application> => {
    if (USE_MOCK_API) {
      const application: Application = {
        id: crypto.randomUUID(),
        applicationNo: `APP-${Date.now().toString().slice(-6)}`,
        enquiryId: body.enquiryId,
        studentName: body.studentName,
        parentName: body.parentName,
        parentPhone: body.phoneNumber,
        parentEmail: body.email,
        classApplied: body.classApplied,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'submitted',
        documents: [],
        documentsCount: 0,
        documentsVerified: 0,
      };
      mockApplicationsDb = [application, ...mockApplicationsDb];
      return mockDelay(application);
    }
    const res = await api.post<ApiEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications`,
      body,
    );
    return toApplication(res.data);
  },

  /** PUT /schools/:schoolId/applications/:id — requires MANAGE_APPLICATIONS */
  update: async (
    schoolId: string,
    id: string,
    body: Partial<CreateApplicationApiBody>,
  ): Promise<Application> => {
    if (USE_MOCK_API) {
      const idx = mockApplicationsDb.findIndex((a) => a.id === id);
      if (idx === -1) return Promise.reject(new Error('Application not found'));
      mockApplicationsDb[idx] = { ...mockApplicationsDb[idx] };
      return mockDelay(mockApplicationsDb[idx]);
    }
    const res = await api.put<ApiEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications/${id}`,
      body,
    );
    return toApplication(res.data);
  },

  /** DELETE /schools/:schoolId/applications/:id — requires MANAGE_APPLICATIONS */
  remove: async (schoolId: string, id: string): Promise<void> => {
    if (USE_MOCK_API) {
      mockApplicationsDb = mockApplicationsDb.filter((a) => a.id !== id);
      await mockDelay(undefined);
      return;
    }
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/applications/${id}`);
  },
};

// Exposed for store use: convert frontend gender to API enum
export const toApiGender = GENDER_TO_API;
