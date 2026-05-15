import { create } from 'zustand';
import { teacherApi } from '@/services/modules/teacher.api';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Teacher,
  CreateTeacherDto,
  UpdateTeacherDto,
} from '@/types/teacher.types';
import type { CreateUserDto, UpdateUserDto } from '@/types/user.types';

export interface CreateTeacherFlowDto {
  user: Omit<CreateUserDto, 'roleId'> & { roleId?: string };
  teacher: Omit<CreateTeacherDto, 'userId'>;
}

export interface UpdateTeacherFlowDto {
  userId: string;
  user?: UpdateUserDto;
  teacher?: UpdateTeacherDto;
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
  updateTeacher: (id: string, input: UpdateTeacherFlowDto) => Promise<Teacher>;
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

  getTeacher: async (id: string) => {
    const schoolId = resolveSchoolId();
    const teacher = await teacherApi.getById(schoolId, id);
    if (teacher.user || !teacher.userId) return teacher;
    const user = await usersApi.getById(schoolId, teacher.userId);
    return {
      ...teacher,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  },

  createTeacher: async ({ user, teacher }) => {
    const schoolId = resolveSchoolId();
    const role = await useSettingsStore.getState().ensureTeacherRole();
    const createdUser = await usersApi.create(schoolId, { ...user, roleId: role.id });
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

  updateTeacher: async (id, { userId, user: userDto, teacher: teacherDto }) => {
    const schoolId = resolveSchoolId();

    let updatedUser = userDto && Object.keys(userDto).length
      ? await usersApi.update(schoolId, userId, userDto)
      : null;

    const updatedTeacher = teacherDto && Object.keys(teacherDto).length
      ? await teacherApi.update(schoolId, id, teacherDto)
      : await teacherApi.getById(schoolId, id);

    if (!updatedUser) {
      updatedUser = await usersApi.getById(schoolId, userId);
    }

    const merged: Teacher = {
      ...updatedTeacher,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
      },
    };

    set((s) => ({
      teachers: s.teachers.map((t) => (t.id === id ? merged : t)),
    }));
    return merged;
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
