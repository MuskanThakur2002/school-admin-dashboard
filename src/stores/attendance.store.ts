import { create } from 'zustand';
import { attendanceApi } from '@/services/modules/attendance.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  AttendanceRecord,
  AttendanceListParams,
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
  updateAttendance: (id: string, dto: UpdateAttendanceDto) => Promise<AttendanceRecord>;
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

  updateAttendance: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await attendanceApi.update(schoolId, id, dto);
    set((s) => ({
      records: s.records.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    }));
    return updated;
  },
}));
