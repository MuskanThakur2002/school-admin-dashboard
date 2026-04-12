import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { TopBar } from '@/components/layout/TopBar/TopBar';
import { ToastProvider } from '@/components/ui/Toast/ToastProvider';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/utils/cn';

export function AppShell() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--app-bg)' }}>
      <Sidebar />
      <TopBar />
      <main
        className={cn(
          'pt-[68px] min-h-dvh transition-all duration-300',
          collapsed ? 'pl-[72px]' : 'pl-[250px]',
        )}
      >
        <div className="p-8 max-w-[1440px]">
          <Outlet />
        </div>
      </main>
      <ToastProvider />
    </div>
  );
}
