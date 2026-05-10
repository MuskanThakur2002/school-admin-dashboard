import { create } from 'zustand';
import { teacherApi } from '@/services/modules/teacher.api';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Teacher,
  CreateTeacherDto,
  UpdateTeacherDto,
} from '@/types/teacher.types';
import type { CreateUserDto } from '@/types/user.types';

export interface CreateTeacherFlowDto {
  user: CreateUserDto;
  teacher: Omit<CreateTeacherDto, 'userId'>;
}

interface TeacherState {
  teachers: Teacher[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchTeachers: (page?: number, limit?: number) => Promise<void>;
  getTeacher: (id: string) => Promise<Teacher>;
  createTeacher: (input: CreateTeacherFlowDto) => Promise<Teacher>;
  updateTeacher: (id: string, dto: UpdateTeacherDto) => Promise<Teacher>;
  deleteTeacher: (id: string) => Promise<void>;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

export const useTeacherStore = create<TeacherState>((set) => ({
  teachers: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,

  fetchTeachers: async (page = 1, limit = 10) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ teachers: [], total: 0, page, limit, loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await teacherApi.list(schoolId, { page, limit });
      set({ teachers: res.data, total: res.total, page: res.page, limit: res.limit, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getTeacher: (id: string) => teacherApi.getById(resolveSchoolId(), id),

  createTeacher: async ({ user, teacher }) => {
    const schoolId = resolveSchoolId();
    const createdUser = await usersApi.create(schoolId, user);
    const created = await teacherApi.create(schoolId, {
      userId: createdUser.id,
      employeeId: teacher.employeeId,
      hireDate: teacher.hireDate,
    });
    const withUser: Teacher = {
      ...created,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        phoneNumber: createdUser.phoneNumber,
      },
    };
    set((s) => ({ teachers: [withUser, ...s.teachers], total: s.total + 1 }));
    return withUser;
  },

  updateTeacher: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await teacherApi.update(schoolId, id, dto);
    set((s) => ({
      teachers: s.teachers.map((t) => (t.id === id ? { ...t, ...updated, user: t.user ?? updated.user } : t)),
    }));
    return updated;
  },

  deleteTeacher: async (id) => {
    const schoolId = resolveSchoolId();
    await teacherApi.remove(schoolId, id);
    set((s) => ({
      teachers: s.teachers.filter((t) => t.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
