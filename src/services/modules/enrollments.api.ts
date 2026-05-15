import { api } from '@/services/api-client';
import type {
  StudentEnrollment,
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentListParams,
  EnrollmentListResponse,
} from '@/types/student.types';

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

function buildQuery(params?: EnrollmentListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.studentId) qs.set('studentId', params.studentId);
  if (params.classSectionId) qs.set('classSectionId', params.classSectionId);
  if (params.academicYearId) qs.set('academicYearId', params.academicYearId);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const enrollmentsApi = {
  /** GET /schools/:schoolId/student-enrollments — populated `student` and `classSection`. */
  list: async (
    schoolId: string,
    params?: EnrollmentListParams,
  ): Promise<EnrollmentListResponse> => {
    const res = await api.get<PaginatedEnvelope<StudentEnrollment>>(
      `/schools/${schoolId}/student-enrollments${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/student-enrollments/:id — flat shape, no populated refs. */
  getById: async (schoolId: string, id: string): Promise<StudentEnrollment> => {
    const res = await api.get<ApiEnvelope<StudentEnrollment>>(
      `/schools/${schoolId}/student-enrollments/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/student-enrollments */
  create: async (
    schoolId: string,
    body: CreateEnrollmentDto,
  ): Promise<StudentEnrollment> => {
    const res = await api.post<ApiEnvelope<StudentEnrollment>>(
      `/schools/${schoolId}/student-enrollments`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/student-enrollments/:id */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateEnrollmentDto,
  ): Promise<StudentEnrollment> => {
    const res = await api.put<ApiEnvelope<StudentEnrollment>>(
      `/schools/${schoolId}/student-enrollments/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/student-enrollments/:id */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(
      `/schools/${schoolId}/student-enrollments/${id}`,
    );
  },
};
