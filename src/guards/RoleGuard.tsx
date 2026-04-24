import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';

interface RoleGuardProps {
  /** Role names that may view this route. Matched against `user.roleName`. */
  roles?: string[];
  /** Shortcut for super-admin-only routes. */
  superAdminOnly?: boolean;
}

export function RoleGuard({ roles, superAdminOnly }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/dashboard" replace />;

  if (superAdminOnly && !isSuperAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (roles && !roles.includes(user.roleName)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
