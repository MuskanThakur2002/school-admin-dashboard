/**
 * Ledger API Layer
 * Backend-swap point — replace function bodies with fetch() calls.
 */
import type {
  LedgerEntry,
  StudentLedgerSummary,
  CreateLedgerEntryDto,
  InitializeLedgerDto,
  RefundDto,
} from '@/types/ledger.types';
import { feeApi } from './fee.api';

const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

// ─── Mock DB ──────────────────────────────────────────────
let entriesDb: LedgerEntry[] = [];

// Helper: recalculate running balances for a student
const recalcBalances = (studentId: string) => {
  const studentEntries = entriesDb
    .filter((e) => e.studentId === studentId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let bal = 0;
  for (const e of studentEntries) {
    bal += e.type === 'debit' ? e.amount : -e.amount;
    e.balance = bal;
  }
};

// Helper: build a summary for one student
const buildSummary = (studentId: string, studentName: string, admissionNo: string, cls: string, section: string): StudentLedgerSummary => {
  const entries = entriesDb.filter((e) => e.studentId === studentId);
  const totalDue = entries.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const totalPaid = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const balance = totalDue - totalPaid;
  const credits = entries.filter((e) => e.type === 'credit').sort((a, b) => b.date.localeCompare(a.date));
  const lastPaymentDate = credits.length > 0 ? credits[0].date : '';
  const overpaymentAmount = balance < 0 ? Math.abs(balance) : 0;
  let status: StudentLedgerSummary['status'] = 'clear';
  if (balance < 0) {
    status = 'overpaid';
  } else if (balance > 0) {
    // overdue if last payment was more than 90 days ago or no payment at all
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    status = (!lastPaymentDate || lastPaymentDate < cutoffStr) ? 'overdue' : 'partial';
  }
  return { studentId, studentName, admissionNo, class: cls, section, totalDue, totalPaid, balance, lastPaymentDate, status, overpaymentAmount };
};

// Student info keyed by ID (mirrors students.api.ts)
const studentInfo: Record<string, { name: string; admissionNo: string; class: string; section: string }> = {
  'stu-1':  { name: 'Arjun Patel',   admissionNo: 'ADM-2025-001', class: 'VIII', section: 'A' },
  'stu-2':  { name: 'Priya Sharma',  admissionNo: 'ADM-2025-002', class: 'VIII', section: 'A' },
  'stu-3':  { name: 'Rohan Gupta',   admissionNo: 'ADM-2025-003', class: 'X',    section: 'A' },
  'stu-4':  { name: 'Ananya Iyer',   admissionNo: 'ADM-2025-004', class: 'V',    section: 'B' },
  'stu-5':  { name: 'Kabir Singh',   admissionNo: 'ADM-2025-005', class: 'VIII', section: 'B' },
  'stu-6':  { name: 'Meera Nair',    admissionNo: 'ADM-2025-006', class: 'XII',  section: 'A' },
  'stu-7':  { name: 'Dev Reddy',     admissionNo: 'ADM-2025-007', class: 'II',   section: 'A' },
  'stu-8':  { name: 'Sneha Joshi',   admissionNo: 'ADM-2024-089', class: 'X',    section: 'B' },
  'stu-9':  { name: 'Ravi Kumar',    admissionNo: 'ADM-2023-045', class: 'XII',  section: 'B' },
  'stu-10': { name: 'Ishita Verma',  admissionNo: 'ADM-2022-112', class: 'V',    section: 'A' },
};

// ─── Seed data ────────────────────────────────────────────
let entryCounter = 0;
const nextId = () => `le-${++entryCounter}`;

const seed = (studentId: string, items: Omit<LedgerEntry, 'id' | 'studentId' | 'balance' | 'createdBy'>[]) => {
  let bal = 0;
  for (const item of items) {
    bal += item.type === 'debit' ? item.amount : -item.amount;
    entriesDb.push({ ...item, id: nextId(), studentId, balance: bal, createdBy: 'system' });
  }
};

// stu-1: Arjun Patel — VIII — Middle School (87,200) — partial, paid 65,000
seed('stu-1', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Sports & Activities', type: 'debit', category: 'activity', amount: 2000 },
  { date: '2025-04-15', description: 'Payment received — Cheque', type: 'credit', category: 'payment', amount: 30000, mode: 'cheque', reference: 'CHQ-445891' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-07-20', description: 'Payment received — UPI', type: 'credit', category: 'payment', amount: 20000, mode: 'upi', reference: 'UPI-TXN-78234' },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2026-02-10', description: 'Payment received — NEFT', type: 'credit', category: 'payment', amount: 15000, mode: 'neft', reference: 'NEFT-ICI-89012' },
]);

// stu-2: Priya Sharma — VIII — fully paid (clear)
seed('stu-2', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Sports & Activities', type: 'debit', category: 'activity', amount: 2000 },
  { date: '2025-04-10', description: 'Payment received — NEFT (Full Year)', type: 'credit', category: 'payment', amount: 87200, mode: 'neft', reference: 'NEFT-SBI-11234' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2026-03-05', description: 'Annual Discount Adjustment', type: 'credit', category: 'concession', amount: 500, reference: 'CON-EARLY' },
]);

// stu-3: Rohan Gupta — X — Senior Secondary (106,500) — overdue, paid 53,000
seed('stu-3', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2025-04-20', description: 'Payment received — Cash', type: 'credit', category: 'payment', amount: 30000, mode: 'cash', reference: 'REC-0041' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-12-20', description: 'Payment received — UPI', type: 'credit', category: 'payment', amount: 23000, mode: 'upi', reference: 'UPI-TXN-45001' },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-15', description: 'Late Fee Penalty', type: 'debit', category: 'late_fee', amount: 500 },
  { date: '2026-02-01', description: 'Exam Fee — Final', type: 'debit', category: 'exam', amount: 1500 },
]);

// stu-4: Ananya Iyer — V — Primary (68,700) — clear
seed('stu-4', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Sports & Activities', type: 'debit', category: 'activity', amount: 2000 },
  { date: '2025-04-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2025-04-12', description: 'Payment received — DD (Full Year)', type: 'credit', category: 'payment', amount: 68700, mode: 'dd', reference: 'DD-KAN-7812' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2026-01-15', description: 'Annual Discount', type: 'credit', category: 'concession', amount: 1000, reference: 'CON-EARLY' },
]);

// stu-5: Kabir Singh — VIII — overdue, paid 43,600
seed('stu-5', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Sports & Activities', type: 'debit', category: 'activity', amount: 2000 },
  { date: '2025-04-25', description: 'Payment received — Cash', type: 'credit', category: 'payment', amount: 30000, mode: 'cash', reference: 'REC-0055' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-10-10', description: 'Payment received — Cheque', type: 'credit', category: 'payment', amount: 13600, mode: 'cheque', reference: 'CHQ-778901' },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2026-02-01', description: 'Late Fee Penalty', type: 'debit', category: 'late_fee', amount: 500 },
]);

// stu-6: Meera Nair — XII — Higher Secondary (121,000) — partial, paid 90,000
seed('stu-6', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-15', description: 'Payment received — NEFT', type: 'credit', category: 'payment', amount: 50000, mode: 'neft', reference: 'NEFT-FED-34521' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-01', description: 'Exam Fee — Final', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2026-01-28', description: 'Payment received — UPI', type: 'credit', category: 'payment', amount: 40000, mode: 'upi', reference: 'UPI-TXN-90123' },
]);

// stu-7: Dev Reddy — II — Primary (68,700) — clear
seed('stu-7', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Sports & Activities', type: 'debit', category: 'activity', amount: 2000 },
  { date: '2025-04-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2025-04-20', description: 'Payment received — NEFT (Full Year)', type: 'credit', category: 'payment', amount: 68700, mode: 'neft', reference: 'NEFT-HYD-55612' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2026-03-01', description: 'Early Bird Discount', type: 'credit', category: 'concession', amount: 1200, reference: 'CON-EARLY' },
]);

// stu-8: Sneha Joshi — X — Senior Secondary (106,500) — partial, paid 80,000
seed('stu-8', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2025-04-20', description: 'Payment received — NEFT', type: 'credit', category: 'payment', amount: 40000, mode: 'neft', reference: 'NEFT-PNB-88123' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-01', description: 'Exam Fee — Final', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-02-22', description: 'Payment received — UPI', type: 'credit', category: 'payment', amount: 40000, mode: 'upi', reference: 'UPI-TXN-33456' },
]);

// stu-9: Ravi Kumar — XII — Higher Secondary (121,000) — overdue, paid 40,000
seed('stu-9', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Computer Lab Fee', type: 'debit', category: 'lab', amount: 3000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-20', description: 'Payment received — Cash', type: 'credit', category: 'payment', amount: 25000, mode: 'cash', reference: 'REC-0099' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-07-01', description: 'Exam Fee — Term 1', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2025-09-15', description: 'Payment received — Cheque', type: 'credit', category: 'payment', amount: 15000, mode: 'cheque', reference: 'CHQ-112233' },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-10-01', description: 'Exam Fee — Term 2', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2026-01-01', description: 'Exam Fee — Final', type: 'debit', category: 'exam', amount: 1500 },
  { date: '2026-01-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2026-02-01', description: 'Late Fee Penalty', type: 'debit', category: 'late_fee', amount: 500 },
]);

// stu-10: Ishita Verma — V — Primary (68,700) — partial, paid 51,500
seed('stu-10', [
  { date: '2025-04-01', description: 'Tuition Fee — Q1 (Apr-Jun)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-04-01', description: 'Annual Development Fund', type: 'debit', category: 'tuition', amount: 15000 },
  { date: '2025-04-01', description: 'Library Fee', type: 'debit', category: 'library', amount: 1200 },
  { date: '2025-04-01', description: 'Sports & Activities', type: 'debit', category: 'activity', amount: 2000 },
  { date: '2025-04-01', description: 'Smart Class Fee', type: 'debit', category: 'other', amount: 2500 },
  { date: '2025-04-18', description: 'Payment received — UPI', type: 'credit', category: 'payment', amount: 25000, mode: 'upi', reference: 'UPI-TXN-11234' },
  { date: '2025-07-01', description: 'Tuition Fee — Q2 (Jul-Sep)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-10-01', description: 'Tuition Fee — Q3 (Oct-Dec)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2025-11-15', description: 'Payment received — NEFT', type: 'credit', category: 'payment', amount: 26500, mode: 'neft', reference: 'NEFT-LKO-44567' },
  { date: '2026-01-01', description: 'Tuition Fee — Q4 (Jan-Mar)', type: 'debit', category: 'tuition', amount: 12000 },
  { date: '2026-03-01', description: 'Sibling Discount', type: 'credit', category: 'concession', amount: 1200, reference: 'CON-SIB' },
]);

// ═════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════

export const ledgerApi = {
  /** Returns summaries for all students that have ledger entries. */
  getLedgerSummaries: (): Promise<StudentLedgerSummary[]> => {
    const studentIds = [...new Set(entriesDb.map((e) => e.studentId))];
    const summaries = studentIds.map((sid) => {
      const info = studentInfo[sid];
      if (info) return buildSummary(sid, info.name, info.admissionNo, info.class, info.section);
      // Dynamically added students (from approvals) — derive from entries
      return buildSummary(sid, sid, '', '', '');
    }).filter((s): s is StudentLedgerSummary => s !== null);
    return delay(summaries);
  },

  /** Returns all ledger entries for a student, sorted by date ascending. */
  getStudentLedger: (studentId: string): Promise<LedgerEntry[]> => {
    const entries = entriesDb
      .filter((e) => e.studentId === studentId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    return delay([...entries]);
  },

  /** Add a new entry (payment, charge, concession, etc.) and recalculate balances. */
  createEntry: (dto: CreateLedgerEntryDto): Promise<LedgerEntry> => {
    const today = new Date().toISOString().split('T')[0];
    const entry: LedgerEntry = {
      id: nextId(),
      studentId: dto.studentId,
      date: today,
      description: dto.description,
      type: dto.type,
      category: dto.category,
      amount: dto.amount,
      mode: dto.mode,
      reference: dto.reference,
      balance: 0,
      remarks: dto.remarks,
      createdBy: 'admin',
    };
    entriesDb.push(entry);
    recalcBalances(dto.studentId);
    return delay(entry);
  },

  /**
   * Initialize a student's ledger from their fee structure.
   * Creates debit entries for each fee head with today's date.
   */
  initializeLedger: async (dto: InitializeLedgerDto): Promise<LedgerEntry[]> => {
    const structures = await feeApi.getStructures();
    const feeStructure = structures.find((s) => s.id === dto.feeStructureId);
    if (!feeStructure) return [];

    const today = new Date().toISOString().split('T')[0];
    const created: LedgerEntry[] = [];

    for (const head of feeStructure.heads) {
      const categoryMap: Record<string, LedgerEntry['category']> = {
        'Tuition Fee': 'tuition',
        'Annual Development Fund': 'tuition',
        'Transport Fee': 'transport',
        'Computer Lab Fee': 'lab',
        'Exam Fee': 'exam',
        'Library Fee': 'library',
        'Sports & Activities': 'activity',
        'Hostel Fee': 'hostel',
        'Smart Class Fee': 'other',
        'Uniform & Books': 'other',
      };

      const entry: LedgerEntry = {
        id: nextId(),
        studentId: dto.studentId,
        date: today,
        description: head.feeHeadName,
        type: 'debit',
        category: categoryMap[head.feeHeadName] || 'other',
        amount: head.amount,
        balance: 0,
        createdBy: 'system',
      };
      entriesDb.push(entry);
      created.push(entry);
    }

    recalcBalances(dto.studentId);

    // Update local studentInfo cache for newly admitted students
    // (The real backend wouldn't need this — it would query the students table)
    return delay(created.map((e) => ({ ...e, balance: entriesDb.find((x) => x.id === e.id)!.balance })));
  },

  /** Get balance summary for a student. */
  getStudentBalance: (studentId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }> => {
    const entries = entriesDb.filter((e) => e.studentId === studentId);
    const totalDue = entries.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
    return delay({ totalDue, totalPaid, balance: totalDue - totalPaid });
  },

  /**
   * Process a refund for a student who has overpaid.
   * Creates a debit entry with category 'refund' to reduce the negative balance.
   */
  processRefund: async (dto: RefundDto): Promise<LedgerEntry> => {
    // Validate the student has an overpayment
    const entries = entriesDb.filter((e) => e.studentId === dto.studentId);
    const totalDue = entries.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
    const totalPaid = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
    const balance = totalDue - totalPaid;

    if (balance >= 0) throw new Error('Student has no overpayment to refund');
    if (dto.amount > Math.abs(balance)) throw new Error('Refund amount exceeds overpayment');

    const today = new Date().toISOString().split('T')[0];
    const entry: LedgerEntry = {
      id: nextId(),
      studentId: dto.studentId,
      date: today,
      description: `Refund processed — ${dto.mode.toUpperCase()}`,
      type: 'debit',
      category: 'refund',
      amount: dto.amount,
      mode: dto.mode,
      reference: dto.reference,
      balance: 0,
      remarks: dto.reason,
      createdBy: 'admin',
    };
    entriesDb.push(entry);
    recalcBalances(dto.studentId);
    return delay(entry);
  },

  /** Register a dynamically admitted student's info for summary lookups. */
  registerStudentInfo: (studentId: string, name: string, admissionNo: string, cls: string, section: string) => {
    studentInfo[studentId] = { name, admissionNo, class: cls, section };
  },
};
