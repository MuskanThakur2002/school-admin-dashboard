import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { Subject, SubjectType } from '@/types/academic.types';

const typeBadge: Record<string, { bg: string; text: string }> = {
  core: { bg: 'bg-blue-50', text: 'text-blue-700' },
  elective: { bg: 'bg-violet-50', text: 'text-violet-700' },
  activity: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

export default function SubjectMappingPage() {
  const navigate = useNavigate();
  const subjects = useAcademicStore((s) => s.subjects);
  const classes = useAcademicStore((s) => s.classes);
  const loading = useAcademicStore((s) => s.subjectsLoading);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const createSubject = useAcademicStore((s) => s.createSubject);
  const deleteSubject = useAcademicStore((s) => s.deleteSubject);
  const showToast = useUIStore((s) => s.showToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<SubjectType>('core');
  const [formClasses, setFormClasses] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (subjects.length === 0) fetchSubjects();
    if (classes.length === 0) fetchClasses();
  }, [subjects.length, classes.length, fetchSubjects, fetchClasses]);

  const filtered = filterType === 'all' ? subjects : subjects.filter((s) => s.type === filterType);
  const classOptions = classes.map((c) => c.shortName);

  const toggleClass = (cls: string) => {
    setFormClasses((prev) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]));
  };

  const handleAdd = async () => {
    if (!formName || !formCode) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Subject name and code are required' });
      return;
    }
    setSubmitting(true);
    try {
      await createSubject({ name: formName, code: formCode.toUpperCase(), type: formType, classes: formClasses });
      showToast({ type: 'success', title: 'Subject added', message: formName });
      setModalOpen(false);
      setFormName(''); setFormCode(''); setFormClasses([]); setFormType('core');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: Subject) => {
    try {
      await deleteSubject(s.id);
      showToast({ type: 'info', title: 'Subject removed', message: s.name });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  return (
    <div className="max-w-[1280px]">
      <button
        onClick={() => navigate('/academic')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Academic Setup
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Subjects</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Define subjects and assign them to classes</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-6">
        {['all', 'core', 'elective', 'activity'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
              filterType === type ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
            )}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {loading && subjects.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading subjects...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((subject) => {
            const tb = typeBadge[subject.type];
            return (
              <div
                key={subject.id}
                className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all relative group"
              >
                <button
                  onClick={() => handleDelete(subject)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <BookOpen className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)]">{subject.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-display text-[0.6875rem] font-bold text-[var(--text-muted)] tracking-wide">{subject.code}</span>
                      <span className={cn('px-2 py-0.5 rounded-md text-[0.625rem] font-bold capitalize', tb.bg, tb.text)}>
                        {subject.type}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-2">Assigned to</p>
                <div className="flex flex-wrap gap-1">
                  {subject.classes.length === 0 ? (
                    <span className="text-[0.625rem] text-[var(--text-ghost)] italic">Not assigned</span>
                  ) : subject.classes.map((cls) => (
                    <span key={cls} className="px-2 py-0.5 rounded-md bg-[var(--border-subtle)] text-[0.625rem] font-semibold text-[var(--text-tertiary)]">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add Subject"
        description="Create a new subject and assign it to classes"
        size="lg"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} loading={submitting}>Add Subject</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Subject Name *" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Economics" />
            <Input label="Subject Code *" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. ECO" />
          </div>
          <Select
            label="Type *"
            options={[
              { label: 'Core', value: 'core' },
              { label: 'Elective', value: 'elective' },
              { label: 'Activity', value: 'activity' },
            ]}
            value={formType}
            onChange={(e) => setFormType(e.target.value as SubjectType)}
          />
          <div>
            <p className="text-[0.75rem] font-semibold text-[var(--text-secondary)] mb-2">Assign to Classes</p>
            {classOptions.length === 0 ? (
              <p className="text-[0.6875rem] text-[var(--text-muted)]">No classes available. Create classes first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classOptions.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => toggleClass(cls)}
                    className={cn(
                      'min-w-[44px] h-9 px-3 rounded-lg text-[0.75rem] font-semibold transition-all',
                      formClasses.includes(cls)
                        ? 'bg-[#002c98] text-white shadow-[0_2px_4px_rgba(0,44,152,0.2)]'
                        : 'bg-[var(--card-bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
                    )}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
