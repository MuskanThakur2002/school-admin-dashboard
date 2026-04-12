import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, CheckCircle2, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { AcademicYear } from '@/types/academic.types';

const statusBadge: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  upcoming: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  archived: { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' },
};

export default function AcademicYearPage() {
  const navigate = useNavigate();
  const years = useAcademicStore((s) => s.years);
  const loading = useAcademicStore((s) => s.yearsLoading);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const createYear = useAcademicStore((s) => s.createYear);
  const activateYear = useAcademicStore((s) => s.activateYear);
  const showToast = useUIStore((s) => s.showToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (years.length === 0) fetchYears();
  }, [years.length, fetchYears]);

  const handleAdd = async () => {
    if (!formName || !formStart || !formEnd) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Name, start date, and end date are required' });
      return;
    }
    setSubmitting(true);
    try {
      await createYear({ name: formName, startDate: formStart, endDate: formEnd });
      showToast({ type: 'success', title: 'Academic year created', message: formName });
      setModalOpen(false);
      setFormName(''); setFormStart(''); setFormEnd('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (year: AcademicYear) => {
    if (year.status === 'active') return;
    try {
      await activateYear(year.id);
      showToast({ type: 'success', title: 'Year activated', message: `${year.name} is now the active academic year` });
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
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Academic Years</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage academic year configuration and lifecycle</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Year
        </button>
      </div>

      {loading && years.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading academic years...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {years.map((year) => {
            const sb = statusBadge[year.status];
            const isActive = year.status === 'active';
            return (
              <div
                key={year.id}
                className={cn(
                  'bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all relative',
                  isActive && 'ring-2 ring-emerald-200',
                )}
              >
                {isActive && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-emerald-500" strokeWidth={2} />}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isActive ? 'bg-gradient-to-br from-[#002c98] to-[#3b6cf5] shadow-[0_2px_6px_rgba(0,44,152,0.25)]' : 'bg-[var(--border-subtle)]',
                  )}>
                    <Calendar className={cn('w-[18px] h-[18px]', isActive ? 'text-white' : 'text-[var(--text-muted)]')} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="font-display text-[1.25rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em]">{year.name}</h3>
                    <div className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[0.625rem] font-bold', sb.bg, sb.text)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', sb.dot)} /> {year.status}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">Start</p>
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{year.startDate}</p>
                  </div>
                  <div>
                    <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">End</p>
                    <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)]">{year.endDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                    <p className="font-display text-[1.125rem] font-extrabold text-[var(--text-primary)] leading-none">{year.totalStudents}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Students</p>
                  </div>
                  <div className="rounded-xl bg-[var(--card-bg-hover)] px-3 py-2.5 text-center">
                    <p className="font-display text-[1.125rem] font-extrabold text-[var(--text-primary)] leading-none">{year.totalClasses}</p>
                    <p className="text-[0.625rem] text-[var(--text-muted)] font-medium mt-1">Classes</p>
                  </div>
                </div>

                {/* Activate button */}
                {!isActive && year.status !== 'archived' && (
                  <button
                    onClick={() => handleActivate(year)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Activate Year
                  </button>
                )}
                {isActive && (
                  <div className="text-center py-2 text-[0.6875rem] font-semibold text-emerald-600">
                    ● Currently Active
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add Academic Year"
        description="Create a new academic year"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={submitting}>Create Year</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Year Name *" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. 2027-28" />
          <Input label="Start Date *" type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} />
          <Input label="End Date *" type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
