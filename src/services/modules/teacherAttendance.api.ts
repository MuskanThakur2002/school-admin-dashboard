import { api } from '@/services/api-client';
import type {
  TeacherAttendanceRecord,
  TeacherAttendanceListParams,
  TeacherAttendanceListResponse,
  CreateTeacherAttendanceDto,
  UpdateTeacherAttendanceDto,
} from '@/types/teacherAttendance.types';

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

function buildQuery(params?: TeacherAttendanceListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.date) qs.set('date', params.date);
  if (params.teacherId) qs.set('teacherId', params.teacherId);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const teacherAttendanceApi = {
  /** GET /schools/:schoolId/teacher-attendance */
  list: async (
    schoolId: string,
    params?: TeacherAttendanceListParams,
  ): Promise<TeacherAttendanceListResponse> => {
    const res = await api.get<PaginatedEnvelope<TeacherAttendanceRecord>>(
      `/schools/${schoolId}/teacher-attendance${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** POST /schools/:schoolId/teacher-attendance — mark one teacher. */
  create: async (
    schoolId: string,
    body: CreateTeacherAttendanceDto,
  ): Promise<TeacherAttendanceRecord> => {
    const res = await api.post<ApiEnvelope<TeacherAttendanceRecord>>(
      `/schools/${schoolId}/teacher-attendance`,
      body,
    );
    return res.data;
  },

  /**
   * POST /schools/:schoolId/teacher-attendance — bulk variant. The endpoint
   * accepts an array body and returns the created rows. The envelope `data`
   * may be a single record or an array depending on the body shape, so we
   * normalise to an array here.
   */
  bulkCreate: async (
    schoolId: string,
    body: CreateTeacherAttendanceDto[],
  ): Promise<TeacherAttendanceRecord[]> => {
    const res = await api.post<ApiEnvelope<TeacherAttendanceRecord | TeacherAttendanceRecord[]>>(
      `/schools/${schoolId}/teacher-attendance`,
      body,
    );
    return Array.isArray(res.data) ? res.data : [res.data];
  },

  /** GET /schools/:schoolId/teacher-attendance/:id */
  getById: async (schoolId: string, id: string): Promise<TeacherAttendanceRecord> => {
    const res = await api.get<ApiEnvelope<TeacherAttendanceRecord>>(
      `/schools/${schoolId}/teacher-attendance/${id}`,
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/teacher-attendance/:id */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateTeacherAttendanceDto,
  ): Promise<TeacherAttendanceRecord> => {
    const res = await api.put<ApiEnvelope<TeacherAttendanceRecord>>(
      `/schools/${schoolId}/teacher-attendance/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/teacher-attendance/:id */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/teacher-attendance/${id}`);
  },
};
