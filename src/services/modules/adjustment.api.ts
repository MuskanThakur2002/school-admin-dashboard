/**
 * Manual Adjustment API — backend-swap point
 * Posts debit or credit adjustments directly to student ledgers with full audit trail.
 */
import { ledgerApi } from './ledger.api';
import { studentsApi } from './students.api';

const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

export type AdjustmentReason =
  | 'fee_correction'
  | 'overcharge_reversal'
  | 'goodwill_credit'
  | 'penalty_waiver'
  | 'rounding_difference'
  | 'duplicate_charge'
  | 'other';

export interface Adjustment {
  id: string;
  date: string;
  type: 'debit' | 'credit';
  reason: AdjustmentReason;
  description: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  class: string;
  amount: number;
  remarks: string;
  postedBy: string;
  ledgerEntryId?: string;
}

export interface PostAdjustmentDto {
  studentId: string;
  type: 'debit' | 'credit';
  reason: AdjustmentReason;
  description: string;
  amount: number;
  remarks: string;
}

// Mock DB — seed some entries
let adjustmentsDb: Adjustment[] = [
  { id: 'adj-1', date: '2026-04-12', type: 'credit', reason: 'overcharge_reversal', description: 'Tuition Fee overcharge Q3 — reversed', studentId: 'stu-1', studentName: 'Arjun Patel', admissionNo: 'ADM-2025-001', class: 'VIII-A', amount: 2000, remarks: 'Billed at senior rate instead of middle school rate', postedBy: 'Accounts' },
  { id: 'adj-2', date: '2026-04-11', type: 'credit', reason: 'penalty_waiver', description: 'Late fee penalty waived — medical emergency', studentId: 'stu-3', studentName: 'Rohan Gupta', admissionNo: 'ADM-2025-003', class: 'X-A', amount: 500, remarks: 'Medical certificate submitted — hospitalization during due period', postedBy: 'Principal' },
  { id: 'adj-3', date: '2026-04-10', type: 'debit', reason: 'fee_correction', description: 'Lab fee not applied during admission', studentId: 'stu-7', studentName: 'Dev Reddy', admissionNo: 'ADM-2025-007', class: 'II-A', amount: 1500, remarks: 'Computer Lab Fee missed in initial structure mapping', postedBy: 'Accounts' },
  { id: 'adj-4', date: '2026-04-09', type: 'credit', reason: 'duplicate_charge', description: 'Duplicate exam fee charge — Term 2', studentId: 'stu-5', studentName: 'Kabir Singh', admissionNo: 'ADM-2025-005', class: 'VIII-B', amount: 1500, remarks: 'System posted exam fee twice during batch processing', postedBy: 'Accounts' },
  { id: 'adj-5', date: '2026-04-07', type: 'credit', reason: 'goodwill_credit', description: 'Goodwill credit — sibling enrolment incentive', studentId: 'stu-10', studentName: 'Ishita Verma', admissionNo: 'ADM-2022-112', class: 'V-A', amount: 3000, remarks: 'Younger sibling enrolled this session — one-time credit as per policy', postedBy: 'Admin' },
  { id: 'adj-6', date: '2026-04-05', type: 'credit', reason: 'rounding_difference', description: 'Rounding adjustment on annual fee calculation', studentId: 'stu-6', studentName: 'Meera Nair', admissionNo: 'ADM-2025-006', class: 'XII-A', amount: 200, remarks: 'Fee structure total ₹1,21,200 but billed ₹1,21,000 — adjusting ₹200', postedBy: 'Accounts' },
  { id: 'adj-7', date: '2026-04-03', type: 'debit', reason: 'other', description: 'Security deposit — new hostel admission', studentId: 'stu-9', studentName: 'Ravi Kumar', admissionNo: 'ADM-2023-045', class: 'XII-B', amount: 5000, remarks: 'Hostel security deposit not covered under fee structure', postedBy: 'Hostel Warden' },
];

export const adjustmentApi = {
  getAdjustments: (): Promise<Adjustment[]> => delay([...adjustmentsDb]),

  postAdjustment: async (dto: PostAdjustmentDto): Promise<Adjustment> => {
    // Look up student
    const student = await studentsApi.getStudent(dto.studentId);
    const today = new Date().toISOString().split('T')[0];

    // Post entry to ledger with 'adjustment' category
    const ledgerEntry = await ledgerApi.createEntry({
      studentId: dto.studentId,
      description: dto.description,
      type: dto.type,
      category: 'adjustment',
      amount: dto.amount,
      remarks: dto.remarks,
    });

    const adjustment: Adjustment = {
      id: crypto.randomUUID(),
      date: today,
      type: dto.type,
      reason: dto.reason,
      description: dto.description,
      studentId: dto.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      class: `${student.class}-${student.section}`,
      amount: dto.amount,
      remarks: dto.remarks,
      postedBy: 'Admin',
      ledgerEntryId: ledgerEntry.id,
    };
    adjustmentsDb = [adjustment, ...adjustmentsDb];
    return delay(adjustment);
  },
};
