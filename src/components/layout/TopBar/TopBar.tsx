import { Search, Bell, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useThemeStore } from '@/stores/theme.store';

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-20 h-[68px] flex items-center justify-between',
        'px-8 glass',
        'shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)]',
        'transition-all duration-300',
        collapsed ? 'left-0 md:left-[72px]' : 'left-0 md:left-[250px]',
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div
          className="flex items-center gap-2.5 w-full rounded-xl px-4 py-2.5 transition-all"
          style={{ background: 'var(--card-bg-subtle)' }}
        >
          <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} strokeWidth={2} />
          <input
            type="text"
            placeholder="Search students, fees, reports..."
            className="bg-transparent outline-none w-full text-[0.875rem] font-body"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd
            className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md text-[0.625rem] font-medium tracking-wider"
            style={{ background: 'var(--border-default)', color: 'var(--text-muted)' }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative p-2.5 rounded-xl transition-all group"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} />
          ) : (
            <Sun className="w-[18px] h-[18px]" strokeWidth={1.8} />
          )}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2.5 rounded-xl transition-all group"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2"
            style={{ background: 'var(--status-danger)', '--tw-ring-color': 'var(--card-bg)' } as React.CSSProperties}
          />
        </button>

        {/* Divider */}
        <div className="w-px h-8 mx-1" style={{ background: 'var(--border-default)' }} />

        {/* User profile */}
        <button
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all"
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div className="w-8 h-8 rounded-[10px] gradient-hero flex items-center justify-center shadow-[0_2px_6px_rgba(0,44,152,0.25)]">
            <span className="text-white font-display font-bold text-[0.75rem]">
              {user?.name?.charAt(0) ?? 'A'}
            </span>
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-[0.8125rem] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
            <p className="text-[0.6875rem] capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.role?.replace('_', ' ')}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 hidden lg:block" style={{ color: 'var(--text-ghost)' }} />
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2.5 rounded-xl transition-all"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--status-danger-bg)'; e.currentTarget.style.color = 'var(--status-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
