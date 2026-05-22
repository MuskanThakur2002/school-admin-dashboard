import { api } from '@/services/api-client';
import type {
  Parent,
  CreateParentDto,
  UpdateParentDto,
  ParentListParams,
  ParentListResponse,
} from '@/types/parent.types';

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

function buildQuery(params?: ParentListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const parentsApi = {
  /** GET /schools/:schoolId/parents — requires READ_PARENT */
  list: async (schoolId: string, params?: ParentListParams): Promise<ParentListResponse> => {
    const res = await api.get<PaginatedEnvelope<Parent>>(
      `/schools/${schoolId}/parents${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/parents/search?q=... — requires READ_PARENT */
  search: async (schoolId: string, q: string): Promise<Parent[]> => {
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const res = await api.get<ApiEnvelope<Parent[]>>(
      `/schools/${schoolId}/parents/search${qs}`,
    );
    return res.data;
  },

  /** GET /schools/:schoolId/parents/:id — requires READ_PARENT */
  getById: async (schoolId: string, id: string): Promise<Parent> => {
    const res = await api.get<ApiEnvelope<Parent>>(`/schools/${schoolId}/parents/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/parents — requires CREATE_PARENT */
  create: async (schoolId: string, body: CreateParentDto): Promise<Parent> => {
    const res = await api.post<ApiEnvelope<Parent>>(`/schools/${schoolId}/parents`, body);
    return res.data;
  },

  /** PUT /schools/:schoolId/parents/:id — requires UPDATE_PARENT */
  update: async (schoolId: string, id: string, body: UpdateParentDto): Promise<Parent> => {
    const res = await api.put<ApiEnvelope<Parent>>(
      `/schools/${schoolId}/parents/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/parents/:id — requires DELETE_PARENT */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/parents/${id}`);
  },
};
