import { create } from 'zustand';
import { parentsApi } from '@/services/modules/parents.api';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  Parent,
  CreateParentDto,
  UpdateParentDto,
} from '@/types/parent.types';
import type { CreateUserDto } from '@/types/user.types';

export interface CreateParentFlowDto {
  user: CreateUserDto;
  parent: Omit<CreateParentDto, 'userId'>;
}

interface ParentState {
  parents: Parent[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchParents: (page?: number, limit?: number) => Promise<void>;
  getParent: (id: string) => Promise<Parent>;
  createParent: (input: CreateParentFlowDto) => Promise<Parent>;
  updateParent: (id: string, dto: UpdateParentDto) => Promise<Parent>;
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

  getParent: (id: string) => parentsApi.getById(resolveSchoolId(), id),

  createParent: async ({ user, parent }) => {
    const schoolId = resolveSchoolId();
    const createdUser = await usersApi.create(schoolId, user);
    const created = await parentsApi.create(schoolId, {
      userId: createdUser.id,
      annualIncome: parent.annualIncome,
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

  updateParent: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await parentsApi.update(schoolId, id, dto);
    set((s) => ({
      parents: s.parents.map((p) => (p.id === id ? { ...p, ...updated, user: p.user ?? updated.user } : p)),
    }));
    return updated;
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
