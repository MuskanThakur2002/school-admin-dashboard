import { create } from 'zustand';
import { homeworkApi } from '@/services/modules/homework.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Homework,
  CreateHomeworkDto,
  UpdateHomeworkDto,
  HomeworkListParams,
  HomeworkAttachmentFile,
} from '@/types/homework.types';

interface HomeworkState {
  items: Homework[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  filters: { classSectionId?: string; subjectId?: string };

  fetchHomework: (params?: HomeworkListParams) => Promise<void>;
  getHomework: (id: string) => Promise<Homework>;
  createHomework: (input: Omit<CreateHomeworkDto, 'schoolId'>) => Promise<Homework>;
  updateHomework: (id: string, input: UpdateHomeworkDto) => Promise<Homework>;
  deleteHomework: (id: string) => Promise<void>;
  uploadAttachment: (id: string, file: File) => Promise<Homework>;
  uploadAttachmentFile: (file: File) => Promise<HomeworkAttachmentFile>;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

export const useHomeworkStore = create<HomeworkState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  filters: {},

  fetchHomework: async (params) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ items: [], total: 0, page: 1, limit: get().limit, loading: false });
      return;
    }

    const merged: HomeworkListParams = {
      page: params?.page ?? get().page,
      limit: params?.limit ?? get().limit,
      classSectionId: params?.classSectionId ?? get().filters.classSectionId,
      subjectId: params?.subjectId ?? get().filters.subjectId,
    };

    set({
      loading: true,
      error: null,
      filters: {
        classSectionId: merged.classSectionId,
        subjectId: merged.subjectId,
      },
    });
    try {
      const res = await homeworkApi.list(schoolId, merged);
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

  getHomework: async (id) => {
    const schoolId = resolveSchoolId();
    return homeworkApi.getById(schoolId, id);
  },

  createHomework: async (input) => {
    const schoolId = resolveSchoolId();
    const created = await homeworkApi.create(schoolId, { ...input, schoolId });
    set((s) => ({ items: [created, ...s.items], total: s.total + 1 }));
    return created;
  },

  updateHomework: async (id, input) => {
    const schoolId = resolveSchoolId();
    const updated = await homeworkApi.update(schoolId, id, input);
    set((s) => ({
      items: s.items.map((h) => (h.id === id ? { ...h, ...updated } : h)),
    }));
    return updated;
  },

  deleteHomework: async (id) => {
    const schoolId = resolveSchoolId();
    await homeworkApi.remove(schoolId, id);
    set((s) => ({
      items: s.items.filter((h) => h.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },

  uploadAttachment: async (id, file) => {
    const schoolId = resolveSchoolId();
    const { homework } = await homeworkApi.uploadAttachment(schoolId, id, file);
    set((s) => ({
      items: s.items.map((h) => (h.id === id ? { ...h, ...homework } : h)),
    }));
    return homework;
  },

  // Standalone upload for the create flow — the homework doesn't exist yet,
  // so we just return the stored key + signed URL to fold into the create
  // payload's `attachments.files[]`.
  uploadAttachmentFile: async (file) => {
    const schoolId = resolveSchoolId();
    const { fileUrl, validUrl, fileName } = await homeworkApi.uploadAttachmentFile(schoolId, file);
    return { fileUrl, validUrl, fileName };
  },
}));
