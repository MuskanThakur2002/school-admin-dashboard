import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Bell, Settings, Building2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { usePermission } from '@/hooks/usePermission';
import { isSuperAdmin } from '@/types/auth.types';

interface BottomNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  permission?: string;
  superAdminOnly?: boolean;
}

const bottomNavItems: BottomNavItem[] = [
  { label: 'Tenants', path: '/tenants', icon: Building2, superAdminOnly: true },
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Students', path: '/students', icon: Users, permission: 'students.read' },
  { label: 'Admissions', path: '/admissions', icon: UserPlus, permission: 'admissions.read' },
  { label: 'Alerts', path: '/notifications', icon: Bell, permission: 'notifications.read' },
  { label: 'Settings', path: '/settings', icon: Settings, permission: 'settings.manage' },
];

function BottomNavLink({ item }: { item: BottomNavItem }) {
  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const hasPermission = usePermission(item.permission ?? 'dashboard.read');

  // Mirrors the desktop Sidebar gating so the mobile bar never shows
  // icons that just bounce to /tenants or a forbidden route.
  if (item.superAdminOnly) {
    if (!isSuperAdmin(user)) return null;
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
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-center justify-around h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map((item) => (
          <BottomNavLink key={item.path} item={item} />
        ))}
      </div>
    </nav>
  );
}
