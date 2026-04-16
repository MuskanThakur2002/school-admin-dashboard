import { create } from 'zustand';
import {
  teacherApi,
  type CreateTeacherDto,
  type UpdateTeacherDto,
} from '@/services/modules/teacher.api';
import type { Teacher } from '@/types/teacher.types';

interface TeacherState {
  teachers: Teacher[];
  loading: boolean;
  error: string | null;

  fetchTeachers: () => Promise<void>;
  getTeacher: (id: string) => Promise<Teacher>;
  searchTeachers: (query: string) => Promise<Teacher[]>;
  createTeacher: (dto: CreateTeacherDto) => Promise<Teacher>;
  updateTeacher: (id: string, dto: UpdateTeacherDto) => Promise<Teacher>;
  deleteTeacher: (id: string) => Promise<void>;
}

export const useTeacherStore = create<TeacherState>((set) => ({
  teachers: [],
  loading: false,
  error: null,

  fetchTeachers: async () => {
    set({ loading: true, error: null });
    try {
      const data = await teacherApi.getTeachers();
      set({ teachers: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getTeacher: (id: string) => teacherApi.getTeacher(id),

  searchTeachers: (query: string) => teacherApi.searchTeachers(query),

  createTeacher: async (dto) => {
    const created = await teacherApi.createTeacher(dto);
    set((state) => ({ teachers: [created, ...state.teachers] }));
    return created;
  },

  updateTeacher: async (id, dto) => {
    const updated = await teacherApi.updateTeacher(id, dto);
    set((state) => ({
      teachers: state.teachers.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  deleteTeacher: async (id) => {
    await teacherApi.deleteTeacher(id);
    set((state) => ({
      teachers: state.teachers.filter((t) => t.id !== id),
    }));
  },
}));
