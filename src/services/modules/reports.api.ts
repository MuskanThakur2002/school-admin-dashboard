/**
 * Reports API Layer — generates report data from existing mock data sources.
 * Backend-swap point: replace each generator with a single API call.
 */
import { expenseApi } from './expense.api';
import { paymentApi } from './payment.api';
import { ledgerApi } from './ledger.api';
import { enrollmentsApi } from './enrollments.api';
import { academicApi } from './academic.api';
import { applicationsApi } from './applications.api';
import { enquiriesApi } from './enquiries.api';
import { attendanceApi } from './attendance.api';
import { marksApi } from './marks.api';
import { assessmentsApi } from './assessments.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type { Expense } from './expense.api';
import type { Enquiry, Application } from '@/types/admissions.types';
import type { LedgerEntry, LedgerStatus, StudentLedgerSummary } from '@/types/ledger.types';
import type { StudentEnrollment } from '@/types/student.types';
import type { ClassGroup } from '@/types/academic.types';

function resolveSchoolId(): string | null {
  const { user, activeSchoolId } = useAuthStore.getState();
  return isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
}

// ─── Ledger summary helper ─────────────────────────────────
// Mirrors the client-side summary aggregation in ledger.store. Computes
// per-enrollment totals so the 4 ledger-backed reports below can group/
// filter the result set without each one re-implementing the math.

function deriveStatus(balance: number, totalPaid: number, oldestDebitDate: string): LedgerStatus {
  if (balance < 0) return 'overpaid';
  if (balance === 0) return 'clear';
  if (oldestDebitDate) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    if (oldestDebitDate < cutoffStr) return 'overdue';
  }
  return totalPaid === 0 ? 'unpaid' : 'partial';
}

async function fetchSummaries(): Promise<StudentLedgerSummary[]> {
  const schoolId = resolveSchoolId();
  if (!schoolId) return [];

  const [years, enrollmentsRes, classes] = await Promise.all([
    academicApi.getYears().catch(() => []),
    enrollmentsApi.list(schoolId, { page: 1, limit: 500 }).catch(() => ({ data: [] as StudentEnrollment[] })),
    academicApi.getClasses().catch(() => []),
  ]);

  const activeYearId = years.find((y) => y.isCurrent)?.id ?? years[0]?.id;

  const ledgerRes = await ledgerApi.list(schoolId, {
    page: 1,
    limit: 1000,
    ...(activeYearId ? { academicYearId: activeYearId } : {}),
  }).catch(() => ({ data: [] as LedgerEntry[] }));

  const enrollmentsById = new Map(enrollmentsRes.data.map((e) => [e.id, e]));
  const classNameById = new Map(classes.map((c) => [c.id, c.shortName || c.name]));

  const groups = new Map<string, LedgerEntry[]>();
  for (const e of ledgerRes.data) {
    const list = groups.get(e.studentEnrollmentId) ?? [];
    list.push(e);
    groups.set(e.studentEnrollmentId, list);
  }

  const summaries: StudentLedgerSummary[] = [];
  for (const [enrollmentId, group] of groups) {
    const enrollment = enrollmentsById.get(enrollmentId);
    const totalDue = group
      .filter((x) => x.entryType === 'Debit')
      .reduce((s, x) => s + Number(x.amount), 0);
    const totalPaid = group
      .filter((x) => x.entryType === 'Credit')
      .reduce((s, x) => s + Number(x.amount), 0);
    const balance = totalDue - totalPaid;

    const credits = group
      .filter((x) => x.entryType === 'Credit')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastPaymentDate = credits[0]?.createdAt.slice(0, 10) ?? '';

    const sortedDesc = [...group].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastActivityDate = sortedDesc[0]?.createdAt.slice(0, 10) ?? '';

    const debits = group
      .filter((x) => x.entryType === 'Debit')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const oldestDebitDate = debits[0]?.createdAt.slice(0, 10) ?? '';

    const classMasterId = enrollment?.classSection?.classMasterId;

    summaries.push({
      studentEnrollmentId: enrollmentId,
      studentId: enrollment?.studentId ?? '',
      studentName: enrollment?.student?.name ?? '',
      admissionNo: enrollment?.student?.admissionNumber ?? '',
      class: classMasterId ? classNameById.get(classMasterId) ?? '' : '',
      section: enrollment?.classSection?.section ?? '',
      totalDue,
      totalPaid,
      balance,
      lastPaymentDate,
      lastActivityDate,
      status: deriveStatus(balance, totalPaid, oldestDebitDate),
      overpaymentAmount: balance < 0 ? Math.abs(balance) : 0,
    });
  }
  return summaries;
}

// ─── Shared types ──────────────────────────────────────────

export interface ReportResult {
  reportId: string;
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  summary: ReportSummaryCard[];
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface ReportSummaryCard {
  label: string;
  value: string | number;
}

// ─── Currency helper ───────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const now = () => new Date().toISOString();

// ─── 1. Student-wise Dues ──────────────────────────────────
async function studentWiseDues(): Promise<ReportResult> {
  const summaries = await fetchSummaries();
  const withDues = summaries.filter((s) => s.balance > 0);

  return {
    reportId: '1',
    title: 'Student-wise Dues',
    generatedAt: now(),
    columns: [
      { key: 'admissionNo', label: 'Adm. No.' },
      { key: 'studentName', label: 'Student Name' },
      { key: 'class', label: 'Class' },
      { key: 'totalDue', label: 'Total Due', align: 'right' },
      { key: 'totalPaid', label: 'Total Paid', align: 'right' },
      { key: 'balance', label: 'Balance', align: 'right' },
      { key: 'status', label: 'Status' },
      { key: 'lastPaymentDate', label: 'Last Payment' },
    ],
    rows: withDues.map((s) => ({
      admissionNo: s.admissionNo,
      studentName: s.studentName,
      class: s.section ? `${s.class}-${s.section}` : s.class,
      totalDue: s.totalDue,
      totalPaid: s.totalPaid,
      balance: s.balance,
      status: s.status,
      lastPaymentDate: s.lastPaymentDate || '—',
    })),
    summary: [
      { label: 'Students with Dues', value: withDues.length },
      { label: 'Total Outstanding', value: fmt(withDues.reduce((s, r) => s + r.balance, 0)) },
      { label: 'Total Billed', value: fmt(withDues.reduce((s, r) => s + r.totalDue, 0)) },
      { label: 'Total Collected', value: fmt(withDues.reduce((s, r) => s + r.totalPaid, 0)) },
    ],
  };
}

// ─── 2. Class-wise Collection ──────────────────────────────
async function classWiseCollection(): Promise<ReportResult> {
  const summaries = await fetchSummaries();

  const classMap = new Map<string, { due: number; paid: number; count: number }>();
  for (const s of summaries) {
    const cls = s.class || 'Unknown';
    const prev = classMap.get(cls) || { due: 0, paid: 0, count: 0 };
    classMap.set(cls, { due: prev.due + s.totalDue, paid: prev.paid + s.totalPaid, count: prev.count + 1 });
  }

  const rows = [...classMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cls, v]) => ({
      class: cls,
      students: v.count,
      totalDue: v.due,
      totalCollected: v.paid,
      outstanding: v.due - v.paid,
      collectionRate: v.due > 0 ? `${Math.round((v.paid / v.due) * 100)}%` : '—',
    }));

  const totalDue = summaries.reduce((s, r) => s + r.totalDue, 0);
  const totalPaid = summaries.reduce((s, r) => s + r.totalPaid, 0);

  return {
    reportId: '2',
    title: 'Class-wise Collection',
    generatedAt: now(),
    columns: [
      { key: 'class', label: 'Class' },
      { key: 'students', label: 'Students', align: 'right' },
      { key: 'totalDue', label: 'Total Due', align: 'right' },
      { key: 'totalCollected', label: 'Collected', align: 'right' },
      { key: 'outstanding', label: 'Outstanding', align: 'right' },
      { key: 'collectionRate', label: 'Collection %', align: 'right' },
    ],
    rows,
    summary: [
      { label: 'Classes', value: classMap.size },
      { label: 'Total Students', value: summaries.length },
      { label: 'Total Collected', value: fmt(totalPaid) },
      { label: 'Overall Collection Rate', value: totalDue > 0 ? `${Math.round((totalPaid / totalDue) * 100)}%` : '—' },
    ],
  };
}

// ─── 3. Fee Defaulter List ─────────────────────────────────
async function feeDefaulterList(): Promise<ReportResult> {
  const summaries = await fetchSummaries();
  const defaulters = summaries.filter((s) => s.status === 'overdue');

  return {
    reportId: '3',
    title: 'Fee Defaulter List',
    generatedAt: now(),
    columns: [
      { key: 'admissionNo', label: 'Adm. No.' },
      { key: 'studentName', label: 'Student Name' },
      { key: 'class', label: 'Class' },
      { key: 'totalDue', label: 'Total Due', align: 'right' },
      { key: 'totalPaid', label: 'Total Paid', align: 'right' },
      { key: 'balance', label: 'Overdue Amount', align: 'right' },
      { key: 'lastPaymentDate', label: 'Last Payment' },
    ],
    rows: defaulters.map((s) => ({
      admissionNo: s.admissionNo,
      studentName: s.studentName,
      class: s.section ? `${s.class}-${s.section}` : s.class,
      totalDue: s.totalDue,
      totalPaid: s.totalPaid,
      balance: s.balance,
      lastPaymentDate: s.lastPaymentDate || 'Never',
    })),
    summary: [
      { label: 'Defaulters', value: defaulters.length },
      { label: 'Total Overdue', value: fmt(defaulters.reduce((s, r) => s + r.balance, 0)) },
      { label: '% of Students', value: summaries.length > 0 ? `${Math.round((defaulters.length / summaries.length) * 100)}%` : '—' },
    ],
  };
}

// ─── 4. Collection Ageing ──────────────────────────────────
async function collectionAgeing(): Promise<ReportResult> {
  const summaries = await fetchSummaries();
  const today = new Date();
  const withDues = summaries.filter((s) => s.balance > 0);

  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

  for (const s of withDues) {
    const lastPay = s.lastPaymentDate ? new Date(s.lastPaymentDate) : new Date(0);
    const days = Math.floor((today.getTime() - lastPay.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
    buckets[bucket] += s.balance;
  }

  const rows = withDues.map((s) => {
    const lastPay = s.lastPaymentDate ? new Date(s.lastPaymentDate) : new Date(0);
    const days = Math.floor((today.getTime() - lastPay.getTime()) / (1000 * 60 * 60 * 24));
    const bucket = days <= 30 ? '0-30 days' : days <= 60 ? '31-60 days' : days <= 90 ? '61-90 days' : '90+ days';
    return {
      admissionNo: s.admissionNo,
      studentName: s.studentName,
      class: s.section ? `${s.class}-${s.section}` : s.class,
      balance: s.balance,
      daysSincePayment: days,
      bucket,
      lastPaymentDate: s.lastPaymentDate || 'Never',
    };
  }).sort((a, b) => b.daysSincePayment - a.daysSincePayment);

  return {
    reportId: '4',
    title: 'Collection Ageing',
    generatedAt: now(),
    columns: [
      { key: 'admissionNo', label: 'Adm. No.' },
      { key: 'studentName', label: 'Student Name' },
      { key: 'class', label: 'Class' },
      { key: 'balance', label: 'Outstanding', align: 'right' },
      { key: 'daysSincePayment', label: 'Days Since Payment', align: 'right' },
      { key: 'bucket', label: 'Ageing Bucket' },
      { key: 'lastPaymentDate', label: 'Last Payment' },
    ],
    rows,
    summary: [
      { label: '0-30 Days', value: fmt(buckets['0-30']) },
      { label: '31-60 Days', value: fmt(buckets['31-60']) },
      { label: '61-90 Days', value: fmt(buckets['61-90']) },
      { label: '90+ Days', value: fmt(buckets['90+']) },
    ],
  };
}

// ─── 5. Expense Report ─────────────────────────────────────
async function expenseReport(): Promise<ReportResult> {
  const expenses = await expenseApi.getExpenses();

  const categoryTotals = new Map<string, number>();
  for (const e of expenses) {
    categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
  }

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  return {
    reportId: '5',
    title: 'Expense Report',
    generatedAt: now(),
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'studentName', label: 'Student' },
      { key: 'class', label: 'Class' },
      { key: 'amount', label: 'Amount', align: 'right' },
      { key: 'postedBy', label: 'Posted By' },
    ],
    rows: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      description: e.description,
      studentName: e.studentName,
      class: e.class,
      amount: e.amount,
      postedBy: e.postedBy,
    })),
    summary: [
      { label: 'Total Expenses', value: fmt(totalAmount) },
      { label: 'Transactions', value: expenses.length },
      { label: 'Categories', value: categoryTotals.size },
      { label: 'Top Category', value: [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—' },
    ],
  };
}

// ─── 6. Admission Report ───────────────────────────────────
async function admissionReport(): Promise<ReportResult> {
  const { user, activeSchoolId } = useAuthStore.getState();
  const schoolId = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;

  const [enquiriesRes, applicationsRes] = await Promise.all([
    schoolId
      ? enquiriesApi.list(schoolId, { page: 1, limit: 1000 })
      : Promise.resolve({ data: [] as Enquiry[], total: 0, page: 1, limit: 0 }),
    schoolId
      ? applicationsApi.list(schoolId, { page: 1, limit: 1000 })
      : Promise.resolve({ data: [] as Application[], total: 0, page: 1, limit: 0 }),
  ]);
  const enquiries = enquiriesRes.data;
  const applications = applicationsRes.data;

  const statusCounts = { new: 0, contacted: 0, converted: 0, lost: 0 };
  for (const e of enquiries) statusCounts[e.status]++;

  const appStatusCounts = { submitted: 0, under_review: 0, verified: 0, approved: 0, rejected: 0 };
  for (const a of applications) appStatusCounts[a.status]++;

  const rows = [
    ...enquiries.map((e: Enquiry) => ({
      type: 'Enquiry',
      name: e.studentName,
      parent: e.parentName,
      phone: e.parentPhone,
      classInterest: e.classInterest,
      source: e.source,
      status: e.status,
      date: e.date,
    })),
    ...applications.map((a: Application) => ({
      type: 'Application',
      name: a.studentName,
      parent: a.parentName,
      phone: a.parentPhone,
      classInterest: a.classApplied,
      source: '—',
      status: a.status,
      date: a.appliedDate,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const conversionRate = enquiries.length > 0
    ? `${Math.round((statusCounts.converted / enquiries.length) * 100)}%`
    : '—';

  return {
    reportId: '6',
    title: 'Admission Report',
    generatedAt: now(),
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'name', label: 'Student Name' },
      { key: 'parent', label: 'Parent' },
      { key: 'phone', label: 'Phone' },
      { key: 'classInterest', label: 'Class' },
      { key: 'source', label: 'Source' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date' },
    ],
    rows,
    summary: [
      { label: 'Total Enquiries', value: enquiries.length },
      { label: 'Total Applications', value: applications.length },
      { label: 'Approved', value: appStatusCounts.approved },
      { label: 'Conversion Rate', value: conversionRate },
    ],
  };
}

// ─── 7. Attendance Summary ─────────────────────────────────
// Today's attendance grouped by class section. Empty rows when nothing has
// been marked today — historical "monthly average" is dropped because the
// backend has no history-rollup endpoint yet.

const ATTENDANCE_COLUMNS: ReportColumn[] = [
  { key: 'class', label: 'Class' },
  { key: 'totalStudents', label: 'Total Students', align: 'right' },
  { key: 'presentToday', label: 'Present Today', align: 'right' },
  { key: 'absentToday', label: 'Absent Today', align: 'right' },
  { key: 'lateToday', label: 'Late Today', align: 'right' },
  { key: 'attendanceRate', label: 'Today %', align: 'right' },
];

async function attendanceSummary(): Promise<ReportResult> {
  const schoolId = resolveSchoolId();
  if (!schoolId) {
    return {
      reportId: '7',
      title: 'Attendance Summary',
      generatedAt: now(),
      columns: ATTENDANCE_COLUMNS,
      rows: [],
      summary: [],
    };
  }

  const today = new Date();
  const dateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [years, enrollmentsRes, classes, attendanceRes] = await Promise.all([
    academicApi.getYears().catch(() => []),
    enrollmentsApi.list(schoolId, { page: 1, limit: 1000 }).catch(() => ({ data: [] as StudentEnrollment[] })),
    academicApi.getClasses().catch(() => [] as ClassGroup[]),
    attendanceApi.list(schoolId, { page: 1, limit: 1000, date: dateISO }).catch(() => ({ data: [] as Array<{ studentEnrollmentId: string; status: string }> })),
  ]);

  const activeYearId = years.find((y) => y.isCurrent)?.id ?? years[0]?.id;
  const enrollments = enrollmentsRes.data.filter((e) => !activeYearId || e.academicYearId === activeYearId);
  const classNameById = new Map(classes.map((c) => [c.id, c.shortName || c.name]));

  interface Bucket { class: string; total: number; present: number; absent: number; late: number; }
  const buckets = new Map<string, Bucket>();
  const keyByEnrollment = new Map<string, string>();
  for (const enr of enrollments) {
    const cs = enr.classSection;
    if (!cs) continue;
    const className = classNameById.get(cs.classMasterId) ?? '—';
    const label = cs.section ? `${className}-${cs.section}` : className;
    const key = label;
    const b = buckets.get(key) ?? { class: label, total: 0, present: 0, absent: 0, late: 0 };
    b.total += 1;
    buckets.set(key, b);
    keyByEnrollment.set(enr.id, key);
  }

  for (const rec of attendanceRes.data) {
    const key = keyByEnrollment.get(rec.studentEnrollmentId);
    if (!key) continue;
    const b = buckets.get(key);
    if (!b) continue;
    const status = (rec.status || '').toLowerCase();
    if (status === 'present') b.present += 1;
    else if (status === 'absent') b.absent += 1;
    else if (status === 'late') b.late += 1;
  }

  const rows = Array.from(buckets.values())
    .sort((a, b) => a.class.localeCompare(b.class))
    .map((b) => {
      const marked = b.present + b.absent + b.late;
      const rate = marked > 0 ? `${Math.round((b.present / marked) * 100)}%` : '—';
      return {
        class: b.class,
        totalStudents: b.total,
        presentToday: b.present,
        absentToday: b.absent,
        lateToday: b.late,
        attendanceRate: rate,
      };
    });

  const totalStudents = rows.reduce((s, r) => s + (r.totalStudents as number), 0);
  const totalPresent = rows.reduce((s, r) => s + (r.presentToday as number), 0);
  const totalMarked = rows.reduce((s, r) => s + (r.presentToday as number) + (r.absentToday as number) + (r.lateToday as number), 0);

  return {
    reportId: '7',
    title: 'Attendance Summary',
    generatedAt: now(),
    columns: ATTENDANCE_COLUMNS,
    rows,
    summary: [
      { label: 'Total Students', value: totalStudents },
      { label: 'Marked Today', value: totalMarked },
      { label: 'Present Today', value: totalPresent },
      { label: 'Overall Rate', value: totalMarked > 0 ? `${Math.round((totalPresent / totalMarked) * 100)}%` : '—' },
    ],
  };
}

// ─── 8. Academic Performance ───────────────────────────────
// Aggregates per-enrollment from `/student-marks` joined with assessments
// for maxMarks. Pass threshold = 35% (Indian board convention), Distinction
// = 75%. Empty rows when no marks are entered yet for the active year.

const ACADEMIC_COLUMNS: ReportColumn[] = [
  { key: 'class', label: 'Class' },
  { key: 'appeared', label: 'Appeared', align: 'right' },
  { key: 'passed', label: 'Passed', align: 'right' },
  { key: 'failed', label: 'Failed', align: 'right' },
  { key: 'passRate', label: 'Pass %', align: 'right' },
  { key: 'distinction', label: 'Distinction', align: 'right' },
  { key: 'avgScore', label: 'Avg Score', align: 'right' },
];

async function academicPerformance(): Promise<ReportResult> {
  const schoolId = resolveSchoolId();
  if (!schoolId) {
    return {
      reportId: '8',
      title: 'Academic Performance',
      generatedAt: now(),
      columns: ACADEMIC_COLUMNS,
      rows: [],
      summary: [],
    };
  }

  const [years, enrollmentsRes, classes, marksRes, assessmentsRes] = await Promise.all([
    academicApi.getYears().catch(() => []),
    enrollmentsApi.list(schoolId, { page: 1, limit: 1000 }).catch(() => ({ data: [] as StudentEnrollment[] })),
    academicApi.getClasses().catch(() => [] as ClassGroup[]),
    marksApi.list(schoolId, { page: 1, limit: 1000 }).catch(() => ({ data: [] as Array<{ studentEnrollmentId: string; assessmentId: string; marksObtained: string | number }> })),
    assessmentsApi.list(schoolId, { page: 1, limit: 500 }).catch(() => ({ data: [] as Array<{ id: string; maxMarks: string | number }> })),
  ]);

  const activeYearId = years.find((y) => y.isCurrent)?.id ?? years[0]?.id;
  const enrollments = enrollmentsRes.data.filter((e) => !activeYearId || e.academicYearId === activeYearId);
  const classNameById = new Map(classes.map((c) => [c.id, c.shortName || c.name]));

  const assessmentMaxById = new Map<string, number>();
  for (const a of assessmentsRes.data) {
    assessmentMaxById.set(a.id, Number(a.maxMarks) || 0);
  }

  // Per-enrollment percentage aggregate (average of (obtained / max) * 100).
  interface MarkAgg { sumPct: number; count: number; }
  const byEnrollment = new Map<string, MarkAgg>();
  for (const m of marksRes.data) {
    const max = assessmentMaxById.get(m.assessmentId) ?? 0;
    if (max <= 0) continue;
    const pct = (Number(m.marksObtained) || 0) / max * 100;
    const agg = byEnrollment.get(m.studentEnrollmentId) ?? { sumPct: 0, count: 0 };
    agg.sumPct += pct;
    agg.count += 1;
    byEnrollment.set(m.studentEnrollmentId, agg);
  }

  interface ClassBucket { class: string; appeared: number; passed: number; failed: number; distinction: number; sumAvg: number; }
  const buckets = new Map<string, ClassBucket>();
  for (const enr of enrollments) {
    const cs = enr.classSection;
    if (!cs) continue;
    const className = classNameById.get(cs.classMasterId) ?? '—';
    const label = cs.section ? `${className}-${cs.section}` : className;
    const b = buckets.get(label) ?? { class: label, appeared: 0, passed: 0, failed: 0, distinction: 0, sumAvg: 0 };
    const agg = byEnrollment.get(enr.id);
    if (agg && agg.count > 0) {
      const avg = agg.sumPct / agg.count;
      b.appeared += 1;
      b.sumAvg += avg;
      if (avg >= 35) b.passed += 1;
      else b.failed += 1;
      if (avg >= 75) b.distinction += 1;
    }
    buckets.set(label, b);
  }

  const rows = Array.from(buckets.values())
    .filter((b) => b.appeared > 0)
    .sort((a, b) => a.class.localeCompare(b.class))
    .map((b) => ({
      class: b.class,
      appeared: b.appeared,
      passed: b.passed,
      failed: b.failed,
      passRate: b.appeared > 0 ? `${Math.round((b.passed / b.appeared) * 100)}%` : '—',
      distinction: b.distinction,
      avgScore: b.appeared > 0 ? `${Math.round(b.sumAvg / b.appeared)}%` : '—',
    }));

  const totalAppeared = rows.reduce((s, r) => s + (r.appeared as number), 0);
  const totalPassed = rows.reduce((s, r) => s + (r.passed as number), 0);
  const totalDistinction = rows.reduce((s, r) => s + (r.distinction as number), 0);

  return {
    reportId: '8',
    title: 'Academic Performance',
    generatedAt: now(),
    columns: ACADEMIC_COLUMNS,
    rows,
    summary: [
      { label: 'Total Appeared', value: totalAppeared },
      { label: 'Total Passed', value: totalPassed },
      { label: 'Overall Pass Rate', value: totalAppeared > 0 ? `${Math.round((totalPassed / totalAppeared) * 100)}%` : '—' },
      { label: 'Distinctions', value: totalDistinction },
    ],
  };
}

// ─── 9. Audit Trail ────────────────────────────────────────
// Combines real payments (from /payments) with mock expenses. Payments
// are resolved to student names by joining with the enrollments list.
async function auditTrail(): Promise<ReportResult> {
  const schoolId = resolveSchoolId();

  const [payments, enrollments, expenses] = await Promise.all([
    schoolId ? paymentApi.list(schoolId, { page: 1, limit: 500 }).then((r) => r.data) : Promise.resolve([]),
    schoolId ? enrollmentsApi.list(schoolId, { page: 1, limit: 500 }).then((r) => r.data) : Promise.resolve([]),
    expenseApi.getExpenses(),
  ]);

  const enrollmentsById = new Map(enrollments.map((e) => [e.id, e]));

  const paymentRows = payments.map((p) => {
    const enr = enrollmentsById.get(p.studentEnrollmentId);
    const studentName = enr?.student?.name ?? '—';
    return {
      date: p.paidAt ? p.paidAt.slice(0, 10) : p.createdAt.slice(0, 10),
      type: 'Payment',
      description: `Receipt ${p.receiptNumber || p.id.slice(0, 8)} — ${studentName}`,
      amount: Number(p.amount),
      mode: (p.paymentMode || '—').toUpperCase(),
      reference: p.transactionRef || '—',
      status: p.status || 'posted',
      user: 'Accounts',
    };
  });

  const expenseRows = expenses.map((e: Expense) => ({
    date: e.date,
    type: 'Expense',
    description: `${e.description} — ${e.studentName}`,
    amount: e.amount,
    mode: '—',
    reference: '—',
    status: 'posted',
    user: e.postedBy,
  }));

  const rows = [...paymentRows, ...expenseRows].sort((a, b) => b.date.localeCompare(a.date));

  return {
    reportId: '9',
    title: 'Audit Trail',
    generatedAt: now(),
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', align: 'right' },
      { key: 'mode', label: 'Mode' },
      { key: 'reference', label: 'Reference' },
      { key: 'status', label: 'Status' },
      { key: 'user', label: 'User' },
    ],
    rows,
    summary: [
      { label: 'Total Entries', value: rows.length },
      { label: 'Payments', value: paymentRows.length },
      { label: 'Expenses', value: expenseRows.length },
      { label: 'Total Value', value: fmt(rows.reduce((s, r) => s + (r.amount as number), 0)) },
    ],
  };
}

// ─── Report generators map ─────────────────────────────────
const generators: Record<string, () => Promise<ReportResult>> = {
  '1': studentWiseDues,
  '2': classWiseCollection,
  '3': feeDefaulterList,
  '4': collectionAgeing,
  '5': expenseReport,
  '6': admissionReport,
  '7': attendanceSummary,
  '8': academicPerformance,
  '9': auditTrail,
};

export const reportsApi = {
  generateReport: (reportId: string): Promise<ReportResult> => {
    const gen = generators[reportId];
    if (!gen) return Promise.reject(new Error(`Unknown report: ${reportId}`));
    return gen();
  },
};
