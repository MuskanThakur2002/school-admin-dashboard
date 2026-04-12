import { create } from 'zustand';
import type { AuthState, User } from '@/types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (_email: string, _password: string) => {
    // TODO: Replace with real API call
    const mockUser: User = {
      id: '1',
      name: 'Admin User',
      email: _email,
      role: 'school_admin',
      permissions: [
        'dashboard.read',
        'admissions.read', 'admissions.write',
        'academic.read', 'academic.write',
        'students.read', 'students.write',
        'fees.read', 'fees.write',
        'ledger.read', 'ledger.write',
        'expenses.read', 'expenses.write',
        'receipts.read', 'receipts.write',
        'notifications.read', 'notifications.write',
        'reports.read',
        'settings.manage',
      ],
      tenantId: 'tenant_1',
    };

    set({
      user: mockUser,
      token: 'mock-jwt-token',
      isAuthenticated: true,
    });
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setUser: (user: User) => set({ user }),
}));
