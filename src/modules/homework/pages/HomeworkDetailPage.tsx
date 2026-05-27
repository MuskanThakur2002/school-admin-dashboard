import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, NotebookPen, Calendar, Paperclip, ExternalLink, FileText, Pencil } from 'lucide-react';
import { useHomeworkStore } from '@/stores/homework.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useTeacherStore } from '@/stores/teacher.store';
import { getAttachmentFiles } from '@/types/homework.types';
import type { Homework, HomeworkAttachmentFile } from '@/types/homework.types';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];

function isAbsoluteUrl(u: string | undefined): u is string {
  return !!u && /^https?:\/\//i.test(u);
}

/** A usable absolute URL for the file, or null if we only have a bare S3 key. */
function attachmentUrl(f: HomeworkAttachmentFile): string | null {
  if (isAbsoluteUrl(f.validUrl)) return f.validUrl;
  if (isAbsoluteUrl(f.fileUrl)) return f.fileUrl;
  return null;
}

function isImage(f: HomeworkAttachmentFile): boolean {
  const name = (f.fileName ?? f.fileUrl).toLowerCase().split('?')[0];
  return IMAGE_EXTS.some((ext) => name.endsWith(`.${ext}`));
}

function fileLabel(f: HomeworkAttachmentFile): string {
  return f.fileName ?? f.fileUrl.split('/').pop() ?? 'Attachment';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5">
      <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-[0.8125rem] text-[var(--text-primary)] font-medium">{value || '—'}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-blue-600" strokeWidth={2} />
        </div>
        <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] tracking-[-0.01em]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function HomeworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getHomework = useHomeworkStore((s) => s.getHomework);

  const classes = useAcademicStore((s) => s.classes);
  const subjects = useAcademicStore((s) => s.subjects);
  const fetchClasses = useAcademicStore((s) => s.fetchClasses);
  const fetchSubjects = useAcademicStore((s) => s.fetchSubjects);

  const teachers = useTeacherStore((s) => s.teachers);
  const fetchTeachers = useTeacherStore((s) => s.fetchTeachers);

  const [homework, setHomework] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getHomework(id)
      .then((h) => setHomework(h))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id, getHomework]);

  // Labels aren't populated on the homework GET, so resolve them from the stores.
  useEffect(() => {
    if (classes.length === 0) fetchClasses();
    if (subjects.length === 0) fetchSubjects();
    if (teachers.length === 0) fetchTeachers(1, 100);
  }, [classes.length, subjects.length, teachers.length, fetchClasses, fetchSubjects, fetchTeachers]);

  const sectionLabel = useMemo(() => {
    if (!homework) return '—';
    for (const cls of classes) {
      const s = cls.sections.find((sec) => sec.id === homework.classSectionId);
      if (s) return `${cls.name} – ${s.name}`;
    }
    return '—';
  }, [homework, classes]);

  const subjectLabel = useMemo(() => {
    if (!homework) return '—';
    return homework.subject?.name ?? subjects.find((s) => s.id === homework.subjectId)?.name ?? '—';
  }, [homework, subjects]);

  const teacherLabel = useMemo(() => {
    if (!homework) return '—';
    const t = teachers.find((x) => x.id === homework.teacherId);
    return t?.user?.name ?? t?.employeeId ?? '—';
  }, [homework, teachers]);

  const files = useMemo(() => getAttachmentFiles(homework?.attachments), [homework]);

  if (loading) {
    return (
      <div className="max-w-[1280px] py-20 text-center">
        <p className="text-[0.875rem] text-[var(--text-muted)]">Loading homework…</p>
      </div>
    );
  }

  if (error || !homework) {
    return (
      <div className="max-w-[1280px]">
        <button
          onClick={() => navigate('/homework')}
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Homework
        </button>
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] font-semibold text-red-600">{error ?? 'Homework not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      <button
        onClick={() => navigate('/homework')}
        className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--text-muted)] hover:text-[#002c98] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Homework
      </button>

      <div className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,44,152,0.25)]">
            <NotebookPen className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[1.375rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
              {homework.title}
            </h1>
            <p className="text-[0.8125rem] text-[var(--text-tertiary)] mt-1">
              {sectionLabel} &middot; {subjectLabel}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[0.75rem] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Due: {homework.dueDate?.split('T')[0] ?? '—'}</span>
              <span className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {files.length} attachment{files.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Details" icon={Pencil}>
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Class / Section" value={sectionLabel} />
            <Field label="Subject" value={subjectLabel} />
            <Field label="Teacher" value={teacherLabel} />
            <Field label="Due Date" value={homework.dueDate?.split('T')[0] ?? '—'} />
          </div>
          <div className="pt-2">
            <p className="text-[0.6875rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1">Description</p>
            <p className="text-[0.8125rem] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {homework.description || '—'}
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Attachments" icon={Paperclip}>
          {files.length === 0 ? (
            <p className="text-[0.8125rem] text-[var(--text-muted)] py-2">No attachments uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {files.map((f, i) => {
                const url = attachmentUrl(f);
                return (
                  <div key={`${f.fileUrl}-${i}`} className="rounded-xl overflow-hidden bg-[var(--card-bg-hover)]">
                    {url && isImage(f) ? (
                      <a href={url} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={url}
                          alt={fileLabel(f)}
                          className="w-full max-h-[320px] object-contain bg-black/[0.03]"
                        />
                      </a>
                    ) : null}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <FileText className="w-4 h-4 text-[var(--text-muted)] shrink-0" strokeWidth={2} />
                      <span className="flex-1 min-w-0 truncate text-[0.8125rem] text-[var(--text-primary)]">
                        {fileLabel(f)}
                      </span>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[#002c98] hover:underline shrink-0"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[0.6875rem] text-[var(--text-ghost)] shrink-0" title="No signed URL available for this file">
                          Preview unavailable
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
