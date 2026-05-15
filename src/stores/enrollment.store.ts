import { create } from 'zustand';
import { enrollmentsApi } from '@/services/modules/enrollments.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  StudentEnrollment,
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentListParams,
} from '@/types/student.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

interface EnrollmentState {
  enrollments: StudentEnrollment[];
  total: number;
  loading: boolean;
  error: string | null;

  fetchEnrollments: (params?: EnrollmentListParams) => Promise<StudentEnrollment[]>;
  getEnrollment: (id: string) => Promise<StudentEnrollment>;
  createEnrollment: (dto: CreateEnrollmentDto) => Promise<StudentEnrollment>;
  updateEnrollment: (id: string, dto: UpdateEnrollmentDto) => Promise<StudentEnrollment>;
  deleteEnrollment: (id: string) => Promise<void>;
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
  enrollments: [],
  total: 0,
  loading: false,
  error: null,

  fetchEnrollments: async (params) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ enrollments: [], total: 0, loading: false });
      return [];
    }
    set({ loading: true, error: null });
    try {
      const res = await enrollmentsApi.list(schoolId, { page: 1, limit: 500, ...params });
      set({ enrollments: res.data, total: res.total, loading: false });
      return res.data;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return [];
    }
  },

  getEnrollment: (id) => enrollmentsApi.getById(resolveSchoolId(), id),

  createEnrollment: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await enrollmentsApi.create(schoolId, dto);
    set((s) => ({ enrollments: [created, ...s.enrollments], total: s.total + 1 }));
    return created;
  },

  updateEnrollment: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await enrollmentsApi.update(schoolId, id, dto);
    set((s) => ({
      enrollments: s.enrollments.map((e) => (e.id === id ? { ...e, ...updated } : e)),
    }));
    return updated;
  },

  deleteEnrollment: async (id) => {
    const schoolId = resolveSchoolId();
    await enrollmentsApi.remove(schoolId, id);
    set((s) => ({
      enrollments: s.enrollments.filter((e) => e.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
