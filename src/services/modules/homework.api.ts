import { api } from '@/services/api-client';
import type {
  Homework,
  CreateHomeworkDto,
  UpdateHomeworkDto,
  HomeworkListParams,
  HomeworkListResponse,
} from '@/types/homework.types';

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

function buildQuery(params?: HomeworkListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.classSectionId) qs.set('classSectionId', params.classSectionId);
  if (params.subjectId) qs.set('subjectId', params.subjectId);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const homeworkApi = {
  /** GET /schools/:schoolId/homework — requires READ_HOMEWORK */
  list: async (schoolId: string, params?: HomeworkListParams): Promise<HomeworkListResponse> => {
    const res = await api.get<PaginatedEnvelope<Homework>>(
      `/schools/${schoolId}/homework${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/homework/:id — requires READ_HOMEWORK */
  getById: async (schoolId: string, id: string): Promise<Homework> => {
    const res = await api.get<ApiEnvelope<Homework>>(`/schools/${schoolId}/homework/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/homework — requires MANAGE_HOMEWORK */
  create: async (schoolId: string, body: CreateHomeworkDto): Promise<Homework> => {
    const res = await api.post<ApiEnvelope<Homework>>(`/schools/${schoolId}/homework`, body);
    return res.data;
  },

  /** PUT /schools/:schoolId/homework/:id — requires MANAGE_HOMEWORK */
  update: async (schoolId: string, id: string, body: UpdateHomeworkDto): Promise<Homework> => {
    const res = await api.put<ApiEnvelope<Homework>>(
      `/schools/${schoolId}/homework/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/homework/:id — requires MANAGE_HOMEWORK */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/homework/${id}`);
  },
};
