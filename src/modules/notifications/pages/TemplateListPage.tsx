import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, MessageSquare, Mail, Smartphone } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useNotificationsStore, type NotificationTemplate } from '@/stores/notifications.store';

const channelConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  sms: { icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600', label: 'SMS' },
  email: { icon: Mail, color: 'bg-blue-50 text-blue-600', label: 'Email' },
  push: { icon: Smartphone, color: 'bg-violet-50 text-violet-600', label: 'Push' },
};

const channelOptions = [{ label: 'SMS', value: 'sms' }, { label: 'Email', value: 'email' }, { label: 'Push Notification', value: 'push' }];

export default function TemplateListPage() {
  const templates = useNotificationsStore((s) => s.templates);
  const fetchTemplates = useNotificationsStore((s) => s.fetchTemplates);
  const createTemplate = useNotificationsStore((s) => s.createTemplate);
  const deleteTemplate = useNotificationsStore((s) => s.deleteTemplate);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState('sms');
  const [formBody, setFormBody] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => { if (templates.length === 0) fetchTemplates(); }, [templates.length, fetchTemplates]);

  const filtered = templates.filter((t) => !channelFilter || t.channel === channelFilter);

  const handleAdd = () => {
    if (!formName || !formBody) return;
    createTemplate({ name: formName, channel: formChannel as NotificationTemplate['channel'], body: formBody, variables: formBody.match(/\{\{(\w+)\}\}/g)?.map((v) => v.replace(/\{|\}/g, '')) || [] });
    showToast({ type: 'success', title: 'Template created', message: formName }); setModalOpen(false); setFormName(''); setFormBody('');
  };
  const handleDelete = (t: NotificationTemplate) => { deleteTemplate(t.id); showToast({ type: 'info', title: 'Template removed', message: t.name }); };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Notification Templates</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage SMS, email, and push notification templates</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>

      {/* Channel filter */}
      <div className="flex gap-1.5 mb-6">
        {['', 'sms', 'email', 'push'].map((c) => (
          <button key={c} onClick={() => setChannelFilter(c)} className={cn('px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all uppercase', channelFilter === c ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
            {c === '' ? 'All' : c}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((template) => {
          const ch = channelConfig[template.channel];
          return (
            <div key={template.id} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all relative group">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(template)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', ch.color)}><ch.icon className="w-4 h-4" strokeWidth={2} /></div>
                <div>
                  <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)]">{template.name}</h3>
                  <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[0.625rem] font-bold mt-0.5', ch.color)}>{ch.label}</span>
                </div>
              </div>

              <p className="text-[0.75rem] text-[var(--text-tertiary)] leading-relaxed bg-[var(--card-bg-hover)] rounded-lg px-3 py-2 mb-3 line-clamp-2">{template.body}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {template.variables.slice(0, 3).map((v) => (
                    <span key={v} className="px-1.5 py-0.5 rounded bg-[var(--border-subtle)] text-[0.5625rem] font-semibold text-[var(--text-muted)] font-mono">{`{{${v}}}`}</span>
                  ))}
                  {template.variables.length > 3 && <span className="text-[0.625rem] text-[var(--text-ghost)]">+{template.variables.length - 3}</span>}
                </div>
                {template.lastUsed && <span className="text-[0.625rem] text-[var(--text-ghost)]">Used {template.lastUsed}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Create Template" description="Define a notification template with variables"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Create Template</Button></>}>
        <div className="space-y-4">
          <Input label="Template Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Fee Due Reminder" />
          <Select label="Channel" options={channelOptions} value={formChannel} onChange={(e) => setFormChannel(e.target.value)} />
          <div>
            <label className="block text-[0.8125rem] text-[var(--text-secondary)] font-medium mb-1.5">Message Body</label>
            <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} rows={4} placeholder="Use {{variable_name}} for dynamic content"
              className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-3 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
