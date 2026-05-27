import { create } from 'zustand';
import {
  studentsApi,
  demoStudentsApi,
  type CreateStudentFromApplicationDto,
  type PromoteStudentDto,
} from '@/services/modules/students.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Student,
  CreateStudentDto,
  UpdateStudentDto,
  DemoStudent,
} from '@/types/student.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

// ─── Real backend store ──────────────────────────────────────────

interface StudentsState {
  students: Student[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchStudents: (page?: number, limit?: number) => Promise<void>;
  getStudent: (id: string) => Promise<Student>;
  createStudent: (dto: CreateStudentDto) => Promise<Student>;
  updateStudent: (id: string, dto: UpdateStudentDto) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
  uploadAvatar: (id: string, file: File) => Promise<{ student: Student; validUrl: string }>;
}

export const useStudentsStore = create<StudentsState>((set) => ({
  students: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,

  fetchStudents: async (page = 1, limit = 10) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ students: [], total: 0, page, limit, loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await studentsApi.list(schoolId, { page, limit });
      set({ students: res.data, total: res.total, page: res.page, limit: res.limit, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getStudent: (id: string) => studentsApi.getById(resolveSchoolId(), id),

  createStudent: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await studentsApi.create(schoolId, dto);
    set((s) => ({ students: [created, ...s.students], total: s.total + 1 }));
    return created;
  },

  updateStudent: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await studentsApi.update(schoolId, id, dto);
    set((s) => ({
      students: s.students.map((stu) => (stu.id === id ? { ...stu, ...updated } : stu)),
    }));
    return updated;
  },

  deleteStudent: async (id) => {
    const schoolId = resolveSchoolId();
    await studentsApi.remove(schoolId, id);
    set((s) => ({
      students: s.students.filter((stu) => stu.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },

  uploadAvatar: async (id, file) => {
    const schoolId = resolveSchoolId();
    const { student, validUrl } = await studentsApi.uploadStudentAvatar(schoolId, id, file);
    set((s) => ({
      students: s.students.map((stu) => (stu.id === id ? { ...stu, ...student } : stu)),
    }));
    return { student, validUrl };
  },
}));

// ─── Demo / mock store (legacy) ──────────────────────────────────
// Backs the modules whose own backends haven't landed yet.

interface DemoStudentsState {
  students: DemoStudent[];
  loading: boolean;
  error: string | null;

  fetchStudents: () => Promise<void>;
  getStudent: (id: string) => Promise<DemoStudent>;
  searchStudents: (query: string) => Promise<DemoStudent[]>;
  createFromApplication: (dto: CreateStudentFromApplicationDto) => Promise<DemoStudent>;
  bulkPromote: (items: PromoteStudentDto[]) => Promise<DemoStudent[]>;
}

export const useDemoStudentsStore = create<DemoStudentsState>((set) => ({
  students: [],
  loading: false,
  error: null,

  fetchStudents: async () => {
    set({ loading: true, error: null });
    try {
      const data = await demoStudentsApi.getStudents();
      set({ students: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getStudent: (id: string) => demoStudentsApi.getStudent(id),

  searchStudents: (query: string) => demoStudentsApi.searchStudents(query),

  createFromApplication: async (dto) => {
    const created = await demoStudentsApi.createFromApplication(dto);
    set((state) => ({ students: [created, ...state.students] }));
    return created;
  },

  bulkPromote: async (items) => {
    const results = await demoStudentsApi.bulkPromote(items);
    const fresh = await demoStudentsApi.getStudents();
    set({ students: fresh });
    return results;
  },
}));
