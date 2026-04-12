import { create } from 'zustand';
import {
  studentsApi,
  type CreateStudentFromApplicationDto,
  type PromoteStudentDto,
} from '@/services/modules/students.api';
import type { Student } from '@/types/student.types';

interface StudentsState {
  students: Student[];
  loading: boolean;
  error: string | null;

  fetchStudents: () => Promise<void>;
  getStudent: (id: string) => Promise<Student>;
  searchStudents: (query: string) => Promise<Student[]>;
  createFromApplication: (dto: CreateStudentFromApplicationDto) => Promise<Student>;
  bulkPromote: (items: PromoteStudentDto[]) => Promise<Student[]>;
}

export const useStudentsStore = create<StudentsState>((set) => ({
  students: [],
  loading: false,
  error: null,

  fetchStudents: async () => {
    set({ loading: true, error: null });
    try {
      const data = await studentsApi.getStudents();
      set({ students: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getStudent: (id: string) => studentsApi.getStudent(id),

  searchStudents: (query: string) => studentsApi.searchStudents(query),

  createFromApplication: async (dto) => {
    const created = await studentsApi.createFromApplication(dto);
    set((state) => ({ students: [created, ...state.students] }));
    return created;
  },

  bulkPromote: async (items) => {
    const results = await studentsApi.bulkPromote(items);
    // Re-fetch to sync class/section/status changes
    const fresh = await studentsApi.getStudents();
    set({ students: fresh });
    return results;
  },
}));
