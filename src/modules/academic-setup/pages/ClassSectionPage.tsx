import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ChevronDown, Users, ArrowLeft, Trash2 } from 'lucide-react';
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
  const deleteClass = useAcademicStore((s) => s.deleteClass);
  const addSection = useAcademicStore((s) => s.addSection);
  const deleteSection = useAcademicStore((s) => s.deleteSection);
  const showToast = useUIStore((s) => s.showToast);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState('');

  const [formClassName, setFormClassName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formGrade, setFormGrade] = useState('');

  const [formSectionName, setFormSectionName] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formCapacity, setFormCapacity] = useState('40');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (classes.length === 0) fetchClasses();
  }, [classes.length, fetchClasses]);

  // Auto-expand the first class when classes load (so it doesn't look empty)
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
    if (!formClassName || !formShortName || !formGrade) {
      showToast({ type: 'error', title: 'Missing fields', message: 'All fields are required' });
      return;
    }
    setSubmitting(true);
    try {
      const cls = await createClass({
        name: formClassName,
        shortName: formShortName,
        grade: Number(formGrade),
      });
      showToast({ type: 'success', title: 'Class created', message: cls.name });
      setExpanded((prev) => new Set(prev).add(cls.id));
      setClassModalOpen(false);
      setFormClassName(''); setFormShortName(''); setFormGrade('');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSection = async () => {
    if (!formSectionName || !formTeacher) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Section name and teacher are required' });
      return;
    }
    setSubmitting(true);
    try {
      await addSection({
        classId: activeClassId,
        name: formSectionName,
        classTeacher: formTeacher,
        capacity: Number(formCapacity),
      });
      showToast({ type: 'success', title: 'Section added', message: `Section ${formSectionName}` });
      setSectionModalOpen(false);
      setFormSectionName(''); setFormTeacher(''); setFormCapacity('40');
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
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

  const handleDeleteSection = async (classId: string, section: Section) => {
    try {
      await deleteSection(classId, section.id);
      showToast({ type: 'info', title: 'Section removed', message: `Section ${section.name}` });
    } catch (err) {
      showToast({ type: 'error', title: 'Failed', message: (err as Error).message });
    }
  };

  const totalStudents = classes.reduce((s, c) => s + c.sections.reduce((ss, sec) => ss + sec.studentCount, 0), 0);
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
        </div>
        <button
          onClick={() => setClassModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Classes', value: classes.length },
          { label: 'Sections', value: totalSections },
          { label: 'Students', value: totalStudents },
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
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const isExpanded = expanded.has(cls.id);
            const studentSum = cls.sections.reduce((s, sec) => s + sec.studentCount, 0);
            return (
              <div key={cls.id} className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--card-bg-hover)] transition-colors group">
                  <button onClick={() => toggleExpand(cls.id)} className="flex items-center gap-4 flex-1 text-left">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shadow-[0_2px_6px_rgba(0,44,152,0.2)]">
                      <span className="font-display text-[0.75rem] font-bold text-white">{cls.grade}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)]">{cls.name}</h3>
                      <p className="text-[0.6875rem] text-[var(--text-muted)]">
                        {cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''} &middot; {studentSum} students
                      </p>
                    </div>
                  </button>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[0.625rem] font-bold text-blue-600">
                    {cls.sections.length} sections
                  </span>
                  {cls.sections.length === 0 && (
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div>
                    {cls.sections.map((sec, idx) => {
                      const fillPct = Math.round((sec.studentCount / sec.capacity) * 100);
                      return (
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
                              <span className="text-[var(--text-muted)]"> &middot; {sec.classTeacher}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 w-36">
                            <Users className="w-3.5 h-3.5 text-[var(--text-ghost)]" />
                            <div className="flex-1 h-[5px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  fillPct > 90 ? 'bg-red-500' : fillPct > 70 ? 'bg-amber-400' : 'bg-emerald-500',
                                )}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                            <span className="text-[0.6875rem] text-[var(--text-muted)] font-medium w-12 text-right">
                              {sec.studentCount}/{sec.capacity}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteSection(cls.id, sec)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--text-ghost)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <div className="pl-[4.5rem] pr-6 py-3 bg-[var(--card-bg-hover)]">
                      <button
                        onClick={() => { setActiveClassId(cls.id); setSectionModalOpen(true); }}
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

      {/* Class Modal */}
      <Modal
        open={classModalOpen}
        onOpenChange={setClassModalOpen}
        title="Add Class"
        description="Create a new class with grade and short name"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setClassModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass} loading={submitting}>Create Class</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Class Name *" value={formClassName} onChange={(e) => setFormClassName(e.target.value)} placeholder="e.g. Class VI" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Short Name *" value={formShortName} onChange={(e) => setFormShortName(e.target.value)} placeholder="e.g. VI" />
            <Input label="Grade Number *" type="number" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} placeholder="e.g. 6" />
          </div>
        </div>
      </Modal>

      {/* Section Modal */}
      <Modal
        open={sectionModalOpen}
        onOpenChange={setSectionModalOpen}
        title="Add Section"
        description="Create a new section under this class"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setSectionModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSection} loading={submitting}>Add Section</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Section Name *" value={formSectionName} onChange={(e) => setFormSectionName(e.target.value)} placeholder="e.g. C" />
          <Input label="Class Teacher *" value={formTeacher} onChange={(e) => setFormTeacher(e.target.value)} placeholder="e.g. Ms. Anita Desai" />
          <Input label="Capacity" type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="40" />
        </div>
      </Modal>
    </div>
  );
}
