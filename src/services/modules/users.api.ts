import { api } from '@/services/api-client';
import type {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserListParams,
  UserListResponse,
} from '@/types/user.types';

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

function buildQuery(params?: UserListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const usersApi = {
  /** GET /schools/:schoolId/users — requires READ_USER */
  list: async (schoolId: string, params?: UserListParams): Promise<UserListResponse> => {
    const res = await api.get<PaginatedEnvelope<User>>(
      `/schools/${schoolId}/users${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/users/:id — requires READ_USER */
  getById: async (schoolId: string, id: string): Promise<User> => {
    const res = await api.get<ApiEnvelope<User>>(`/schools/${schoolId}/users/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/users — requires CREATE_USER */
  create: async (schoolId: string, body: CreateUserDto): Promise<User> => {
    const res = await api.post<ApiEnvelope<User>>(`/schools/${schoolId}/users`, body);
    return res.data;
  },

  /** PUT /schools/:schoolId/users/:id — requires UPDATE_USER */
  update: async (schoolId: string, id: string, body: UpdateUserDto): Promise<User> => {
    const res = await api.put<ApiEnvelope<User>>(`/schools/${schoolId}/users/${id}`, body);
    return res.data;
  },

  /** DELETE /schools/:schoolId/users/:id — requires DELETE_USER */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/users/${id}`);
  },
};
