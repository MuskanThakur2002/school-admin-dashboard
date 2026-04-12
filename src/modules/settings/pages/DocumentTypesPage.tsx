import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { DocType } from '@/stores/settings.store';

export default function DocumentTypesPage() {
  const types = useSettingsStore((s) => s.docTypes);
  const fetchDocTypes = useSettingsStore((s) => s.fetchDocTypes);
  const addDocType = useSettingsStore((s) => s.addDocType);
  const deleteDocType = useSettingsStore((s) => s.deleteDocType);

  useEffect(() => { if (types.length === 0) fetchDocTypes(); }, [types.length, fetchDocTypes]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRequired, setFormRequired] = useState(false);
  const showToast = useUIStore((s) => s.showToast);

  const handleAdd = () => {
    if (!formName) return;
    addDocType({ name: formName, required: formRequired, maxSizeMB: 5, allowedFormats: ['pdf', 'jpg', 'png'] });
    showToast({ type: 'success', title: 'Document type added', message: formName }); setModalOpen(false); setFormName(''); setFormRequired(false);
  };
  const handleDelete = (dt: DocType) => { deleteDocType(dt.id); showToast({ type: 'info', title: 'Document type removed', message: dt.name }); };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Document Types</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage required student documents for admission</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1fr_0.8fr_2fr_0.5fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Document', 'Required', 'Max Size', 'Formats', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>
        {types.map((dt, idx) => (
          <div key={dt.id} className={cn('grid grid-cols-[2.5fr_1fr_0.8fr_2fr_0.5fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
            idx < types.length - 1 && 'border-b border-[var(--border-subtle)]')}>
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.8} />
              <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{dt.name}</span>
            </div>
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold w-fit',
              dt.required ? 'bg-red-50 text-red-600' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]')}>
              {dt.required ? 'Required' : 'Optional'}
            </span>
            <span className="text-[0.8125rem] text-[var(--text-tertiary)]">{dt.maxSizeMB} MB</span>
            <div className="flex flex-wrap gap-1">
              {dt.allowedFormats.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-md bg-[var(--border-subtle)] text-[0.625rem] font-semibold text-[var(--text-tertiary)] uppercase">{f}</span>
              ))}
            </div>
            <button onClick={() => handleDelete(dt)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Document Type"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Add Type</Button></>}>
        <div className="space-y-4">
          <Input label="Document Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Migration Certificate" />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formRequired} onChange={(e) => setFormRequired(e.target.checked)} className="w-4 h-4 rounded accent-[#002c98]" />
            <span className="text-[0.8125rem] text-[var(--text-secondary)]">Mark as required for admission</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
