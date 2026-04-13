import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useReportsStore } from '@/stores/reports.store';
import { generateCsv, downloadCsv } from '@/utils/csv';

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function ReportViewerPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { report, loading, error, generateReport, clearReport } = useReportsStore();

  useEffect(() => {
    if (reportId) generateReport(reportId);
    return () => clearReport();
  }, [reportId, generateReport, clearReport]);

  const handleCsvExport = () => {
    if (!report) return;
    const csvColumns = report.columns.map((col) => ({
      header: col.label,
      accessor: (row: Record<string, string | number>) => row[col.key],
    }));
    const csv = generateCsv(csvColumns, report.rows);
    const filename = `${report.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
    downloadCsv(csv, filename);
  };

  const handlePrint = () => window.print();

  if (error) {
    return (
      <div className="max-w-[1280px]">
        <button onClick={() => navigate('/reports')} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </button>
        <div className="bg-red-50 rounded-2xl p-8 text-center">
          <p className="text-[0.875rem] text-red-600 font-medium">Failed to generate report: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button onClick={() => navigate('/reports')} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">
            {loading ? 'Generating Report...' : report?.title || 'Report'}
          </h1>
          {report && (
            <p className="text-[0.8125rem] text-[var(--text-muted)] mt-1">
              Generated on {new Date(report.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        {report && (
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all print:hidden">
              <Printer className="w-4 h-4" strokeWidth={2} /> Print
            </button>
            <button onClick={handleCsvExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold bg-[#002c98] text-white shadow-[0_2px_6px_rgba(0,44,152,0.25)] hover:brightness-110 transition-all print:hidden">
              <Download className="w-4 h-4" strokeWidth={2} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pulse">
                <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-7 w-28 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-[var(--card-bg)] rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-pulse">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {report.summary.map((card) => (
              <div key={card.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{card.label}</span>
                <p className="font-display text-[1.375rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Data table */}
          <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--card-bg-hover)]">
                    {report.columns.map((col) => (
                      <th key={col.key} className={cn(
                        'px-5 py-3.5 text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em] whitespace-nowrap',
                        col.align === 'right' ? 'text-right' : 'text-left',
                      )}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, idx) => (
                    <tr key={idx} className={cn(
                      'hover:bg-[var(--card-bg-hover)] transition-colors',
                      idx < report.rows.length - 1 && 'border-b border-[var(--border-subtle)]',
                    )}>
                      {report.columns.map((col) => {
                        const val = row[col.key];
                        const isNumber = typeof val === 'number';
                        const displayVal = isNumber && col.align === 'right' && col.key !== 'daysSincePayment' && col.key !== 'students' && col.key !== 'totalStudents' && col.key !== 'presentToday' && col.key !== 'absentToday' && col.key !== 'appeared' && col.key !== 'passed' && col.key !== 'failed' && col.key !== 'distinction'
                          ? fmtCurrency(val)
                          : val;
                        return (
                          <td key={col.key} className={cn(
                            'px-5 py-3.5 text-[0.8125rem] whitespace-nowrap',
                            col.align === 'right' ? 'text-right font-display font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                          )}>
                            {col.key === 'status' ? (
                              <StatusBadge status={String(val)} />
                            ) : (
                              displayVal
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {report.rows.length === 0 && (
                    <tr>
                      <td colSpan={report.columns.length} className="px-5 py-16 text-center text-[0.875rem] text-[var(--text-muted)]">
                        No data found for this report.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-[var(--card-bg-hover)]">
              <p className="text-[0.75rem] text-[var(--text-muted)]">{report.rows.length} rows</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { dot: string; text: string; bg: string }> = {
    clear: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    partial: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    overdue: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
    overpaid: { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    confirmed: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    bounced: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
    cancelled: { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' },
    posted: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    new: { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    contacted: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    converted: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    closed: { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' },
    submitted: { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    under_review: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    verified: { dot: 'bg-teal-500', text: 'text-teal-700', bg: 'bg-teal-50' },
    approved: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    rejected: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
  };
  const st = styles[status] || { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full', st.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
      <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{status.replace(/_/g, ' ')}</span>
    </span>
  );
}
