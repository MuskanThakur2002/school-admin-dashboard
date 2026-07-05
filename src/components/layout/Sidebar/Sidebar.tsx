import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, GraduationCap, Users, UserCog, HeartHandshake, Wallet, BookOpen,
  Receipt, Bell, Building2, Settings, ClipboardCheck, ClipboardList,
  NotebookPen, ChevronLeft, ChevronRight, Sparkles, ListChecks, UserCheck, Award, UserRound,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { useTenantStore } from '@/stores/tenant.store';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS, ROLES } from '@/constants/permissions';
import { isSuperAdmin } from '@/types/auth.types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  // Backend permission name(s). An array means "shown if the user has ANY".
  permission?: string | string[];
  superAdminOnly?: boolean;
  // Restrict to specific role name(s) instead of a permission. Used when a
  // screen is meant for one persona (e.g. parent-only Results), since a
  // permission alone can't express "Parent but not staff".
  roles?: string[];
  // Hide from specific role name(s) even if they hold the permission. Used to
  // keep parents out of the staff/admin pages (they get the My Child hub instead).
  hideForRoles?: string[];
  // If true, only highlights on exact path match (no prefix). Use for parent
  // entries that have more-specific sibling routes in the sidebar.
  end?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'My Child', path: '/my-child', icon: UserRound, roles: [ROLES.PARENT] },
  { label: 'Admissions', path: '/admissions', icon: UserPlus, permission: [PERMISSIONS.MANAGE_ENQUIRIES, PERMISSIONS.MANAGE_APPLICATIONS] },
  { label: 'Academic', path: '/academic', icon: GraduationCap, permission: [PERMISSIONS.MANAGE_CLASSES, PERMISSIONS.MANAGE_SUBJECTS, PERMISSIONS.MANAGE_TIMETABLE] },
  { label: 'Students', path: '/students', icon: Users, permission: PERMISSIONS.READ_STUDENT, hideForRoles: [ROLES.PARENT] },
  { label: 'Teachers', path: '/teachers', icon: UserCog, permission: PERMISSIONS.READ_TEACHER, hideForRoles: [ROLES.PARENT, ROLES.TEACHER] },
  { label: 'Student Attendance', path: '/attendance', icon: ClipboardCheck, permission: PERMISSIONS.READ_ATTENDANCE, hideForRoles: [ROLES.PARENT] },
  { label: 'Staff Attendance', path: '/teacher-attendance', icon: UserCheck, permission: PERMISSIONS.READ_TEACHER_ATTENDANCE },
  { label: 'Homework', path: '/homework', icon: NotebookPen, permission: PERMISSIONS.READ_HOMEWORK, hideForRoles: [ROLES.PARENT] },
  { label: 'Exams', path: '/assessments', icon: ListChecks, permission: PERMISSIONS.MANAGE_ASSESSMENTS },
  { label: 'Results', path: '/results', icon: Award, roles: [ROLES.PARENT] },
  { label: 'Fees', path: '/my-fees', icon: Wallet, roles: [ROLES.PARENT] },
  { label: 'Guardians', path: '/parents', icon: HeartHandshake, permission: PERMISSIONS.READ_PARENT, hideForRoles: [ROLES.TEACHER] },
  { label: 'Fee Engine', path: '/fees', icon: Wallet, permission: PERMISSIONS.MANAGE_FEE_STRUCTURES, end: true },
  { label: 'Fee Assignments', path: '/fees/assignments', icon: ClipboardList, permission: PERMISSIONS.MANAGE_FEE_ASSIGNMENTS },
  { label: 'Ledger', path: '/ledger', icon: BookOpen, permission: PERMISSIONS.MANAGE_LEDGER },
  // TODO: re-enable when Expenses API is ready
  // { label: 'Expenses', path: '/expenses', icon: CreditCard, permission: ... },
  { label: 'Receipts', path: '/receipts', icon: Receipt, permission: PERMISSIONS.COLLECT_FEES },
  { label: 'Notifications', path: '/notifications', icon: Bell, permission: [PERMISSIONS.MANAGE_NOTIFICATIONS, PERMISSIONS.SEND_NOTIFICATIONS] },
  // TODO: re-enable when Reports API is ready
  // { label: 'Reports', path: '/reports', icon: BarChart3, permission: ... },
  { label: 'Tenants', path: '/tenants', icon: Building2, superAdminOnly: true },
  { label: 'Settings', path: '/settings', icon: Settings, permission: PERMISSIONS.READ_ROLE },
];

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const hasPermission = usePermission(item.permission ?? []);

  // Hidden for this role regardless of permission (e.g. parents use My Child).
  if (item.hideForRoles && user && item.hideForRoles.includes(user.roleName)) return null;

  if (item.superAdminOnly) {
    if (!isSuperAdmin(user)) return null;
  } else if (item.roles) {
    // Role-restricted entry (e.g. parent-only Results) — show only to those roles.
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
      end={item.end ?? false}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
          collapsed && 'justify-center px-2',
          isActive ? 'sidebar-item-active' : 'sidebar-item',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--sidebar-text-active)' }} />
          )}
          <item.icon className="w-[18px] h-[18px] shrink-0 transition-colors" strokeWidth={isActive ? 2.2 : 1.8} />
          {!collapsed && <span className="text-[0.8125rem] tracking-wide truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);
  const activeSchoolId = useAuthStore((s) => s.activeSchoolId);
  const tenants = useTenantStore((s) => s.tenants);
  const activeSchool =
    isSuperAdmin(user) && activeSchoolId
      ? tenants.find((t) => t.id === activeSchoolId) ?? null
      : null;

  return (
    <>
      <style>{`
        .sidebar-item {
          color: var(--sidebar-text);
        }
        .sidebar-item:hover {
          background: var(--sidebar-item-hover);
          color: var(--text-primary);
        }
        .sidebar-item-active {
          background: var(--sidebar-item-active);
          color: var(--sidebar-text-active);
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 44, 152, 0.08);
        }
        .dark .sidebar-item-active {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
      `}</style>
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-30 flex-col transition-all duration-300 ease-out hidden md:flex',
          collapsed ? 'w-[72px]' : 'w-[250px]',
        )}
        style={{
          background: 'linear-gradient(to bottom, var(--sidebar-bg-from), var(--sidebar-bg-to))',
        }}
      >
        {/* Logo area */}
        <div className={cn('flex items-center gap-3 shrink-0 h-[68px]', collapsed ? 'px-4 justify-center' : 'px-5')}>
          <div className="w-10 h-10 rounded-[14px] gradient-hero flex items-center justify-center shadow-[0_2px_8px_rgba(0,44,152,0.3)]">
            <GraduationCap className="w-[22px] h-[22px] text-white" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-[1.1rem] tracking-[-0.02em] leading-none" style={{ color: 'var(--text-primary)' }}>
                AdminDesk
              </span>
              <span className="text-[0.625rem] font-medium tracking-[0.08em] uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
                School Management
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px mb-2" style={{ background: 'linear-gradient(to right, transparent, var(--border-default), transparent)' }} />

        {/* Active school banner (super admin viewing a specific school) */}
        {activeSchool && !collapsed && (
          <div
            className="mx-3 mb-2 px-3 py-2 rounded-lg"
            style={{ background: 'var(--brand-tint)' }}
          >
            <p
              className="text-[0.625rem] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--brand-primary)' }}
            >
              Viewing
            </p>
            <p
              className="text-[0.8125rem] font-bold truncate mt-0.5"
              style={{ color: 'var(--text-primary)' }}
            >
              {activeSchool.name}
            </p>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {navItems.map((item) => (
            <NavItemLink key={item.path} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Bottom section */}
        {!collapsed && (
          <div className="mx-3 mb-3 p-3 rounded-xl" style={{ background: 'var(--brand-tint)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-[0.6875rem] font-semibold" style={{ color: 'var(--brand-primary)' }}>Pro Features</span>
            </div>
            <p className="text-[0.6875rem] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Multi-tenant, analytics & more
            </p>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center mx-3 mb-3 py-2 rounded-xl transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-item-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}
