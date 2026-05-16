import { api } from '@/services/api-client';
import type {
  StudentMark,
  CreateStudentMarkDto,
  UpdateStudentMarkDto,
  StudentMarkListParams,
  StudentMarkListResponse,
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

function buildQuery(params?: StudentMarkListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.assessmentId) qs.set('assessmentId', params.assessmentId);
  if (params.studentEnrollmentId) qs.set('studentEnrollmentId', params.studentEnrollmentId);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const marksApi = {
  /** GET /schools/:schoolId/student-marks — requires READ_MARKS */
  list: async (
    schoolId: string,
    params?: StudentMarkListParams,
  ): Promise<StudentMarkListResponse> => {
    const res = await api.get<PaginatedEnvelope<StudentMark>>(
      `/schools/${schoolId}/student-marks${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/student-marks/:id */
  getById: async (schoolId: string, id: string): Promise<StudentMark> => {
    const res = await api.get<ApiEnvelope<StudentMark>>(
      `/schools/${schoolId}/student-marks/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/student-marks — requires MANAGE_MARKS */
  create: async (schoolId: string, body: CreateStudentMarkDto): Promise<StudentMark> => {
    const res = await api.post<ApiEnvelope<StudentMark>>(
      `/schools/${schoolId}/student-marks`,
      body,
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/student-marks/:id — requires MANAGE_MARKS */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateStudentMarkDto,
  ): Promise<StudentMark> => {
    const res = await api.put<ApiEnvelope<StudentMark>>(
      `/schools/${schoolId}/student-marks/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/student-marks/:id — requires MANAGE_MARKS */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/student-marks/${id}`);
  },
};
