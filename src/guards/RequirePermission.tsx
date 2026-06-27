import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';

interface RequirePermissionProps {
  /**
   * Backend permission name(s) required to view the wrapped routes. An array
   * means the user needs ANY one of them. Mirrors the sidebar's gating so a
   * hidden tab can't be reached by typing the URL.
   */
  permission: string | string[];
  /**
   * Role name(s) blocked from the route even if they hold the permission.
   * Used to keep parents off the staff/admin pages (they have READ_* for the
   * scoped data, but their experience lives in the My Child hub instead).
   */
  blockRoles?: string[];
}

export function RequirePermission({ permission, blockRoles }: RequirePermissionProps) {
  const user = useAuthStore((s) => s.user);

  // Super admins hold every permission; let them through.
  if (isSuperAdmin(user)) return <Outlet />;

  // Role explicitly blocked from this admin page (e.g. parents).
  if (blockRoles && user && blockRoles.includes(user.roleName)) {
    return <Navigate to="/dashboard" replace />;
  }

  const required = Array.isArray(permission) ? permission : [permission];
  const granted = user?.permissions ?? [];
  const allowed = required.some((p) => granted.includes(p));

  if (!allowed) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
