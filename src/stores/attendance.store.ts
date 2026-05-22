import { create } from 'zustand';
import { attendanceApi } from '@/services/modules/attendance.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  AttendanceRecord,
  AttendanceListParams,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from '@/types/attendance.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

interface AttendanceState {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchAttendance: (params?: AttendanceListParams) => Promise<void>;
  getAttendance: (id: string) => Promise<AttendanceRecord>;
  markAttendance: (dto: CreateAttendanceDto) => Promise<AttendanceRecord>;
  updateAttendance: (id: string, dto: UpdateAttendanceDto) => Promise<AttendanceRecord>;
  deleteAttendance: (id: string) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
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
      const res = await attendanceApi.list(schoolId, { page: 1, limit: 50, ...params });
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

  getAttendance: (id) => attendanceApi.getById(resolveSchoolId(), id),

  markAttendance: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await attendanceApi.create(schoolId, dto);
    set((s) => ({ records: [created, ...s.records] }));
    return created;
  },

  updateAttendance: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await attendanceApi.update(schoolId, id, dto);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    }));
    return updated;
  },

  deleteAttendance: async (id) => {
    const schoolId = resolveSchoolId();
    await attendanceApi.remove(schoolId, id);
    set((s) => ({
      records: s.records.filter((r) => r.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
