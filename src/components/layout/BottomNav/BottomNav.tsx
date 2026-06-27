import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Bell, Settings, Building2, LogOut, Award, Wallet, UserRound,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS, ROLES } from '@/constants/permissions';
import { isSuperAdmin } from '@/types/auth.types';

interface BottomNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  // Backend permission name(s). An array means "shown if the user has ANY".
  permission?: string | string[];
  superAdminOnly?: boolean;
  // Restrict to specific role name(s) instead of a permission (e.g. parent-only Results).
  roles?: string[];
  // Hide from specific role name(s) even if they hold the permission (parents use My Child).
  hideForRoles?: string[];
}

const bottomNavItems: BottomNavItem[] = [
  { label: 'Tenants', path: '/tenants', icon: Building2, superAdminOnly: true },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Child', path: '/my-child', icon: UserRound, roles: [ROLES.PARENT] },
  { label: 'Students', path: '/students', icon: Users, permission: PERMISSIONS.READ_STUDENT, hideForRoles: [ROLES.PARENT] },
  { label: 'Results', path: '/results', icon: Award, roles: [ROLES.PARENT] },
  { label: 'Fees', path: '/my-fees', icon: Wallet, roles: [ROLES.PARENT] },
  { label: 'Admissions', path: '/admissions', icon: UserPlus, permission: [PERMISSIONS.MANAGE_ENQUIRIES, PERMISSIONS.MANAGE_APPLICATIONS] },
  { label: 'Alerts', path: '/notifications', icon: Bell, permission: [PERMISSIONS.MANAGE_NOTIFICATIONS, PERMISSIONS.SEND_NOTIFICATIONS] },
  { label: 'Settings', path: '/settings', icon: Settings, permission: PERMISSIONS.READ_ROLE },
];

function BottomNavLink({ item }: { item: BottomNavItem }) {
  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const hasPermission = usePermission(item.permission ?? []);

  // Mirrors the desktop Sidebar gating so the mobile bar never shows
  // icons that just bounce to /tenants or a forbidden route.
  if (item.hideForRoles && user && item.hideForRoles.includes(user.roleName)) return null;

  if (item.superAdminOnly) {
    if (!isSuperAdmin(user)) return null;
  } else if (item.roles) {
    if (!user || !item.roles.includes(user.roleName)) return null;
  } else if (isSuperAdmin(user)) {
    // Super admins only see school-scoped links once they've drilled into a school.
    if (!activeSchoolId) return null;
  } else if (item.permission && !hasPermission) {
    return null;
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-colors',
          isActive
            ? 'text-[var(--brand-primary)]'
            : 'text-[var(--text-muted)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className="w-5 h-5"
            strokeWidth={isActive ? 2.2 : 1.6}
          />
          <span
            className={cn(
              'text-[0.625rem] leading-none tracking-wide',
              isActive && 'font-semibold',
            )}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function BottomNav() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-center justify-around h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map((item) => (
          <BottomNavLink key={item.path} item={item} />
        ))}
        {/* Sign out — an action, not a route, so it sits outside the nav-link
            list. Always shown: every authenticated user can log out. */}
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-colors text-[var(--text-muted)]"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.6} />
          <span className="text-[0.625rem] leading-none tracking-wide">Logout</span>
        </button>
      </div>
    </nav>
  );
}
