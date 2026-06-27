import { SUPER_ADMIN_ROLE } from '@/types/auth.types';
import type { LoginResponseData, User } from '@/types/auth.types';
import { PERMISSIONS } from '@/constants/permissions';

interface MockAccount {
  password: string;
  user: User;
}

// Backend permission vocabulary — keep mock logins consistent with what the
// real API returns (see src/constants/permissions.ts).
const allPermissions: string[] = Object.values(PERMISSIONS);

const schoolAdminPermissions = allPermissions.filter(
  (p) => !['CREATE_SCHOOL', 'UPDATE_SCHOOL', 'DELETE_SCHOOL'].includes(p),
);

const mockAccounts: Record<string, MockAccount> = {
  'super@admin.com': {
    password: 'admin123',
    user: {
      id: 'user-super-1',
      name: 'Platform Admin',
      email: 'super@admin.com',
      schoolId: null,
      roleName: SUPER_ADMIN_ROLE,
      permissions: allPermissions,
    },
  },
  'admin@school.com': {
    password: 'admin123',
    user: {
      id: 'user-admin-1',
      name: 'Ananya Sharma',
      email: 'admin@school.com',
      schoolId: 'school-1',
      roleName: 'School Admin',
      permissions: schoolAdminPermissions,
    },
  },
};

export function mockLogin(email: string, password: string): LoginResponseData | null {
  const acc = mockAccounts[email.toLowerCase()];
  if (!acc || acc.password !== password) return null;
  return {
    token: `mock-token-${acc.user.id}`,
    refreshToken: `mock-refresh-${acc.user.id}`,
    user: acc.user,
  };
}
