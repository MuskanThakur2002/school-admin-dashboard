import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';

/**
 * Gates routes that display school-scoped data (students, fees, admissions, etc.).
 * Super admins must have a school selected; school admins pass through unconditionally
 * since their JWT already scopes them.
 */
export function RequireActiveSchool() {
  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);

  if (isSuperAdmin(user) && !activeSchoolId) {
    return <Navigate to="/tenants" replace />;
  }

  return <Outlet />;
}
