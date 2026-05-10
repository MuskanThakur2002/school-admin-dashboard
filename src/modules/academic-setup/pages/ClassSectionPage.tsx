import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ChevronDown, ArrowLeft, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { useUIStore } from '@/stores/ui.store';
import { useAcademicStore } from '@/stores/academic.store';
import type { ClassGroup, Section } from '@/types/academic.types';

export default function ClassSectionPage() {
  const navigate = useNavigate();
  const classes = useAcademicStore((s) => s.classes);
  const loading = useAcademicStore((s) => s.classesLoading);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const createClass = useAcademicStore((s) => s.createClass);
  const updateClass = useAcademicStore((s) => s.updateClass);
  const deleteClass = useAcademicStore((s) => s.deleteClass);
  const addSection = useAcademicStore((s) => s.addSection);
  const updateSection = useAcademicStore((s) => s.updateSection);
  const deleteSection = useAcademicStore((s) => s.deleteSection);
  const years = useAcademicStore((s) => s.years);
  const fetchYears = useAcademicStore((s) => s.fetchYears);
  const showToast = useUIStore((s) => s.showToast);

  const activeYear = useMemo(() => years.find((y) => y.isCurrent), [years]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Create-class modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [formClassName, setFormClassName] = useState('');
  const [formGradeLevel, setFormGradeLevel] = useState('');

  // Edit-class modal
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);

  // Add-section modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState('');
  const [formSection, setFormSection] = useState('');

  // Edit-section modal
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<{ classId: string; section: Section } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (classes.length === 0) fetchClasses();
    if (years.length === 0) fetchYears();
  }, [classes.length, years.length, fetchClasses, fetchYears]);

  // Auto-expand the first class once data loads
  useEffect(() => {
    if (classes.length > 0 && expanded.size === 0) {
      setExpanded(new Set([classes[0].id]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddClass = async () => {
    if (!formClassName.trim() || !formGradeLevel) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Class name and grade level are required' });
      return;
    }
    setSubmitting(true);
    try {
      const cls = await createClass({
        name: formClassName.trim(),
        gradeLevel: Number(formGradeLevel),
      });
      showToast({ type: 'success', title: 'Class created', message: cls.name });
      setExpanded((prev) => new Set(prev).add(cls.id));
      setClassModalOpen(false);
      setFormClassName(''); setFormGradeLevel('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClass = async () => {
    if (!editingClass) return;
    if (!formClassName.trim() || !formGradeLevel) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Class name and grade level are required' });
      return;
    }
    setSubmitting(true);
    try {
      await updateClass(editingClass.id, {
        name: formClassName.trim(),
        gradeLevel: Number(formGradeLevel),
      });
      showToast({ type: 'success', title: 'Class updated', message: formClassName.trim() });
      setEditClassOpen(false);
      setEditingClass(null);
      setFormClassName(''); setFormGradeLevel('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditClass = (cls: ClassGroup) => {
    setEditingClass(cls);
    setFormClassName(cls.name);
    setFormGradeLevel(String(cls.gradeLevel));
    setEditClassOpen(true);
  };

  const handleAddSection = async () => {
    if (!formSection.trim()) {
      showToast({ type: 'error', title: 'Missing field', message: 'Section is required' });
      return;
    }
    if (!activeYear) {
      showToast({ type: 'error', title: 'No active year', message: 'Set an academic year as current before adding sections' });
      return;
    }
    setSubmitting(true);
    try {
      await addSection({
        classMasterId: activeClassId,
        academicYearId: activeYear.id,
        section: formSection.trim().toUpperCase(),
      });
      showToast({ type: 'success', title: 'Section added', message: `Section ${formSection.trim().toUpperCase()}` });
      setSectionModalOpen(false);
      setFormSection('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSection = async () => {
    if (!editingSection) return;
    if (!formSection.trim()) {
      showToast({ type: 'error', title: 'Missing field', message: 'Section is required' });
      return;
    }
    setSubmitting(true);
    try {
      await updateSection(editingSection.section.id, {
        section: formSection.trim().toUpperCase(),
      });
      showToast({ type: 'success', title: 'Section updated', message: `Section ${formSection.trim().toUpperCase()}` });
      setEditSectionOpen(false);
      setEditingSection(null);
      setFormSection('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditSection = (classId: string, section: Section) => {
    setEditingSection({ classId, section });
    setFormSection(section.name);
    setEditSectionOpen(true);
  };

  const handleDeleteClass = async (cls: ClassGroup) => {
    if (cls.sections.length > 0) {
      showToast({ type: 'error', title: 'Cannot delete', message: 'Remove all sections first' });
      return;
    }
    try {
      await deleteClass(cls.id);
      showToast({ type: 'info', title: 'Class deleted', message: cls.name });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  const handleDeleteSection = async (section: Section) => {
    try {
      await deleteSection(section.id);
      showToast({ type: 'info', title: 'Section removed', message: `Section ${section.name}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  const totalSections = classes.reduce((s, c) => s + c.sections.length, 0);

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
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Classes & Sections</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Manage class hierarchy and section assignments</p>
          {activeYear ? (
            <p className="text-[0.75rem] text-[var(--text-muted)] mt-2">
              Sections will be created under <span className="font-semibold text-[var(--text-secondary)]">{activeYear.name}</span> (current academic year)
            </p>
          ) : (
            <p className="text-[0.75rem] text-amber-600 mt-2">
              No active academic year — set one as current before adding sections
            </p>
          )}
        </div>
        <button
          onClick={() => { setFormClassName(''); setFormGradeLevel(''); setClassModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Classes', value: classes.length },
          { label: 'Sections', value: totalSections },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{s.value}</p>
            <p className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tree */}
      {loading && classes.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">No classes yet. Click "Add Class" to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const isExpanded = expanded.has(cls.id);
            return (
              <div key={cls.id} className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors group">
                  <button onClick={() => toggleExpand(cls.id)} className="flex items-center gap-4 flex-1 text-left">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shadow-[0_2px_6px_rgba(0,44,152,0.2)]">
                      <span className="font-display text-[0.75rem] font-bold text-white">{cls.gradeLevel}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{cls.name}</h3>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">
                        Grade {cls.gradeLevel} &middot; {cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[0.625rem] font-bold text-blue-600">
                    {cls.sections.length} sections
                  </span>
                  <button
                    onClick={() => openEditClass(cls)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--text-ghost)] hover:text-[#002c98] transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Edit class"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {cls.sections.length === 0 && (
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Delete class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div>
                    {cls.sections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className={cn(
                          'flex items-center gap-4 pl-[4.5rem] pr-6 py-3.5 group',
                          idx < cls.sections.length - 1 && 'border-b border-[var(--border-subtle)]',
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <span className="text-[0.6875rem] font-bold text-emerald-700">{sec.name}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.8125rem] text-[var(--text-secondary)]">
                            Section {sec.name}
                          </p>
                        </div>
                        <button
                          onClick={() => openEditSection(cls.id, sec)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-[var(--text-ghost)] hover:text-[#002c98] transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Edit section"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSection(sec)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Delete section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="pl-[4.5rem] pr-6 py-3 bg-[var(--card-bg-hover)]">
                      <button
                        onClick={() => { setActiveClassId(cls.id); setFormSection(''); setSectionModalOpen(true); }}
                        className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#002c98] hover:text-[#3b6cf5] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Section
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create-class modal */}
      <Modal
        open={classModalOpen}
        onOpenChange={setClassModalOpen}
        title="Add Class"
        description="Create a new class with name and grade level"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass} loading={submitting}>Create Class</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Class Name *" value={formClassName} onChange={(e) => setFormClassName(e.target.value)} placeholder="e.g. 3rd standard" />
          <Input label="Grade Level *" type="number" value={formGradeLevel} onChange={(e) => setFormGradeLevel(e.target.value)} placeholder="e.g. 3" />
        </div>
      </Modal>

      {/* Edit-class modal */}
      <Modal
        open={editClassOpen}
        onOpenChange={setEditClassOpen}
        title="Edit Class"
        description="Update class name or grade level"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setEditClassOpen(false)}>Cancel</Button>
            <Button onClick={handleEditClass} loading={submitting}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Class Name *" value={formClassName} onChange={(e) => setFormClassName(e.target.value)} />
          <Input label="Grade Level *" type="number" value={formGradeLevel} onChange={(e) => setFormGradeLevel(e.target.value)} />
        </div>
      </Modal>

      {/* Add-section modal */}
      <Modal
        open={sectionModalOpen}
        onOpenChange={setSectionModalOpen}
        title="Add Section"
        description={activeYear ? `Section will be created under ${activeYear.name}` : 'No active academic year selected'}
        footer={
          <>
            <Button variant="tertiary" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSection} loading={submitting} disabled={!activeYear}>Add Section</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Section *" value={formSection} onChange={(e) => setFormSection(e.target.value)} placeholder="e.g. A" />
        </div>
      </Modal>

      {/* Edit-section modal */}
      <Modal
        open={editSectionOpen}
        onOpenChange={setEditSectionOpen}
        title="Edit Section"
        description="Update section identifier"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setEditSectionOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSection} loading={submitting}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Section *" value={formSection} onChange={(e) => setFormSection(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
