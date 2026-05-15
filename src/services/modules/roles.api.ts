import { api } from '@/services/api-client';
import { USE_MOCK_API } from '@/mocks/mock-mode';
import type { Role, RoleListParams, RoleListResponse } from '@/types/role.types';

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

export interface CreateRoleDto {
  name: string;
  permissions: string[];
}

export type UpdateRoleDto = CreateRoleDto;

function buildQuery(params: RoleListParams | undefined): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ─── Mock seed (used only when USE_MOCK_API is true) ──────────
const MOCK_NOW = new Date().toISOString();
let mockRolesDb: Role[] = [
  { id: 'r1', schoolId: 'mock-school', name: 'Principal', permissions: ['MANAGE_CLASSES', 'MANAGE_TIMETABLE', 'READ_TEACHER', 'READ_STUDENT'], createdAt: MOCK_NOW, updatedAt: MOCK_NOW },
  { id: 'r2', schoolId: 'mock-school', name: 'Office Staff', permissions: ['READ_STUDENT', 'COLLECT_FEES', 'MANAGE_LEDGER'], createdAt: MOCK_NOW, updatedAt: MOCK_NOW },
];

const mockDelay = <T>(v: T): Promise<T> => new Promise((r) => setTimeout(() => r(v), 150));

export const rolesApi = {
  /** GET /schools/:schoolId/roles — requires READ_ROLE */
  list: async (schoolId: string, params?: RoleListParams): Promise<RoleListResponse> => {
    if (USE_MOCK_API) {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      const start = (page - 1) * limit;
      return mockDelay({ data: mockRolesDb.slice(start, start + limit), total: mockRolesDb.length, page, limit });
    }
    const res = await api.get<PaginatedEnvelope<Role>>(`/schools/${schoolId}/roles${buildQuery(params)}`);
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/roles/:id — requires READ_ROLE */
  getById: async (schoolId: string, id: string): Promise<Role> => {
    if (USE_MOCK_API) {
      const role = mockRolesDb.find((r) => r.id === id);
      if (!role) return Promise.reject(new Error('Role not found'));
      return mockDelay(role);
    }
    const res = await api.get<ApiEnvelope<Role>>(`/schools/${schoolId}/roles/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/roles — requires CREATE_ROLE */
  create: async (schoolId: string, body: CreateRoleDto): Promise<Role> => {
    if (USE_MOCK_API) {
      const now = new Date().toISOString();
      const role: Role = { id: crypto.randomUUID(), schoolId, name: body.name, permissions: body.permissions, createdAt: now, updatedAt: now };
      mockRolesDb = [role, ...mockRolesDb];
      return mockDelay(role);
    }
    const res = await api.post<ApiEnvelope<Role>>(`/schools/${schoolId}/roles`, { schoolId, ...body });
    return res.data;
  },

  /** PUT /schools/:schoolId/roles/:id — requires UPDATE_ROLE */
  update: async (schoolId: string, id: string, body: UpdateRoleDto): Promise<Role> => {
    if (USE_MOCK_API) {
      const idx = mockRolesDb.findIndex((r) => r.id === id);
      if (idx === -1) return Promise.reject(new Error('Role not found'));
      const updated: Role = { ...mockRolesDb[idx], ...body, updatedAt: new Date().toISOString() };
      mockRolesDb = mockRolesDb.map((r) => r.id === id ? updated : r);
      return mockDelay(updated);
    }
    const res = await api.put<ApiEnvelope<Role>>(`/schools/${schoolId}/roles/${id}`, body);
    return res.data;
  },

  /** DELETE /schools/:schoolId/roles/:id — requires DELETE_ROLE */
  remove: async (schoolId: string, id: string): Promise<void> => {
    if (USE_MOCK_API) {
      mockRolesDb = mockRolesDb.filter((r) => r.id !== id);
      await mockDelay(undefined);
      return;
    }
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/roles/${id}`);
  },
};
