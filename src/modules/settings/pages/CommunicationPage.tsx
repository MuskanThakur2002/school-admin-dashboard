import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Smartphone, ToggleLeft, ToggleRight, Save, Shield } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';

interface ChannelUIConfig {
  icon: React.ElementType;
  color: string;
}

const channelUIMap: Record<string, ChannelUIConfig> = {
  SMS: { icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600' },
  Email: { icon: Mail, color: 'bg-blue-50 text-blue-600' },
  'Push Notifications': { icon: Smartphone, color: 'bg-violet-50 text-violet-600' },
  WhatsApp: { icon: MessageSquare, color: 'bg-green-50 text-green-600' },
};

export default function CommunicationPage() {
  const channels = useSettingsStore((s) => s.channels);
  const fetchChannels = useSettingsStore((s) => s.fetchChannels);
  const toggleChannel = useSettingsStore((s) => s.toggleChannel);

  useEffect(() => { if (channels.length === 0) fetchChannels(); }, [channels.length, fetchChannels]);

  const [expandedId, setExpandedId] = useState<string | null>(channels.length > 0 ? channels[0].id : null);
  const showToast = useUIStore((s) => s.showToast);

  // Set default expanded when channels load
  useEffect(() => { if (channels.length > 0 && expandedId === null) setExpandedId(channels[0].id); }, [channels, expandedId]);

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Communication Settings</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Configure SMS, email, push, and WhatsApp channels</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50/50 rounded-2xl p-5 mb-8 flex items-start gap-4">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Shield className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] mb-0.5">Channel credentials</h3>
          <p className="text-[0.8125rem] text-[var(--text-tertiary)] leading-relaxed">
            API keys and credentials are stored securely. Masked values indicate configured secrets.
            Contact your provider to obtain new keys if needed.
          </p>
        </div>
      </div>

      {/* Channel cards */}
      <div className="space-y-3">
        {channels.map((ch) => {
          const isExpanded = expandedId === ch.id;
          const ui = channelUIMap[ch.channel] || { icon: MessageSquare, color: 'bg-slate-50 text-slate-600' };
          const Icon = ui.icon;
          return (
            <div key={ch.id} className={cn('bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all overflow-hidden', !ch.enabled && 'opacity-50')}>
              {/* Header */}
              <div className="flex items-center gap-5 px-6 py-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ch.id)}>
                <button onClick={(e) => { e.stopPropagation(); toggleChannel(ch.id); }} className="shrink-0">
                  {ch.enabled ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-[var(--text-ghost)]" />}
                </button>

                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', ui.color)}>
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{ch.channel}</h3>
                    <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.625rem] font-bold',
                      ch.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500')}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', ch.enabled ? 'bg-emerald-500' : 'bg-slate-400')} />
                      {ch.enabled ? 'Active' : 'Disabled'}
                    </div>
                  </div>
                  <p className="text-[0.75rem] text-[var(--text-muted)] mt-0.5">Provider: <span className="font-semibold text-[var(--text-secondary)]">{ch.provider}</span></p>
                </div>

                <svg className={cn('w-4 h-4 text-[var(--text-muted)] transition-transform', isExpanded && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
              </div>

              {/* Expanded settings */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-0">
                  <div className="bg-[var(--card-bg-hover)] rounded-xl p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ch.settings.map((s) => (
                        <div key={s.label}>
                          <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">{s.label}</p>
                          <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] font-mono">
                            {s.value || <span className="text-[var(--text-ghost)] font-sans font-normal italic">Not configured</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => showToast({ type: 'info', title: 'Coming soon', message: `${ch.channel} settings editor will be available in the next update` })}
                      className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--card-bg)] transition-all">
                      <Save className="w-3.5 h-3.5" strokeWidth={2} /> Edit Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
