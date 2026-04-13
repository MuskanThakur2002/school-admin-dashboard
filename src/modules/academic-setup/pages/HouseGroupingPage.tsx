import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, Flag } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';

const PRESET_COLORS = [
  '#DC2626', '#2563EB', '#16A34A', '#CA8A04',
  '#9333EA', '#EA580C', '#0D9488', '#DB2777',
];

export default function HouseGroupingPage() {
  const navigate = useNavigate();
  const houses = useAcademicStore((s) => s.houses);
  const loading = useAcademicStore((s) => s.housesLoading);
  const fetchHouses = useAcademicStore((s) => s.fetchHouses);
  const createHouse = useAcademicStore((s) => s.createHouse);
  const deleteHouse = useAcademicStore((s) => s.deleteHouse);
  const showToast = useUIStore((s) => s.showToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formMotto, setFormMotto] = useState('');
  const [formCaptain, setFormCaptain] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (houses.length === 0) fetchHouses();
  }, [houses.length, fetchHouses]);

  const totalStudents = houses.reduce((sum, h) => sum + h.studentCount, 0);

  const handleAdd = async () => {
    if (!formName) {
      showToast({ type: 'error', title: 'Missing fields', message: 'House name is required' });
      return;
    }
    setSubmitting(true);
    try {
      await createHouse({ name: formName, color: formColor, motto: formMotto, captainName: formCaptain || undefined });
      showToast({ type: 'success', title: 'House created', message: formName });
      setModalOpen(false);
      setFormName(''); setFormMotto(''); setFormCaptain(''); setFormColor(PRESET_COLORS[0]);
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteHouse(id);
      showToast({ type: 'success', title: 'House deleted', message: name });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      {/* Back */}
      <button
        onClick={() => navigate('/academic')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Academic Setup
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">House Grouping</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage school houses and team assignments for inter-house activities</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add House
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Houses', value: houses.length, icon: Flag, color: 'bg-rose-50 text-rose-600' },
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Avg per House', value: houses.length ? Math.round(totalStudents / houses.length) : 0, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* House cards */}
      {loading && houses.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading houses...</p>
        </div>
      ) : houses.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <Flag className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[0.9375rem] font-semibold text-[var(--text-primary)] mb-1">No houses created yet</p>
          <p className="text-[0.8125rem] text-[var(--text-muted)]">Add your first house to get started with inter-house grouping.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {houses.map((house) => (
            <div
              key={house.id}
              className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all overflow-hidden"
            >
              {/* Color banner */}
              <div className="h-2" style={{ backgroundColor: house.color }} />

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${house.color}15` }}
                    >
                      <Flag className="w-[18px] h-[18px]" style={{ color: house.color }} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{house.name}</h3>
                      <p className="text-[0.6875rem] text-[var(--text-muted)] italic">{house.motto}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(house.id, house.name)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-ghost)] hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                    <p className="font-display text-[1.125rem] font-extrabold text-[var(--text-primary)] leading-none">{house.studentCount}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Students</p>
                  </div>
                  <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                    <p className="text-[0.75rem] font-semibold text-[var(--text-primary)] leading-tight">{house.captainName || '—'}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Captain</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add house modal */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add House"
        description="Create a new house for inter-house activities"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={submitting}>Create House</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="House Name *" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Red House" />

          <div>
            <label className="block text-[0.8125rem] font-medium text-[var(--text-primary)] mb-1.5">Color *</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-all',
                    formColor === c ? 'ring-2 ring-offset-2 ring-[var(--text-primary)] scale-110' : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Input label="Motto" value={formMotto} onChange={(e) => setFormMotto(e.target.value)} placeholder="e.g. Courage and strength" />
          <Input label="Captain Name" value={formCaptain} onChange={(e) => setFormCaptain(e.target.value)} placeholder="e.g. Aarav Patel" />
        </div>
      </Modal>
    </div>
  );
}
