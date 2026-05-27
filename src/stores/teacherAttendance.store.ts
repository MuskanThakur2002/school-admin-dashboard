import { create } from 'zustand';
import { teacherAttendanceApi } from '@/services/modules/teacherAttendance.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  TeacherAttendanceRecord,
  TeacherAttendanceListParams,
  CreateTeacherAttendanceDto,
  UpdateTeacherAttendanceDto,
} from '@/types/teacherAttendance.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

interface TeacherAttendanceState {
  records: TeacherAttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchAttendance: (params?: TeacherAttendanceListParams) => Promise<void>;
  getAttendance: (id: string) => Promise<TeacherAttendanceRecord>;
  markAttendance: (dto: CreateTeacherAttendanceDto) => Promise<TeacherAttendanceRecord>;
  bulkMarkAttendance: (dtos: CreateTeacherAttendanceDto[]) => Promise<TeacherAttendanceRecord[]>;
  updateAttendance: (id: string, dto: UpdateTeacherAttendanceDto) => Promise<TeacherAttendanceRecord>;
  deleteAttendance: (id: string) => Promise<void>;
}

export const useTeacherAttendanceStore = create<TeacherAttendanceState>((set) => ({
  records: [],
  total: 0,
  page: 1,
  limit: 50,
  loading: false,
  error: null,

  fetchAttendance: async (params) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ records: [], total: 0, loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await teacherAttendanceApi.list(schoolId, { page: 1, limit: 50, ...params });
      set({
        records: res.data,
        total: res.total,
        page: res.page,
        limit: res.limit,
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getAttendance: (id) => teacherAttendanceApi.getById(resolveSchoolId(), id),

  markAttendance: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await teacherAttendanceApi.create(schoolId, dto);
    set((s) => ({ records: [created, ...s.records] }));
    return created;
  },

  bulkMarkAttendance: async (dtos) => {
    const schoolId = resolveSchoolId();
    const created = await teacherAttendanceApi.bulkCreate(schoolId, dtos);
    set((s) => ({ records: [...created, ...s.records] }));
    return created;
  },

  updateAttendance: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await teacherAttendanceApi.update(schoolId, id, dto);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    }));
    return updated;
  },

  deleteAttendance: async (id) => {
    const schoolId = resolveSchoolId();
    await teacherAttendanceApi.remove(schoolId, id);
    set((s) => ({
      records: s.records.filter((r) => r.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
