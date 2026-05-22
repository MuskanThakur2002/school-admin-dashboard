import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Send, MessageSquare, Mail, Smartphone, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import type { NotificationTemplate } from '@/types/notification.types';
import { SendNotificationModal } from '@/modules/notifications/components/SendNotificationModal';

const channelConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  sms: { icon: MessageSquare, color: 'bg-emerald-50 text-emerald-600', label: 'SMS' },
  email: { icon: Mail, color: 'bg-blue-50 text-blue-600', label: 'Email' },
  push: { icon: Smartphone, color: 'bg-violet-50 text-violet-600', label: 'Push' },
};

const fallbackChannel = { icon: MessageSquare, color: 'bg-slate-50 text-slate-600', label: 'Other' };

const channelOptions = [
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
  { label: 'Push Notification', value: 'push' },
];

const extractVariables = (body: string): string[] =>
  body.match(/\{\{(\w+)\}\}/g)?.map((v) => v.replace(/\{|\}/g, '')) || [];

export default function TemplateListPage() {
  const templates = useNotificationsStore((s) => s.templates);
  const total = useNotificationsStore((s) => s.templatesTotal);
  const page = useNotificationsStore((s) => s.templatesPage);
  const limit = useNotificationsStore((s) => s.templatesLimit);
  const loading = useNotificationsStore((s) => s.templatesLoading);
  const error = useNotificationsStore((s) => s.templatesError);
  const fetchTemplates = useNotificationsStore((s) => s.fetchTemplates);
  const createTemplate = useNotificationsStore((s) => s.createTemplate);
  const updateTemplate = useNotificationsStore((s) => s.updateTemplate);
  const deleteTemplate = useNotificationsStore((s) => s.deleteTemplate);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [sendTemplate, setSendTemplate] = useState<NotificationTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formChannel, setFormChannel] = useState('sms');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formTriggerEvent, setFormTriggerEvent] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    fetchTemplates(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTemplates]);

  const filtered = useMemo(
    () => templates.filter((t) => !channelFilter || t.channel === channelFilter),
    [templates, channelFilter],
  );

  const pageCount = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < pageCount;

  const resetForm = () => {
    setFormName('');
    setFormChannel('sms');
    setFormSubject('');
    setFormBody('');
    setFormTriggerEvent('');
    setEditing(null);
  };

  const openEditModal = (t: NotificationTemplate) => {
    setEditing(t);
    setFormName(t.name);
    setFormChannel(t.channel);
    setFormSubject(t.subject ?? '');
    setFormBody(t.body);
    setFormTriggerEvent(t.triggerEvent ?? '');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formBody.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        channel: formChannel,
        body: formBody,
        // Always send subject + triggerEvent on edit so clearing the field
        // propagates; on create, omit empties so they default server-side.
        ...(editing
          ? { subject: formSubject.trim() || undefined, triggerEvent: formTriggerEvent.trim() || undefined }
          : {
              ...(formSubject.trim() ? { subject: formSubject.trim() } : {}),
              ...(formTriggerEvent.trim() ? { triggerEvent: formTriggerEvent.trim() } : {}),
            }),
      };
      if (editing) {
        await updateTemplate(editing.id, payload);
        showToast({ type: 'success', title: 'Template updated', message: payload.name });
      } else {
        await createTemplate(payload);
        showToast({ type: 'success', title: 'Template created', message: payload.name });
      }
      setModalOpen(false);
      resetForm();
    } catch (err) {
      showToast({
        type: 'error',
        title: editing ? 'Failed to update template' : 'Failed to create template',
        message: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (t: NotificationTemplate) => {
    try {
      await deleteTemplate(t.id);
      showToast({ type: 'info', title: 'Template removed', message: t.name });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed to delete template', message: (err as Error).message });
    }
  };

  const goToPage = (next: number) => {
    if (next < 1 || next > pageCount || next === page) return;
    fetchTemplates(next, limit);
  };

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

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-[0.8125rem]">
          {error}
        </div>
      )}

      {/* Cards */}
      {loading && templates.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl p-10 text-center text-[var(--text-muted)] text-[0.875rem] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          No templates yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((template) => {
            const ch = channelConfig[template.channel] ?? fallbackChannel;
            const variables = extractVariables(template.body);
            return (
              <div key={template.id} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all relative group">
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setSendTemplate(template)} className="p-1.5 rounded-lg hover:bg-[#002c98]/10 text-[var(--text-muted)] hover:text-[#002c98]" title="Send to recipients">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEditModal(template)} className="p-1.5 rounded-lg hover:bg-[#002c98]/10 text-[var(--text-muted)] hover:text-[#002c98]" title="Edit template">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(template)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-muted)] hover:text-red-500" title="Delete template">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', ch.color)}>
                    <ch.icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)]">{template.name}</h3>
                    <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[0.625rem] font-bold mt-0.5', ch.color)}>{ch.label}</span>
                  </div>
                </div>

                {template.subject && (
                  <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    Subject: <span className="text-[var(--text-secondary)] normal-case font-medium">{template.subject}</span>
                  </p>
                )}

                <p className="text-[0.75rem] text-[var(--text-tertiary)] leading-relaxed bg-[var(--card-bg-hover)] rounded-lg px-3 py-2 mb-3 line-clamp-2">{template.body}</p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {variables.slice(0, 3).map((v) => (
                      <span key={v} className="px-1.5 py-0.5 rounded bg-[var(--border-subtle)] text-[0.5625rem] font-semibold text-[var(--text-muted)] font-mono">{`{{${v}}}`}</span>
                    ))}
                    {variables.length > 3 && <span className="text-[0.625rem] text-[var(--text-ghost)]">+{variables.length - 3}</span>}
                  </div>
                  {template.triggerEvent && <span className="text-[0.625rem] text-[var(--text-ghost)]">on {template.triggerEvent}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-[0.75rem] text-[var(--text-muted)]">
            Page {page} of {pageCount} · {total} total
          </p>
          <div className="flex items-center gap-0.5">
            {[
              { onClick: () => goToPage(1), disabled: !canPrev, icon: ChevronsLeft },
              { onClick: () => goToPage(page - 1), disabled: !canPrev, icon: ChevronLeft },
              { onClick: () => goToPage(page + 1), disabled: !canNext, icon: ChevronRight },
              { onClick: () => goToPage(pageCount), disabled: !canNext, icon: ChevronsRight },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                disabled={btn.disabled}
                className="p-1.5 rounded-lg hover:bg-[var(--border-subtle)] disabled:opacity-20 text-[var(--text-tertiary)] transition-all"
              >
                <btn.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) resetForm(); }}
        title={editing ? 'Edit Template' : 'Create Template'}
        description={editing ? 'Update name, channel, body, or trigger event.' : 'Define a notification template with variables'}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !formName.trim() || !formBody.trim()}>
              {submitting
                ? (editing ? 'Saving…' : 'Creating…')
                : (editing ? 'Save Changes' : 'Create Template')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Template Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Fee Due Reminder" />
          <Select label="Channel" options={channelOptions} value={formChannel} onChange={(e) => setFormChannel(e.target.value)} />
          {formChannel === 'email' && (
            <Input label="Subject" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="e.g. Admission Confirmed" />
          )}
          <Input label="Trigger Event (optional)" value={formTriggerEvent} onChange={(e) => setFormTriggerEvent(e.target.value)} placeholder="e.g. fee_due, payment_received" />
          <div>
            <label className="block text-[0.8125rem] text-[var(--text-secondary)] font-medium mb-1.5">Message Body</label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={4}
              placeholder="Use {{variable_name}} for dynamic content"
              className="w-full bg-[var(--card-bg-hover)] rounded-xl px-4 py-3 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow resize-none"
            />
          </div>
        </div>
      </Modal>

      <SendNotificationModal
        template={sendTemplate}
        open={sendTemplate !== null}
        onOpenChange={(o) => { if (!o) setSendTemplate(null); }}
      />
    </div>
  );
}
