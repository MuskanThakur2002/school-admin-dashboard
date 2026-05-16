import { create } from 'zustand';
import { marksApi } from '@/services/modules/marks.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  StudentMark,
  CreateStudentMarkDto,
  UpdateStudentMarkDto,
  StudentMarkListParams,
} from '@/types/assessment.types';

interface MarksState {
  items: StudentMark[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  filters: { assessmentId?: string; studentEnrollmentId?: string };

  fetchMarks: (params?: StudentMarkListParams) => Promise<void>;
  getMark: (id: string) => Promise<StudentMark>;
  createMark: (input: Omit<CreateStudentMarkDto, 'schoolId'>) => Promise<StudentMark>;
  updateMark: (id: string, input: UpdateStudentMarkDto) => Promise<StudentMark>;
  deleteMark: (id: string) => Promise<void>;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

export const useMarksStore = create<MarksState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  filters: {},

  fetchMarks: async (params) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ items: [], total: 0, page: 1, limit: get().limit, loading: false });
      return;
    }

    const merged: StudentMarkListParams = {
      page: params?.page ?? get().page,
      limit: params?.limit ?? get().limit,
      assessmentId: params?.assessmentId ?? get().filters.assessmentId,
      studentEnrollmentId: params?.studentEnrollmentId ?? get().filters.studentEnrollmentId,
    };

    set({
      loading: true,
      error: null,
      filters: {
        assessmentId: merged.assessmentId,
        studentEnrollmentId: merged.studentEnrollmentId,
      },
    });
    try {
      const res = await marksApi.list(schoolId, merged);
      set({
        items: res.data,
        total: res.total,
        page: res.page,
        limit: res.limit,
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getMark: async (id) => {
    const schoolId = resolveSchoolId();
    return marksApi.getById(schoolId, id);
  },

  createMark: async (input) => {
    const schoolId = resolveSchoolId();
    const created = await marksApi.create(schoolId, { ...input, schoolId });
    set((s) => ({ items: [created, ...s.items], total: s.total + 1 }));
    return created;
  },

  updateMark: async (id, input) => {
    const schoolId = resolveSchoolId();
    const updated = await marksApi.update(schoolId, id, input);
    set((s) => ({
      items: s.items.map((m) => (m.id === id ? { ...m, ...updated } : m)),
    }));
    return updated;
  },

  deleteMark: async (id) => {
    const schoolId = resolveSchoolId();
    await marksApi.remove(schoolId, id);
    set((s) => ({
      items: s.items.filter((m) => m.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
