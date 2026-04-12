import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';

const iconMap = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'text-status-present bg-status-present/10',
  error: 'text-status-absent bg-status-absent/10',
  info: 'text-primary bg-primary/10',
};

export function ToastProvider() {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return <ToastItem key={toast.id} id={toast.id} type={toast.type} title={toast.title} message={toast.message} Icon={Icon} dismiss={dismissToast} />;
      })}
    </div>
  );
}

function ToastItem({
  id,
  type,
  title,
  message,
  Icon,
  dismiss,
}: {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  Icon: React.ElementType;
  dismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <div
      className={cn(
        'glass rounded-xl shadow-dropdown p-4 flex items-start gap-3',
        'animate-in slide-in-from-right-full fade-in-0 duration-200',
      )}
    >
      <div className={cn('p-1 rounded-lg shrink-0', colorMap[type])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-title-sm text-on-surface">{title}</p>
        {message && <p className="text-body-sm text-on-surface-variant mt-0.5">{message}</p>}
      </div>
      <button onClick={() => dismiss(id)} className="text-on-surface-variant hover:text-on-surface shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
