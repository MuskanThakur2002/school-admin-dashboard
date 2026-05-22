import { create } from 'zustand';
import { parentsApi } from '@/services/modules/parents.api';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Parent,
  CreateParentDto,
  UpdateParentDto,
} from '@/types/parent.types';
import type { CreateUserDto, UpdateUserDto } from '@/types/user.types';

export interface CreateParentFlowDto {
  user: Omit<CreateUserDto, 'roleId'> & { roleId?: string };
  parent: Omit<CreateParentDto, 'userId'>;
}

export interface UpdateParentFlowDto {
  userId: string;
  user?: UpdateUserDto;
  parent?: UpdateParentDto;
}

interface ParentState {
  parents: Parent[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchParents: (page?: number, limit?: number) => Promise<void>;
  searchParents: (q: string) => Promise<Parent[]>;
  getParent: (id: string) => Promise<Parent>;
  createParent: (input: CreateParentFlowDto) => Promise<Parent>;
  updateParent: (id: string, input: UpdateParentFlowDto) => Promise<Parent>;
  deleteParent: (id: string) => Promise<void>;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

export const useParentStore = create<ParentState>((set) => ({
  parents: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,

  fetchParents: async (page = 1, limit = 10) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ parents: [], total: 0, page, limit, loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await parentsApi.list(schoolId, { page, limit });
      set({ parents: res.data, total: res.total, page: res.page, limit: res.limit, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  searchParents: async (q: string) => {
    const schoolId = resolveSchoolId();
    return parentsApi.search(schoolId, q);
  },

  getParent: async (id: string) => {
    const schoolId = resolveSchoolId();
    const parent = await parentsApi.getById(schoolId, id);
    if (parent.user || !parent.userId) return parent;
    const user = await usersApi.getById(schoolId, parent.userId);
    return {
      ...parent,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    };
  },

  createParent: async ({ user, parent }) => {
    const schoolId = resolveSchoolId();
    const role = await useSettingsStore.getState().ensureParentRole();
    const createdUser = await usersApi.create(schoolId, { ...user, roleId: role.id });
    const created = await parentsApi.create(schoolId, {
      userId: createdUser.id,
      annualIncome: parent.annualIncome,
      fatherName: parent.fatherName,
      motherName: parent.motherName,
    });
    const withUser: Parent = {
      ...created,
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        phoneNumber: createdUser.phoneNumber,
      },
    };
    set((s) => ({ parents: [withUser, ...s.parents], total: s.total + 1 }));
    return withUser;
  },

  updateParent: async (id, { userId, user: userDto, parent: parentDto }) => {
    const schoolId = resolveSchoolId();

    let updatedUser = userDto && Object.keys(userDto).length
      ? await usersApi.update(schoolId, userId, userDto)
      : null;

    const updatedParent = parentDto && Object.keys(parentDto).length
      ? await parentsApi.update(schoolId, id, parentDto)
      : await parentsApi.getById(schoolId, id);

    if (!updatedUser) {
      updatedUser = await usersApi.getById(schoolId, userId);
    }

    const merged: Parent = {
      ...updatedParent,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
      },
    };

    set((s) => ({
      parents: s.parents.map((p) => (p.id === id ? merged : p)),
    }));
    return merged;
  },

  deleteParent: async (id) => {
    const schoolId = resolveSchoolId();
    await parentsApi.remove(schoolId, id);
    set((s) => ({
      parents: s.parents.filter((p) => p.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
