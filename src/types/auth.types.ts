export const SUPER_ADMIN_ROLE = 'Super Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  schoolId: string | null;
  roleName: string;
  permissions: string[];
  avatar?: string;
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return !!user && user.roleName === SUPER_ADMIN_ROLE;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** The school a super admin is currently viewing. Null for school admins (JWT-scoped) or for super admins at the "all schools" level. */
  activeSchoolId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setActiveSchool: (schoolId: string | null) => void;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  token: string;
  refreshToken: string;
  user: User;
}
