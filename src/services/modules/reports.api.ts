/**
 * Reports API Layer — generates report data from existing mock data sources.
 * Backend-swap point: replace each generator with a single API call.
 *
 * The 4 ledger-backed reports below (dues, class-wise, defaulters, ageing)
 * currently return empty rows. The old mock `getLedgerSummaries` was removed
 * when the ledger module went real; reports needs its own backend-scoped
 * fetch (school + active year) before these can be rebuilt.
 */
import { receiptApi } from './receipt.api';
import { expenseApi } from './expense.api';
import { applicationsApi } from './applications.api';
import { enquiriesApi } from './enquiries.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type { Receipt } from '@/types/receipt.types';
import type { Expense } from './expense.api';
import type { Enquiry, Application } from '@/types/admissions.types';

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

// ─── 1-4. Ledger-backed reports (placeholder) ──────────────
// These four reports used to derive rows from `ledgerApi.getLedgerSummaries`.
// The ledger module now talks to a real backend that doesn't expose a
// summary endpoint, so the rows are empty until reports gets rewired to
// fetch ledger entries scoped by school + active year and aggregate them.

async function studentWiseDues(): Promise<ReportResult> {
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
    rows: [],
    summary: [
      { label: 'Students with Dues', value: 0 },
      { label: 'Total Outstanding', value: fmt(0) },
      { label: 'Total Billed', value: fmt(0) },
      { label: 'Total Collected', value: fmt(0) },
    ],
  };
}

async function classWiseCollection(): Promise<ReportResult> {
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
    rows: [],
    summary: [
      { label: 'Classes', value: 0 },
      { label: 'Total Students', value: 0 },
      { label: 'Total Collected', value: fmt(0) },
      { label: 'Overall Collection Rate', value: '—' },
    ],
  };
}

async function feeDefaulterList(): Promise<ReportResult> {
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
    rows: [],
    summary: [
      { label: 'Defaulters', value: 0 },
      { label: 'Total Overdue', value: fmt(0) },
      { label: '% of Students', value: '—' },
    ],
  };
}

async function collectionAgeing(): Promise<ReportResult> {
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
    rows: [],
    summary: [
      { label: '0-30 Days', value: fmt(0) },
      { label: '31-60 Days', value: fmt(0) },
      { label: '61-90 Days', value: fmt(0) },
      { label: '90+ Days', value: fmt(0) },
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

// ─── 7. Attendance Summary (mock — no attendance store yet) ─
async function attendanceSummary(): Promise<ReportResult> {
  // Mock attendance data since there's no attendance store yet
  const classes = ['II-A', 'V-A', 'V-B', 'VIII-A', 'VIII-B', 'X-A', 'X-B', 'XII-A', 'XII-B'];
  const rows = classes.map((cls) => {
    const total = 20 + Math.floor(Math.random() * 25);
    const present = Math.floor(total * (0.78 + Math.random() * 0.2));
    return {
      class: cls,
      totalStudents: total,
      presentToday: present,
      absentToday: total - present,
      attendanceRate: `${Math.round((present / total) * 100)}%`,
      monthlyAvg: `${75 + Math.floor(Math.random() * 20)}%`,
    };
  });

  const totalStudents = rows.reduce((s, r) => s + (r.totalStudents as number), 0);
  const totalPresent = rows.reduce((s, r) => s + (r.presentToday as number), 0);

  return {
    reportId: '7',
    title: 'Attendance Summary',
    generatedAt: now(),
    columns: [
      { key: 'class', label: 'Class' },
      { key: 'totalStudents', label: 'Total Students', align: 'right' },
      { key: 'presentToday', label: 'Present Today', align: 'right' },
      { key: 'absentToday', label: 'Absent Today', align: 'right' },
      { key: 'attendanceRate', label: 'Today %', align: 'right' },
      { key: 'monthlyAvg', label: 'Monthly Avg', align: 'right' },
    ],
    rows,
    summary: [
      { label: 'Total Students', value: totalStudents },
      { label: 'Present Today', value: totalPresent },
      { label: 'Absent Today', value: totalStudents - totalPresent },
      { label: 'Overall Rate', value: `${Math.round((totalPresent / totalStudents) * 100)}%` },
    ],
  };
}

// ─── 8. Academic Performance (mock — no exam store yet) ────
async function academicPerformance(): Promise<ReportResult> {
  const classes = ['II-A', 'V-A', 'V-B', 'VIII-A', 'VIII-B', 'X-A', 'X-B', 'XII-A', 'XII-B'];
  const rows = classes.map((cls) => {
    const appeared = 25 + Math.floor(Math.random() * 15);
    const passed = Math.floor(appeared * (0.75 + Math.random() * 0.22));
    const distinction = Math.floor(passed * (0.1 + Math.random() * 0.25));
    return {
      class: cls,
      appeared,
      passed,
      failed: appeared - passed,
      passRate: `${Math.round((passed / appeared) * 100)}%`,
      distinction,
      avgScore: `${55 + Math.floor(Math.random() * 30)}%`,
    };
  });

  return {
    reportId: '8',
    title: 'Academic Performance',
    generatedAt: now(),
    columns: [
      { key: 'class', label: 'Class' },
      { key: 'appeared', label: 'Appeared', align: 'right' },
      { key: 'passed', label: 'Passed', align: 'right' },
      { key: 'failed', label: 'Failed', align: 'right' },
      { key: 'passRate', label: 'Pass %', align: 'right' },
      { key: 'distinction', label: 'Distinction', align: 'right' },
      { key: 'avgScore', label: 'Avg Score', align: 'right' },
    ],
    rows,
    summary: [
      { label: 'Total Appeared', value: rows.reduce((s, r) => s + (r.appeared as number), 0) },
      { label: 'Total Passed', value: rows.reduce((s, r) => s + (r.passed as number), 0) },
      { label: 'Overall Pass Rate', value: `${Math.round((rows.reduce((s, r) => s + (r.passed as number), 0) / rows.reduce((s, r) => s + (r.appeared as number), 0)) * 100)}%` },
      { label: 'Distinctions', value: rows.reduce((s, r) => s + (r.distinction as number), 0) },
    ],
  };
}

// ─── 9. Audit Trail ────────────────────────────────────────
async function auditTrail(): Promise<ReportResult> {
  const [receipts, expenses] = await Promise.all([
    receiptApi.getReceipts(),
    expenseApi.getExpenses(),
  ]);

  const rows = [
    ...receipts.map((r: Receipt) => ({
      date: r.date,
      type: 'Payment',
      description: `Receipt ${r.receiptNo} — ${r.studentName}`,
      amount: r.amount,
      mode: r.mode.toUpperCase(),
      reference: r.reference,
      status: r.status,
      user: 'Accounts',
    })),
    ...expenses.map((e: Expense) => ({
      date: e.date,
      type: 'Expense',
      description: `${e.description} — ${e.studentName}`,
      amount: e.amount,
      mode: '—',
      reference: e.ledgerEntryId || '—',
      status: 'posted',
      user: e.postedBy,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

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
      { label: 'Payments', value: receipts.length },
      { label: 'Expenses', value: expenses.length },
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
