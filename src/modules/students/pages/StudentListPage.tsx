import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  X,
  Phone,
  Users,
  GraduationCap,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStudentsStore } from '@/stores/students.store';

const statusStyle: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  inactive: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
  alumni: { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' },
  tc_issued: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
};

const classOptions = ['', 'II', 'V', 'VIII', 'X', 'XII'];

// ─── Component ───────────────────────────────────────────────

export default function StudentListPage() {
  const navigate = useNavigate();
  const students = useStudentsStore((s) => s.students);
  const fetchStudents = useStudentsStore((s) => s.fetchStudents);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (students.length === 0) fetchStudents();
  }, [students.length, fetchStudents]);

  const activeCount = students.filter((s) => s.status === 'active').length;

  const filteredData = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !search ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
        s.parentName.toLowerCase().includes(search.toLowerCase());
      const matchesClass = !classFilter || s.class === classFilter;
      const matchesStatus = !statusFilter || s.status === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, search, classFilter, statusFilter]);

  return (
    <div className="max-w-[1280px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-[1.625rem] font-bold text-[var(--text-primary)] tracking-[-0.02em]">Students</h1>
          <p className="text-[0.875rem] text-[var(--text-muted)] mt-1">{students.length} students enrolled</p>
        </div>
        <div className="flex gap-2.5">
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-[0.8125rem] font-semibold text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)] transition-all">
            <Download className="w-4 h-4" strokeWidth={2} />
            Export
          </button>
          <button
            onClick={() => navigate('/admissions/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#002c98] text-white text-[0.8125rem] font-semibold shadow-[0_2px_8px_rgba(0,44,152,0.3)] hover:shadow-[0_4px_16px_rgba(0,44,152,0.35)] hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Admission
          </button>
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Students', value: students.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: activeCount, icon: UserCheck, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Classes', value: new Set(students.map((s) => s.class)).size, icon: GraduationCap, color: 'bg-violet-50 text-violet-600' },
          { label: 'Avg. per Class', value: Math.round(students.length / new Set(students.map((s) => s.class)).size), icon: Users, color: 'bg-amber-50 text-amber-600' },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--card-bg)] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.75rem] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">{m.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.color)}>
                <m.icon className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <p className="font-display text-[1.625rem] font-extrabold text-[var(--text-primary)] tracking-[-0.02em] leading-none">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" strokeWidth={2} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, admission no, parent..."
            className="w-full bg-[var(--card-bg)] rounded-xl pl-10 pr-9 py-2.5 text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] outline-none shadow-[0_1px_3px_rgba(0,0,0,0.04)] focus:shadow-[0_0_0_2px_rgba(0,44,152,0.12)] transition-shadow"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-tertiary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Class filter */}
        <div className="flex gap-1.5">
          {classOptions.map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
                classFilter === c
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
              )}
            >
              {c === '' ? 'All' : `Class ${c}`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 ml-auto">
          {['', 'active', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[0.75rem] font-semibold transition-all',
                statusFilter === s
                  ? 'bg-[#0f172a] text-white shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--border-subtle)]',
              )}
            >
              {s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.2fr_2.5fr_1fr_0.8fr_2fr_1fr] gap-4 px-6 py-3.5 bg-[var(--card-bg-hover)]">
          {['Adm. No.', 'Student', 'Class', 'Roll', 'Parent / Guardian', 'Status'].map((h) => (
            <span key={h} className="text-[0.6875rem] font-semibold text-[var(--text-muted)] uppercase tracking-[0.08em]">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filteredData.map((student, idx) => {
          const st = statusStyle[student.status];
          const initials = `${student.firstName[0]}${student.lastName[0]}`;
          return (
            <div
              key={student.id}
              onClick={() => navigate(`/students/${student.id}`)}
              className={cn(
                'grid grid-cols-[1.2fr_2.5fr_1fr_0.8fr_2fr_1fr] gap-4 items-center px-6 py-4 transition-colors hover:bg-[var(--card-bg-hover)] cursor-pointer',
                idx < filteredData.length - 1 && 'border-b border-[var(--border-subtle)]',
              )}
            >
              {/* Adm No */}
              <span className="text-[0.75rem] font-bold text-[#002c98] tracking-wide">{student.admissionNo}</span>

              {/* Student */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#002c98] to-[#3b6cf5] flex items-center justify-center shrink-0">
                  <span className="text-white text-[0.625rem] font-bold">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-[var(--text-primary)] truncate">{student.firstName} {student.lastName}</p>
                  <p className="text-[0.6875rem] text-[var(--text-muted)] capitalize">{student.gender}</p>
                </div>
              </div>

              {/* Class */}
              <span className="text-[0.8125rem] font-semibold text-[var(--text-secondary)]">{student.class}-{student.section}</span>

              {/* Roll */}
              <span className="text-[0.8125rem] font-display font-bold text-[var(--text-secondary)]">{student.rollNo}</span>

              {/* Parent */}
              <div className="min-w-0">
                <p className="text-[0.8125rem] text-[var(--text-secondary)] truncate">{student.parentName}</p>
                <div className="flex items-center gap-1 text-[0.6875rem] text-[var(--text-muted)]">
                  <Phone className="w-3 h-3" strokeWidth={1.8} />
                  <span>{student.parentPhone}</span>
                </div>
              </div>

              {/* Status */}
              <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit', st.bg)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                <span className={cn('text-[0.6875rem] font-semibold capitalize', st.text)}>{student.status}</span>
              </div>
            </div>
          );
        })}

        {/* Empty */}
        {filteredData.length === 0 && (
          <div className="py-16 text-center">
            <Search className="w-10 h-10 text-[#e2e8f0] mx-auto mb-3" />
            <p className="text-[0.875rem] font-medium text-[var(--text-muted)]">No students found</p>
            <p className="text-[0.75rem] text-[var(--text-ghost)] mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[var(--card-bg-hover)]">
          <p className="text-[0.75rem] text-[var(--text-muted)]">{filteredData.length} of {students.length} students</p>
        </div>
      </div>
    </div>
  );
}
