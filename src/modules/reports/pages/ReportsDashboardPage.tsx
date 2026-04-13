import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, IndianRupee, AlertTriangle, CheckCircle2,
  BarChart3, TrendingUp, FileText, Download,
  GraduationCap, ClipboardList,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui.store';
import { useReportsStore } from '@/stores/reports.store';
import { generateCsv, downloadCsv } from '@/utils/csv';

interface ReportType { id: string; name: string; description: string; icon: React.ElementType; color: string; category: string; }

const reports: ReportType[] = [
  { id: '1', name: 'Student-wise Dues', description: 'Outstanding balance per student with ageing', icon: Users, color: 'bg-blue-50 text-blue-600', category: 'finance' },
  { id: '2', name: 'Class-wise Collection', description: 'Fee collection summary grouped by class', icon: BarChart3, color: 'bg-emerald-50 text-emerald-600', category: 'finance' },
  { id: '3', name: 'Fee Defaulter List', description: 'Students with overdue payments beyond grace', icon: AlertTriangle, color: 'bg-red-50 text-red-500', category: 'finance' },
  { id: '4', name: 'Collection Ageing', description: 'Payment ageing analysis: 30/60/90+ days', icon: TrendingUp, color: 'bg-amber-50 text-amber-600', category: 'finance' },
  { id: '5', name: 'Expense Report', description: 'All posted expenses grouped by category', icon: IndianRupee, color: 'bg-violet-50 text-violet-600', category: 'finance' },
  { id: '6', name: 'Admission Report', description: 'Enquiry-to-enrollment conversion pipeline', icon: ClipboardList, color: 'bg-teal-50 text-teal-600', category: 'academic' },
  { id: '7', name: 'Attendance Summary', description: 'Class-wise and student-wise attendance rates', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', category: 'academic' },
  { id: '8', name: 'Academic Performance', description: 'Results and rank analysis per class/subject', icon: GraduationCap, color: 'bg-blue-50 text-blue-600', category: 'academic' },
  { id: '9', name: 'Audit Trail', description: 'System activity log for financial transactions', icon: FileText, color: 'bg-slate-50 text-slate-500', category: 'system' },
];

const categories = ['all', 'finance', 'academic', 'system'];

export default function ReportsDashboardPage() {
  const [catFilter, setCatFilter] = useState('all');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const showToast = useUIStore((s) => s.showToast);
  const { generateReport } = useReportsStore();
  const navigate = useNavigate();

  const filtered = catFilter === 'all' ? reports : reports.filter((r) => r.category === catFilter);

  const handleGenerate = (report: ReportType) => {
    navigate(`/reports/${report.id}`);
  };

  const handleCsvExport = async (report: ReportType) => {
    setExportingId(report.id);
    try {
      const result = await generateReport(report.id);
      const csvColumns = result.columns.map((col) => ({
        header: col.label,
        accessor: (row: Record<string, string | number>) => row[col.key],
      }));
      const csv = generateCsv(csvColumns, result.rows);
      const filename = `${result.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
      downloadCsv(csv, filename);
      showToast({ type: 'success', title: 'CSV exported', message: `${report.name} downloaded successfully` });
    } catch {
      showToast({ type: 'error', title: 'Export failed', message: `Could not generate ${report.name}` });
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="max-w-[1280px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Reports</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">Generate and export school reports</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-8">
        {categories.map((c) => (
          <button key={c} onClick={() => setCatFilter(c)} className={cn('px-3.5 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all capitalize', catFilter === c ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]')}>
            {c}
          </button>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((report) => (
          <div key={report.id} className="bg-[var(--card-bg)] rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all group">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', report.color)}>
              <report.icon className="w-5 h-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-[0.9375rem] font-bold text-[var(--text-primary)] mb-1">{report.name}</h3>
            <p className="text-[0.8125rem] text-[var(--text-muted)] mb-5 leading-relaxed">{report.description}</p>

            <div className="flex gap-2">
              <button onClick={() => handleGenerate(report)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.75rem] font-semibold bg-[#002c98] text-white shadow-[0_2px_6px_rgba(0,44,152,0.25)] hover:brightness-110 transition-all flex-1 justify-center">
                <BarChart3 className="w-3.5 h-3.5" /> Generate
              </button>
              <button onClick={() => handleCsvExport(report)}
                disabled={exportingId === report.id}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[0.75rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all',
                  exportingId === report.id && 'opacity-50 pointer-events-none',
                )}>
                <Download className="w-3.5 h-3.5" strokeWidth={2} /> {exportingId === report.id ? '...' : 'CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
