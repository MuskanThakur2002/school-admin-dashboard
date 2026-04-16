import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Bell, Settings,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const bottomNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Students', path: '/students', icon: Users },
  { label: 'Admissions', path: '/admissions', icon: UserPlus },
  { label: 'Alerts', path: '/notifications', icon: Bell },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="flex items-center justify-around h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
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
        ))}
      </div>
    </nav>
  );
}
