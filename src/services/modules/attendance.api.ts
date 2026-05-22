import { api } from '@/services/api-client';
import type {
  AttendanceRecord,
  AttendanceListParams,
  AttendanceListResponse,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from '@/types/attendance.types';

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

function buildQuery(params?: AttendanceListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.date) qs.set('date', params.date);
  if (params.studentEnrollmentId) qs.set('studentEnrollmentId', params.studentEnrollmentId);
  if (params.classSectionId) qs.set('classSectionId', params.classSectionId);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const attendanceApi = {
  /** GET /schools/:schoolId/attendance — requires READ_ATTENDANCE */
  list: async (
    schoolId: string,
    params?: AttendanceListParams,
  ): Promise<AttendanceListResponse> => {
    const res = await api.get<PaginatedEnvelope<AttendanceRecord>>(
      `/schools/${schoolId}/attendance${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** POST /schools/:schoolId/attendance — requires MARK_ATTENDANCE */
  create: async (schoolId: string, body: CreateAttendanceDto): Promise<AttendanceRecord> => {
    const res = await api.post<ApiEnvelope<AttendanceRecord>>(
      `/schools/${schoolId}/attendance`,
      body,
    );
    return res.data;
  },

  /** GET /schools/:schoolId/attendance/:id — requires READ_ATTENDANCE */
  getById: async (schoolId: string, id: string): Promise<AttendanceRecord> => {
    const res = await api.get<ApiEnvelope<AttendanceRecord>>(
      `/schools/${schoolId}/attendance/${id}`,
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/attendance/:id — admin override; requires MARK_ATTENDANCE */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateAttendanceDto,
  ): Promise<AttendanceRecord> => {
    const res = await api.put<ApiEnvelope<AttendanceRecord>>(
      `/schools/${schoolId}/attendance/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/attendance/:id — requires MARK_ATTENDANCE */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/attendance/${id}`);
  },
};
