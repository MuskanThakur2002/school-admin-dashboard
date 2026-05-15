import { api } from '@/services/api-client';
import { USE_MOCK_API } from '@/mocks/mock-mode';
import type {
  Application,
  ApplicationDocument,
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
  status: string;
  rejectionReason?: string | null;
  documents: unknown | null;
  submittedAt: string | null;
  reviewedById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentDto {
  id: string;
  schoolId: string;
  studentId: string | null;
  applicationId: string;
  isVerified: boolean;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Atomic approve response — backend creates Student + Enrollment in one call. */
interface ApproveResponseDto {
  application: ApplicationDto & {
    academicYear?: unknown;
    enquiry?: unknown;
    student?: unknown;
  };
  student: {
    id: string;
    admissionNumber: string;
    name: string;
    enrollmentDate: string;
    status: string;
  };
  enrollment: {
    id: string;
    classSectionId: string;
    academicYearId: string;
    studentId: string;
    status: string;
  };
  admissionNumber: string;
}

// Frontend statuses → backend. POST/PUT use these labels directly.
// (Workflow transitions go through dedicated start-review/verify/approve/reject endpoints,
// not through PUT, so the only "writable" status on create is "Pending".)
const STATUS_TO_API: Record<ApplicationStatus, string> = {
  submitted: 'Pending',
  under_review: 'UnderReview',
  verified: 'Verified',
  approved: 'Approved',
  rejected: 'Rejected',
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
  return {
    id: dto.id,
    enquiryId: dto.enquiryId ?? undefined,
    studentName: dto.studentName,
    parentName: dto.parentName,
    parentPhone: dto.phoneNumber,
    parentEmail: dto.email ?? '',
    classApplied: dto.classApplied,
    appliedDate: (dto.submittedAt || dto.createdAt || '').split('T')[0],
    status: STATUS_FROM_API(dto.status),
    rejectionReason: dto.rejectionReason ?? undefined,

    // Documents are loaded lazily per-application by listDocuments.
    documents: [],
    documentsCount: 0,
    documentsVerified: 0,
  };
}

function toDocument(dto: DocumentDto): ApplicationDocument {
  return {
    id: dto.id,
    fileName: dto.fileName,
    fileUrl: dto.fileUrl,
    type: dto.type,
    isVerified: dto.isVerified,
    uploadedAt: dto.uploadedAt,
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
            a.parentName.toLowerCase().includes(q),
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

  // ─── Workflow transitions ────────────────────────────────────────

  /** PATCH /schools/:schoolId/applications/:id/start-review — Submitted → UnderReview */
  startReview: async (schoolId: string, id: string): Promise<Application> => {
    const res = await api.patch<ApiEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications/${id}/start-review`,
    );
    return toApplication(res.data);
  },

  /** PATCH /schools/:schoolId/applications/:id/verify — UnderReview → Verified */
  verify: async (schoolId: string, id: string): Promise<Application> => {
    const res = await api.patch<ApiEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications/${id}/verify`,
    );
    return toApplication(res.data);
  },

  /**
   * POST /schools/:schoolId/applications/:id/approve — Verified → Approved
   * Atomic: creates Student, Enrollment, and admission number in one call.
   * Body fields are UUIDs: `assignedClass` = classMasterId, `assignedSection` = classSectionId.
   */
  approve: async (
    schoolId: string,
    id: string,
    body: { assignedClass: string; assignedSection: string },
  ): Promise<Application> => {
    const res = await api.post<ApiEnvelope<ApproveResponseDto>>(
      `/schools/${schoolId}/applications/${id}/approve`,
      body,
    );
    // Merge approve metadata onto the application so the UI gets admissionNo etc.
    const app = toApplication(res.data.application);
    app.admissionNo = res.data.admissionNumber;
    app.assignedClass = body.assignedClass;
    app.assignedSection = body.assignedSection;
    app.createdStudentId = res.data.student.id;
    return app;
  },

  /** POST /schools/:schoolId/applications/:id/reject — any → Rejected */
  reject: async (
    schoolId: string,
    id: string,
    reason: string,
  ): Promise<Application> => {
    const res = await api.post<ApiEnvelope<ApplicationDto>>(
      `/schools/${schoolId}/applications/${id}/reject`,
      { reason },
    );
    return toApplication(res.data);
  },

  // ─── Documents ───────────────────────────────────────────────────

  /** GET /schools/:schoolId/applications/:id/documents */
  listDocuments: async (
    schoolId: string,
    appId: string,
  ): Promise<ApplicationDocument[]> => {
    const res = await api.get<PaginatedEnvelope<DocumentDto>>(
      `/schools/${schoolId}/applications/${appId}/documents?page=1&limit=100`,
    );
    return res.data.map(toDocument);
  },

  /**
   * POST /schools/:schoolId/applications/:id/documents/upload (multipart)
   * Uploads the raw file to S3 via the backend. Returns the storage key + a
   * pre-signed URL. Caller must follow up with `createDocumentRecord` to
   * persist the document row.
   */
  uploadDocumentFile: async (
    schoolId: string,
    appId: string,
    file: File,
  ): Promise<{ fileUrl: string; validUrl: string; fileName: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.upload<ApiEnvelope<{ fileUrl: string; validUrl: string; fileName: string }>>(
      `/schools/${schoolId}/applications/${appId}/documents/upload`,
      fd,
    );
    return res.data;
  },

  /**
   * POST /schools/:schoolId/applications/:id/documents
   * Creates the persisted document record after a successful file upload.
   */
  createDocumentRecord: async (
    schoolId: string,
    appId: string,
    body: { type: string; fileName: string; fileUrl: string; studentId?: string },
  ): Promise<ApplicationDocument> => {
    const res = await api.post<ApiEnvelope<DocumentDto>>(
      `/schools/${schoolId}/applications/${appId}/documents`,
      {
        schoolId,
        applicationId: appId,
        type: body.type,
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        uploadedAt: new Date().toISOString(),
        ...(body.studentId ? { studentId: body.studentId } : {}),
      },
    );
    return toDocument(res.data);
  },

  /** PATCH /schools/:schoolId/applications/:id/documents/:docId/verify */
  verifyDocument: async (
    schoolId: string,
    appId: string,
    docId: string,
  ): Promise<ApplicationDocument> => {
    const res = await api.patch<ApiEnvelope<DocumentDto>>(
      `/schools/${schoolId}/applications/${appId}/documents/${docId}/verify`,
    );
    return toDocument(res.data);
  },
};

// Exposed for store use: convert frontend gender to API enum
export const toApiGender = GENDER_TO_API;
