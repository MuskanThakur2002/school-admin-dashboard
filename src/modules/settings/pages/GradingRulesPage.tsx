import { useState, useEffect } from 'react';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import type { GradeRule } from '@/stores/settings.store';

const gradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'bg-emerald-50 text-emerald-700';
  if (grade.startsWith('B')) return 'bg-blue-50 text-blue-700';
  if (grade.startsWith('C')) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-600';
};

export default function GradingRulesPage() {
  const rules = useSettingsStore((s) => s.grades);
  const fetchGrades = useSettingsStore((s) => s.fetchGrades);
  const addGrade = useSettingsStore((s) => s.addGrade);
  const deleteGrade = useSettingsStore((s) => s.deleteGrade);

  useEffect(() => { if (rules.length === 0) fetchGrades(); }, [rules.length, fetchGrades]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formGrade, setFormGrade] = useState('');
  const [formMin, setFormMin] = useState('');
  const [formMax, setFormMax] = useState('');
  const [formGpa, setFormGpa] = useState('');
  const [formRemark, setFormRemark] = useState('');
  const showToast = useUIStore((s) => s.showToast);

  const handleAdd = () => {
    if (!formGrade || !formMin || !formMax) return;
    addGrade({ grade: formGrade, minPct: Number(formMin), maxPct: Number(formMax), gpa: Number(formGpa), remark: formRemark });
    showToast({ type: 'success', title: 'Grade added', message: formGrade });
    setModalOpen(false); setFormGrade(''); setFormMin(''); setFormMax(''); setFormGpa(''); setFormRemark('');
  };

  const handleDelete = (r: GradeRule) => {
    deleteGrade(r.id);
    showToast({ type: 'info', title: 'Grade removed', message: r.grade });
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Grading Rules</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Set up grading scales and evaluation criteria</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Grade
        </button>
      </div>

      {/* Grading scale visual */}
      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-8">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-violet-600" strokeWidth={2} />
          </div>
          <h2 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">Grade Scale</h2>
        </div>
        <div className="flex gap-2 mb-6">
          {rules.map((r) => {
            const width = r.maxPct - r.minPct + 1;
            return (
              <div key={r.id} className="text-center" style={{ flex: width }}>
                <div className={cn('rounded-lg py-2 mb-1.5', gradeColor(r.grade))}>
                  <span className="font-display text-[0.875rem] font-extrabold">{r.grade}</span>
                </div>
                <span className="text-[0.5625rem] text-[var(--text-muted)]">{r.minPct}–{r.maxPct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="grid grid-cols-[0.8fr_1fr_1fr_0.8fr_2fr_0.5fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Grade', 'Min %', 'Max %', 'GPA', 'Remark', ''].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>
        {rules.map((rule, idx) => (
          <div key={rule.id} className={cn('grid grid-cols-[0.8fr_1fr_1fr_0.8fr_2fr_0.5fr] gap-4 items-center px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors',
            idx < rules.length - 1 && 'border-b border-[var(--border-subtle)]')}>
            <div className={cn('inline-flex items-center justify-center w-10 h-8 rounded-lg font-display text-[0.8125rem] font-extrabold', gradeColor(rule.grade))}>
              {rule.grade}
            </div>
            <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">{rule.minPct}%</span>
            <span className="font-display text-[0.875rem] font-bold text-[var(--text-primary)]">{rule.maxPct}%</span>
            <span className="font-display text-[0.875rem] font-bold text-[var(--text-secondary)]">{rule.gpa}</span>
            <span className="text-[0.8125rem] text-[var(--text-tertiary)]">{rule.remark}</span>
            <button onClick={() => handleDelete(rule)} className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Add Grade" description="Define a new grade in the grading scale"
        footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleAdd}>Add Grade</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Grade" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} placeholder="e.g. A+" />
            <Input label="GPA Points" type="number" value={formGpa} onChange={(e) => setFormGpa(e.target.value)} placeholder="e.g. 10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Min Percentage" type="number" value={formMin} onChange={(e) => setFormMin(e.target.value)} placeholder="e.g. 91" />
            <Input label="Max Percentage" type="number" value={formMax} onChange={(e) => setFormMax(e.target.value)} placeholder="e.g. 100" />
          </div>
          <Input label="Remark" value={formRemark} onChange={(e) => setFormRemark(e.target.value)} placeholder="e.g. Outstanding" />
        </div>
      </Modal>
    </div>
  );
}
