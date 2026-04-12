import { useEffect } from 'react';
import { Zap, ToggleLeft, ToggleRight, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNotificationsStore } from '@/stores/notifications.store';

const channelIcon: Record<string, React.ElementType> = { sms: MessageSquare, email: Mail, push: Smartphone };

export default function TriggerConfigPage() {
  const triggers = useNotificationsStore((s) => s.triggers);
  const fetchTriggers = useNotificationsStore((s) => s.fetchTriggers);
  const toggleTrigger = useNotificationsStore((s) => s.toggleTrigger);

  useEffect(() => { if (triggers.length === 0) fetchTriggers(); }, [triggers.length, fetchTriggers]);

  const toggle = (id: string) => toggleTrigger(id);

  return (
    <div className="max-w-[1280px]">
      <div className="mb-8">
        <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Notification Triggers</h1>
        <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Configure event-based notification rules</p>
      </div>

      <div className="space-y-3">
        {triggers.map((trigger) => (
          <div key={trigger.id} className={cn('bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all', !trigger.enabled && 'opacity-40')}>
            <div className="flex items-center gap-5">
              <button onClick={() => toggle(trigger.id)} className="shrink-0">
                {trigger.enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-[var(--text-ghost)]" />}
              </button>

              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-600" strokeWidth={2} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{trigger.event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                  <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold',
                    trigger.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', trigger.enabled ? 'bg-emerald-500' : 'bg-slate-400')} />
                    {trigger.enabled ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <p className="text-[0.8125rem] text-[var(--text-tertiary)]">{trigger.description}</p>
                <p className="text-[0.6875rem] text-[var(--text-muted)] mt-1">Template: <span className="font-semibold text-[var(--text-secondary)]">{trigger.template}</span></p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {trigger.channels.map((ch) => {
                  const Icon = channelIcon[ch];
                  return (
                    <div key={ch} className="w-8 h-8 rounded-lg bg-[var(--border-subtle)] flex items-center justify-center" title={ch.toUpperCase()}>
                      <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" strokeWidth={2} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
