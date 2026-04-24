import { api } from '@/services/api-client';
import type {
  School,
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolListParams,
  SchoolListResponse,
} from '@/types/school.types';

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

function buildQuery(params: SchoolListParams | undefined): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const schoolsApi = {
  /** GET /schools — requires READ_SCHOOL */
  list: async (params?: SchoolListParams): Promise<SchoolListResponse> => {
    const res = await api.get<PaginatedEnvelope<School>>(`/schools${buildQuery(params)}`);
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:id */
  getById: async (id: string): Promise<School> => {
    const res = await api.get<ApiEnvelope<School>>(`/schools/${id}`);
    return res.data;
  },

  /** POST /schools — requires CREATE_SCHOOL */
  create: async (body: CreateSchoolDto): Promise<School> => {
    const res = await api.post<ApiEnvelope<School>>('/schools', body);
    return res.data;
  },

  /** PUT /schools/:id — requires UPDATE_SCHOOL */
  update: async (id: string, body: UpdateSchoolDto): Promise<School> => {
    const res = await api.put<ApiEnvelope<School>>(`/schools/${id}`, body);
    return res.data;
  },

  /** DELETE /schools/:id — requires DELETE_SCHOOL */
  remove: async (id: string): Promise<void> => {
    await api.delete<ApiEnvelope<null>>(`/schools/${id}`);
  },
};
