import { create } from 'zustand';
import { assessmentsApi } from '@/services/modules/assessments.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Assessment,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssessmentListParams,
} from '@/types/assessment.types';

interface AssessmentState {
  items: Assessment[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchAssessments: (params?: AssessmentListParams) => Promise<void>;
  getAssessment: (id: string) => Promise<Assessment>;
  createAssessment: (input: Omit<CreateAssessmentDto, 'schoolId'>) => Promise<Assessment>;
  updateAssessment: (id: string, input: UpdateAssessmentDto) => Promise<Assessment>;
  deleteAssessment: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<{ fileUrl: string; validUrl: string }>;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,

  fetchAssessments: async (params) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ items: [], total: 0, page: 1, limit: get().limit, loading: false });
      return;
    }

    const merged: AssessmentListParams = {
      page: params?.page ?? get().page,
      limit: params?.limit ?? get().limit,
    };

    set({ loading: true, error: null });
    try {
      const res = await assessmentsApi.list(schoolId, merged);
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

  getAssessment: async (id) => {
    const schoolId = resolveSchoolId();
    return assessmentsApi.getById(schoolId, id);
  },

  createAssessment: async (input) => {
    const schoolId = resolveSchoolId();
    const created = await assessmentsApi.create(schoolId, { ...input, schoolId });
    set((s) => ({ items: [created, ...s.items], total: s.total + 1 }));
    return created;
  },

  updateAssessment: async (id, input) => {
    const schoolId = resolveSchoolId();
    const updated = await assessmentsApi.update(schoolId, id, input);
    set((s) => ({
      items: s.items.map((a) => (a.id === id ? { ...a, ...updated } : a)),
    }));
    return updated;
  },

  deleteAssessment: async (id) => {
    const schoolId = resolveSchoolId();
    await assessmentsApi.remove(schoolId, id);
    set((s) => ({
      items: s.items.filter((a) => a.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },

  uploadImage: async (file) => {
    const schoolId = resolveSchoolId();
    const { fileUrl, validUrl } = await assessmentsApi.uploadImage(schoolId, file);
    return { fileUrl, validUrl };
  },
}));
