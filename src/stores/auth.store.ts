import { create } from 'zustand';
import { authApi } from '@/services/modules/auth.api';
import { isSuperAdmin } from '@/types/auth.types';
import type { AuthState, User } from '@/types/auth.types';

const STORAGE_KEY = 'admindesk.auth';

interface PersistedAuth {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  activeSchoolId: string | null;
}

function loadPersisted(): PersistedAuth {
  if (typeof window === 'undefined') {
    return { user: null, token: null, refreshToken: null, activeSchoolId: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null, refreshToken: null, activeSchoolId: null };
    const parsed = JSON.parse(raw) as Partial<PersistedAuth>;
    return {
      user: parsed.user ?? null,
      token: parsed.token ?? null,
      refreshToken: parsed.refreshToken ?? null,
      activeSchoolId: parsed.activeSchoolId ?? null,
    };
  } catch {
    return { user: null, token: null, refreshToken: null, activeSchoolId: null };
  }
}

function persist(snapshot: PersistedAuth) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // storage full / disabled — ignore
  }
}

function clearPersisted() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const initial = loadPersisted();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  token: initial.token,
  refreshToken: initial.refreshToken,
  isAuthenticated: !!initial.token && !!initial.user,
  activeSchoolId: initial.activeSchoolId,

  login: async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { token, refreshToken, user } = await authApi.login({ email: normalizedEmail, password });
    const activeSchoolId = isSuperAdmin(user) ? null : user.schoolId;
    set({ user, token, refreshToken, isAuthenticated: true, activeSchoolId });
    persist({ user, token, refreshToken, activeSchoolId });
  },

  logout: () => {
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, activeSchoolId: null });
    clearPersisted();
  },

  setUser: (user: User) => {
    set({ user });
    const { token, refreshToken, activeSchoolId } = get();
    persist({ user, token, refreshToken, activeSchoolId });
  },

  setActiveSchool: (schoolId: string | null) => {
    set({ activeSchoolId: schoolId });
    const { user, token, refreshToken } = get();
    persist({ user, token, refreshToken, activeSchoolId: schoolId });
  },
}));
