import { create } from 'zustand';
import { usersApi } from '@/services/modules/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user.types';

interface UserState {
  users: User[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchUsers: (page?: number, limit?: number) => Promise<void>;
  createUser: (input: CreateUserDto) => Promise<User>;
  updateUser: (id: string, input: UpdateUserDto) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
}

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  total: 0,
  page: 1,
  limit: 25,
  loading: false,
  error: null,

  fetchUsers: async (page = 1, limit = 25) => {
    const { user, activeSchoolId } = useAuthStore.getState();
    const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
    if (!schoolId) {
      set({ users: [], total: 0, page, limit, loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const res = await usersApi.list(schoolId, { page, limit });
      set({ users: res.data, total: res.total, page: res.page, limit: res.limit, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createUser: async (input) => {
    const schoolId = resolveSchoolId();
    const created = await usersApi.create(schoolId, input);
    set((s) => ({ users: [created, ...s.users], total: s.total + 1 }));
    return created;
  },

  updateUser: async (id, input) => {
    const schoolId = resolveSchoolId();
    const updated = await usersApi.update(schoolId, id, input);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? updated : u)) }));
    return updated;
  },

  deleteUser: async (id) => {
    const schoolId = resolveSchoolId();
    await usersApi.remove(schoolId, id);
    set((s) => ({
      users: s.users.filter((u) => u.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
