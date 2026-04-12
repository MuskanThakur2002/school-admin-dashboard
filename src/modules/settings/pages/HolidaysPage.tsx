import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { Holiday } from '@/stores/settings.store';

const typeOptions = [{ label: 'National Holiday', value: 'national' }, { label: 'Regional Holiday', value: 'regional' }, { label: 'School Holiday', value: 'school' }];
const typeBadge: Record<string, { bg: string; text: string }> = { national: { bg: 'bg-blue-50', text: 'text-blue-700' }, regional: { bg: 'bg-emerald-50', text: 'text-emerald-700' }, school: { bg: 'bg-amber-50', text: 'text-amber-700' } };

export default function HolidaysPage() {
  const holidays = useSettingsStore((s) => s.holidays);
  const fetchHolidays = useSettingsStore((s) => s.fetchHolidays);
  const addHoliday = useSettingsStore((s) => s.addHoliday);
  const deleteHoliday = useSettingsStore((s) => s.deleteHoliday);

  useEffect(() => { if (holidays.length === 0) fetchHolidays(); }, [holidays.length, fetchHolidays]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState('national');
  const showToast = useUIStore((s) => s.showToast);

  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const grouped = sorted.reduce<Record<string, Holiday[]>>((acc, h) => { const m = format(parseISO(h.date), 'MMMM yyyy'); if (!acc[m]) acc[m] = []; acc[m].push(h); return acc; }, {});

  const handleAdd = () => {
    if (!formName || !formDate) return;
    addHoliday({ name: formName, date: formDate, type: formType as Holiday['type'], recurring: false });
    showToast({ type: 'success', title: 'Holiday added', message: `${formName} on ${format(parseISO(formDate), 'dd MMM yyyy')}` });
    setModalOpen(false); setFormName(''); setFormDate('');
  };
  const handleDelete = (h: Holiday) => { deleteHoliday(h.id); showToast({ type: 'info', title: 'Holiday removed', message: h.name }); };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Holidays</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage school holidays and calendar events</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([month, items]) => (
          <div key={month}>
            <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)] mb-3">{month}</h3>
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              {items.map((holiday, idx) => {
                const tb = typeBadge[holiday.type];
                return (
                  <div key={holiday.id} className={cn('flex items-center gap-4 px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors', idx < items.length - 1 && 'border-b border-[var(--border-subtle)]')}>
                    <div className="w-12 h-12 rounded-xl bg-[#f0f4ff] flex flex-col items-center justify-center shrink-0">
                      <span className="font-display text-[0.9375rem] font-extrabold text-[#002c98] leading-none">{format(parseISO(holiday.date), 'dd')}</span>
                      <span className="text-[0.5625rem] text-[var(--text-muted)] font-medium">{format(parseISO(holiday.date), 'EEE')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{holiday.name}</p>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">{format(parseISO(holiday.date), 'EEEE, dd MMMM yyyy')}</p>
                    </div>
                    <span className={cn('px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold', tb.bg, tb.text)}>{holiday.type}</span>
                    {holiday.recurring && <span className="px-2 py-0.5 rounded-md bg-[var(--border-subtle)] text-[0.625rem] font-semibold text-[var(--text-tertiary)]">Recurring</span>}
                    <button onClick={() => handleDelete(holiday)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Holiday" description="Add a new holiday to the school calendar"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Add Holiday</Button></>}>
        <div className="space-y-4">
          <Input label="Holiday Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Diwali" />
          <Input label="Date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          <Select label="Type" options={typeOptions} value={formType} onChange={(e) => setFormType(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
