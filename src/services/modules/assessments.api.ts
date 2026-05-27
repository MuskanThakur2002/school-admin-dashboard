import { api } from '@/services/api-client';
import type {
  Assessment,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssessmentListParams,
  AssessmentListResponse,
} from '@/types/assessment.types';

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

function buildQuery(params?: AssessmentListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const assessmentsApi = {
  /** GET /schools/:schoolId/assessments — requires READ_MARKS / MANAGE_ASSESSMENTS */
  list: async (
    schoolId: string,
    params?: AssessmentListParams,
  ): Promise<AssessmentListResponse> => {
    const res = await api.get<PaginatedEnvelope<Assessment>>(
      `/schools/${schoolId}/assessments${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/assessments/:id */
  getById: async (schoolId: string, id: string): Promise<Assessment> => {
    const res = await api.get<ApiEnvelope<Assessment>>(
      `/schools/${schoolId}/assessments/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/assessments — requires MANAGE_ASSESSMENTS */
  create: async (schoolId: string, body: CreateAssessmentDto): Promise<Assessment> => {
    const res = await api.post<ApiEnvelope<Assessment>>(
      `/schools/${schoolId}/assessments`,
      body,
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/assessments/:id — requires MANAGE_ASSESSMENTS */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateAssessmentDto,
  ): Promise<Assessment> => {
    const res = await api.put<ApiEnvelope<Assessment>>(
      `/schools/${schoolId}/assessments/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/assessments/:id — requires MANAGE_ASSESSMENTS */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/assessments/${id}`);
  },

  /**
   * POST /schools/:schoolId/assessments/upload — requires MANAGE_ASSESSMENTS.
   * Upload an exam image WITHOUT attaching it to a record. Returns the S3 key
   * (`fileUrl`) + a temporary signed `validUrl`; pass the key as `imageUrl`
   * on a later create/update.
   */
  uploadImage: async (
    schoolId: string,
    file: File,
  ): Promise<{ fileUrl: string; validUrl: string; fileName: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.upload<ApiEnvelope<{ fileUrl: string; validUrl: string; fileName: string }>>(
      `/schools/${schoolId}/assessments/upload`,
      fd,
    );
    return res.data;
  },
};
