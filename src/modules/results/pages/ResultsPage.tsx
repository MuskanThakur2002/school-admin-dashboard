import { useEffect, useMemo } from 'react';
import { GraduationCap, CalendarDays } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Pagination } from '@/components/ui/Pagination/Pagination';
import { useMarksStore } from '@/stores/marks.store';
import type { StudentMark, MarkAssessment } from '@/types/assessment.types';

// Parent-only read-only results view (route + nav are gated to the Parent role).
// The backend scopes GET /student-marks to the logged-in parent's children, so
// this page shows only their own child's marks. Marks are entered by staff via
// Exams → Enter Marks.

interface ExamGroup {
  assessmentId: string;
  name: string;
  assessment?: MarkAssessment;
  marks: StudentMark[];
}

function formatDateRange(a?: MarkAssessment): string | null {
  if (!a?.startDate) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const start = fmt(a.startDate);
  if (a.endDate && a.endDate !== a.startDate) return `${start} – ${fmt(a.endDate)}`;
  return start;
}

export default function ResultsPage() {
  const items = useMarksStore((s) => s.items);
  const total = useMarksStore((s) => s.total);
  const page = useMarksStore((s) => s.page);
  const limit = useMarksStore((s) => s.limit);
  const loading = useMarksStore((s) => s.loading);
  const fetchMarks = useMarksStore((s) => s.fetchMarks);

  useEffect(() => {
    fetchMarks({ page: 1 });
  }, [fetchMarks]);

  // Group the marks on the current page by exam (assessment).
  const groups = useMemo<ExamGroup[]>(() => {
    const map = new Map<string, ExamGroup>();
    for (const m of items) {
      let g = map.get(m.assessmentId);
      if (!g) {
        g = { assessmentId: m.assessmentId, name: m.assessment?.name ?? 'Assessment', assessment: m.assessment, marks: [] };
        map.set(m.assessmentId, g);
      }
      g.marks.push(m);
    }
    return [...map.values()];
  }, [items]);

  return (
    <div className="p-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-tint)] flex items-center justify-center text-[#002c98]">
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-[1.375rem] font-display font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            Results
          </h1>
          <p className="text-[0.8125rem] text-[var(--text-muted)]">Your child's marks across assessments</p>
        </div>
      </div>

      {loading && (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">Loading results...</p>
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="bg-[var(--card-bg)] rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[0.875rem] text-[var(--text-muted)]">No results published yet.</p>
        </div>
      )}

      {/* One card per exam */}
      {!loading && groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((g) => {
            const dateRange = formatDateRange(g.assessment);
            return (
              <div
                key={g.assessmentId}
                className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
              >
                {/* Exam header */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-bold text-[var(--text-primary)] truncate">{g.name}</p>
                    {dateRange && (
                      <p className="flex items-center gap-1.5 text-[0.75rem] text-[var(--text-muted)] mt-0.5">
                        <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
                        {dateRange}
                      </p>
                    )}
                  </div>
                  {g.assessment?.maxMarks != null && (
                    <span className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] whitespace-nowrap">
                      Max {g.assessment.maxMarks}
                    </span>
                  )}
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[2fr_1fr_0.8fr_2fr] gap-4 px-6 py-3 bg-[var(--card-bg-hover)]">
                  {['Subject', 'Marks', 'Grade', 'Remarks'].map((h) => (
                    <span
                      key={h}
                      className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Subject rows */}
                {g.marks.map((m, idx) => (
                  <div
                    key={m.id}
                    className={cn(
                      'grid grid-cols-[2fr_1fr_0.8fr_2fr] gap-4 items-center px-6 py-4',
                      idx < g.marks.length - 1 && 'border-b border-[var(--border-subtle)]',
                    )}
                  >
                    <span className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">
                      {m.subject?.name ?? '—'}
                    </span>
                    <span className="text-[0.75rem] text-[var(--text-secondary)]">
                      {m.marksObtained}
                      {g.assessment?.maxMarks != null && (
                        <span className="text-[var(--text-muted)]"> / {g.assessment.maxMarks}</span>
                      )}
                    </span>
                    <span className="text-[0.75rem] text-[var(--text-secondary)]">{m.grade || '—'}</span>
                    <span className="text-[0.75rem] text-[var(--text-secondary)] truncate">
                      {m.remarks || '—'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {total > limit && (
        <div className="mt-4">
          <Pagination
            page={page}
            total={total}
            limit={limit}
            onPageChange={(p) => fetchMarks({ page: p })}
            onLimitChange={(l) => fetchMarks({ page: 1, limit: l })}
          />
        </div>
      )}
    </div>
  );
}
