import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import { TopBar } from '@/components/layout/TopBar/TopBar';
import { BottomNav } from '@/components/layout/BottomNav/BottomNav';
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
          collapsed ? 'pl-0 md:pl-[72px]' : 'pl-0 md:pl-[250px]',
          'pb-20 md:pb-0',
        )}
      >
        <div className="p-4 md:p-8 max-w-[1440px]">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <ToastProvider />
    </div>
  );
}
