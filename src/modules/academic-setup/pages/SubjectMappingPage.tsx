import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2, ArrowLeft, Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { Subject } from '@/types/academic.types';

export default function SubjectMappingPage() {
  const navigate = useNavigate();
  const subjects = useAcademicStore((s) => s.subjects);
  const loading = useAcademicStore((s) => s.subjectsLoading);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);
  const createSubject = useAcademicStore((s) => s.createSubject);
  const updateSubject = useAcademicStore((s) => s.updateSubject);
  const deleteSubject = useAcademicStore((s) => s.deleteSubject);
  const showToast = useUIStore((s) => s.showToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (subjects.length === 0) fetchSubjects();
  }, [subjects.length, fetchSubjects]);

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditingId(s.id);
    setFormName(s.name);
    setFormCode(s.code);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName || !formCode) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Subject name and code are required' });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateSubject(editingId, { name: formName, code: formCode.toUpperCase() });
        showToast({ type: 'success', title: 'Subject updated', message: formName });
      } else {
        await createSubject({ name: formName, code: formCode.toUpperCase() });
        showToast({ type: 'success', title: 'Subject added', message: formName });
      }
      setModalOpen(false);
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
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Define the subjects offered at your school</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {loading && subjects.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <BookOpen className="w-10 h-10 text-[var(--text-ghost)] mx-auto mb-3" />
          <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No subjects yet</p>
          <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Add a subject to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all relative group"
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(subject)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--text-ghost)] hover:text-blue-600 transition-all"
                  aria-label="Edit subject"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(subject)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all"
                  aria-label="Delete subject"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BookOpen className="w-[18px] h-[18px] text-blue-600" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-[0.875rem] font-bold text-[var(--text-primary)]">{subject.name}</h3>
                  <span className="font-display text-[0.6875rem] font-bold text-[var(--text-muted)] tracking-wide">{subject.code}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? 'Edit Subject' : 'Add Subject'}
        description={editingId ? 'Update the subject details' : 'Create a new subject'}
        size="lg"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>{editingId ? 'Save Changes' : 'Add Subject'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Subject Name *" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Economics" />
            <Input label="Subject Code *" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. ECO" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
