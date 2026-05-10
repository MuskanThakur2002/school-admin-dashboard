import { api } from '@/services/api-client';
import type {
  Teacher,
  CreateTeacherDto,
  UpdateTeacherDto,
  TeacherListParams,
  TeacherListResponse,
} from '@/types/teacher.types';

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

function buildQuery(params?: TeacherListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const teacherApi = {
  /** GET /schools/:schoolId/teachers — requires READ_TEACHER */
  list: async (schoolId: string, params?: TeacherListParams): Promise<TeacherListResponse> => {
    const res = await api.get<PaginatedEnvelope<Teacher>>(
      `/schools/${schoolId}/teachers${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/teachers/:id — requires READ_TEACHER */
  getById: async (schoolId: string, id: string): Promise<Teacher> => {
    const res = await api.get<ApiEnvelope<Teacher>>(`/schools/${schoolId}/teachers/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/teachers — requires CREATE_TEACHER */
  create: async (schoolId: string, body: CreateTeacherDto): Promise<Teacher> => {
    const res = await api.post<ApiEnvelope<Teacher>>(`/schools/${schoolId}/teachers`, body);
    return res.data;
  },

  /** PUT /schools/:schoolId/teachers/:id — requires UPDATE_TEACHER */
  update: async (schoolId: string, id: string, body: UpdateTeacherDto): Promise<Teacher> => {
    const res = await api.put<ApiEnvelope<Teacher>>(
      `/schools/${schoolId}/teachers/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/teachers/:id — requires DELETE_TEACHER */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/teachers/${id}`);
  },
};
