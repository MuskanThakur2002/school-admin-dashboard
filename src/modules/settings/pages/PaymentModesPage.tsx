import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { PaymentMode } from '@/stores/settings.store';

export default function PaymentModesPage() {
  const modes = useSettingsStore((s) => s.paymentModes);
  const fetchPaymentModes = useSettingsStore((s) => s.fetchPaymentModes);
  const addPaymentMode = useSettingsStore((s) => s.addPaymentMode);
  const togglePaymentMode = useSettingsStore((s) => s.togglePaymentMode);
  const deletePaymentMode = useSettingsStore((s) => s.deletePaymentMode);

  useEffect(() => { if (modes.length === 0) fetchPaymentModes(); }, [modes.length, fetchPaymentModes]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  const handleAdd = () => {
    if (!formName || !formCode) return;
    addPaymentMode({ name: formName, code: formCode.toUpperCase(), enabled: true, requiresReference: false });
    showToast({ type: 'success', title: 'Payment mode added', message: formName }); setModalOpen(false); setFormName(''); setFormCode('');
  };
  const handleDelete = (m: PaymentMode) => { deletePaymentMode(m.id); showToast({ type: 'info', title: 'Payment mode removed', message: m.name }); };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Payment Modes</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Configure accepted payment methods for fee collection</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Mode
        </button>
      </div>

      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[2.5fr_1fr_1fr_0.8fr_0.5fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Payment Mode', 'Code', 'Reference', 'Status', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>
        {modes.map((mode, idx) => (
          <div key={mode.id} className={cn('grid grid-cols-[2.5fr_1fr_1fr_0.8fr_0.5fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
            idx < modes.length - 1 && 'border-b border-[var(--border-subtle)]', !mode.enabled && 'opacity-40')}>
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-[var(--text-muted)]" strokeWidth={1.8} />
              <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{mode.name}</span>
            </div>
            <span className="font-display text-[0.75rem] font-bold text-[var(--text-tertiary)] tracking-wide">{mode.code}</span>
            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold w-fit',
              mode.requiresReference ? 'bg-blue-50 text-blue-700' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]')}>
              {mode.requiresReference ? 'Required' : 'Optional'}
            </span>
            <button onClick={() => togglePaymentMode(mode.id)}>
              {mode.enabled ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-[var(--text-ghost)]" />}
            </button>
            <button onClick={() => handleDelete(mode)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Payment Mode"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Add Mode</Button></>}>
        <div className="space-y-4">
          <Input label="Mode Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Wallet Pay" />
          <Input label="Short Code" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. WALLET" />
        </div>
      </Modal>
    </div>
  );
}
