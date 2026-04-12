/**
 * Receipt API Layer
 * Backend-swap point — replace function bodies with fetch() calls.
 */
import type {
  Receipt,
  PostPaymentDto,
  BounceReceiptDto,
  CancelReceiptDto,
  PaymentMode,
} from '@/types/receipt.types';
import { ledgerApi } from './ledger.api';
import { studentsApi } from './students.api';

const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

// ─── Mock DB ──────────────────────────────────────────────
let receiptsDb: Receipt[] = [
  { id: 'rcp-1', receiptNo: 'RCP-2026-0451', date: '2026-04-10', studentId: 'stu-1', studentName: 'Arjun Patel', admissionNo: 'ADM-2025-001', class: 'VIII', section: 'A', amount: 25000, mode: 'neft', reference: 'NEFT-ICI-89012', status: 'confirmed', ledgerEntryId: 'le-14' },
  { id: 'rcp-2', receiptNo: 'RCP-2026-0450', date: '2026-04-08', studentId: 'stu-2', studentName: 'Priya Sharma', admissionNo: 'ADM-2025-002', class: 'VIII', section: 'A', amount: 21800, mode: 'upi', reference: 'UPI-TXN-45123', status: 'confirmed' },
  { id: 'rcp-3', receiptNo: 'RCP-2026-0449', date: '2026-04-07', studentId: 'stu-3', studentName: 'Rohan Gupta', admissionNo: 'ADM-2025-003', class: 'X', section: 'A', amount: 26625, mode: 'cheque', reference: 'CHQ-778901', status: 'bounced', bouncedDate: '2026-04-09', bounceReason: 'Insufficient funds' },
  { id: 'rcp-4', receiptNo: 'RCP-2026-0448', date: '2026-04-05', studentId: 'stu-4', studentName: 'Ananya Iyer', admissionNo: 'ADM-2025-004', class: 'V', section: 'B', amount: 17175, mode: 'cash', reference: 'CASH-0448', status: 'confirmed' },
  { id: 'rcp-5', receiptNo: 'RCP-2026-0447', date: '2026-04-04', studentId: 'stu-6', studentName: 'Meera Nair', admissionNo: 'ADM-2025-006', class: 'XII', section: 'A', amount: 30250, mode: 'neft', reference: 'NEFT-SBI-34521', status: 'confirmed' },
  { id: 'rcp-6', receiptNo: 'RCP-2026-0446', date: '2026-04-03', studentId: 'stu-5', studentName: 'Kabir Singh', admissionNo: 'ADM-2025-005', class: 'VIII', section: 'B', amount: 21800, mode: 'cheque', reference: 'CHQ-556712', status: 'cancelled', cancelledDate: '2026-04-04', cancelReason: 'Duplicate payment' },
  { id: 'rcp-7', receiptNo: 'RCP-2026-0445', date: '2026-04-02', studentId: 'stu-7', studentName: 'Dev Reddy', admissionNo: 'ADM-2025-007', class: 'II', section: 'A', amount: 68700, mode: 'neft', reference: 'NEFT-HDFC-90123', status: 'confirmed' },
  { id: 'rcp-8', receiptNo: 'RCP-2026-0444', date: '2026-04-01', studentId: 'stu-8', studentName: 'Sneha Joshi', admissionNo: 'ADM-2024-089', class: 'X', section: 'B', amount: 26625, mode: 'upi', reference: 'UPI-TXN-78234', status: 'confirmed' },
  { id: 'rcp-9', receiptNo: 'RCP-2026-0438', date: '2026-03-28', studentId: 'stu-9', studentName: 'Ravi Kumar', admissionNo: 'ADM-2023-045', class: 'XII', section: 'B', amount: 30250, mode: 'cheque', reference: 'CHQ-662301', status: 'bounced', bouncedDate: '2026-03-30', bounceReason: 'Signature mismatch' },
  { id: 'rcp-10', receiptNo: 'RCP-2026-0435', date: '2026-03-25', studentId: 'stu-10', studentName: 'Ishita Verma', admissionNo: 'ADM-2022-112', class: 'V', section: 'A', amount: 17175, mode: 'dd', reference: 'DD-LKO-44321', status: 'confirmed' },
];

let receiptCounter = 451;
const nextReceiptNo = () => `RCP-2026-${String(++receiptCounter).padStart(4, '0')}`;

let idCounter = 10;
const nextId = () => `rcp-${++idCounter}`;

const modeLabel: Record<PaymentMode, string> = {
  cash: 'Cash', cheque: 'Cheque', upi: 'UPI', neft: 'NEFT', dd: 'DD', card: 'Card', online: 'Online',
};

// ═════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════

export const receiptApi = {
  /** Returns all receipts. */
  getReceipts: (): Promise<Receipt[]> => delay([...receiptsDb]),

  /**
   * Post a payment: creates a confirmed Receipt AND a credit entry in the ledger.
   */
  postPayment: async (dto: PostPaymentDto): Promise<Receipt> => {
    const student = await studentsApi.getStudent(dto.studentId);
    const today = new Date().toISOString().split('T')[0];
    const receiptNo = nextReceiptNo();

    // Create ledger credit entry
    const ledgerEntry = await ledgerApi.createEntry({
      studentId: dto.studentId,
      description: `Payment received — ${modeLabel[dto.mode]}`,
      type: 'credit',
      category: 'payment',
      amount: dto.amount,
      mode: dto.mode,
      reference: dto.reference,
      remarks: dto.remarks,
    });

    const receipt: Receipt = {
      id: nextId(),
      receiptNo,
      date: today,
      studentId: dto.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      class: student.class,
      section: student.section,
      amount: dto.amount,
      mode: dto.mode,
      reference: dto.reference,
      status: 'confirmed',
      remarks: dto.remarks,
      ledgerEntryId: ledgerEntry.id,
    };

    receiptsDb = [receipt, ...receiptsDb];
    return delay(receipt);
  },

  /**
   * Mark a receipt as bounced and create a reversal debit entry in the ledger.
   */
  bounceReceipt: async (dto: BounceReceiptDto): Promise<Receipt> => {
    const idx = receiptsDb.findIndex((r) => r.id === dto.receiptId);
    if (idx === -1) throw new Error('Receipt not found');

    const receipt = receiptsDb[idx];
    const today = new Date().toISOString().split('T')[0];

    // Create reversal debit entry
    await ledgerApi.createEntry({
      studentId: receipt.studentId,
      description: `Bounced cheque reversal — ${receipt.receiptNo}`,
      type: 'debit',
      category: 'other',
      amount: receipt.amount,
      reference: receipt.reference,
    });

    receiptsDb[idx] = {
      ...receipt,
      status: 'bounced',
      bouncedDate: today,
      bounceReason: dto.reason,
    };

    return delay(receiptsDb[idx]);
  },

  /**
   * Cancel a receipt and create a reversal debit entry in the ledger.
   */
  cancelReceipt: async (dto: CancelReceiptDto): Promise<Receipt> => {
    const idx = receiptsDb.findIndex((r) => r.id === dto.receiptId);
    if (idx === -1) throw new Error('Receipt not found');

    const receipt = receiptsDb[idx];
    const today = new Date().toISOString().split('T')[0];

    // Create reversal debit entry
    await ledgerApi.createEntry({
      studentId: receipt.studentId,
      description: `Cancelled receipt reversal — ${receipt.receiptNo}`,
      type: 'debit',
      category: 'other',
      amount: receipt.amount,
      reference: receipt.reference,
    });

    receiptsDb[idx] = {
      ...receipt,
      status: 'cancelled',
      cancelledDate: today,
      cancelReason: dto.reason,
    };

    return delay(receiptsDb[idx]);
  },

  /**
   * Resolve a bounced receipt — marks it back as confirmed.
   */
  resolveBouncedReceipt: async (receiptId: string): Promise<Receipt> => {
    const idx = receiptsDb.findIndex((r) => r.id === receiptId);
    if (idx === -1) throw new Error('Receipt not found');

    receiptsDb[idx] = {
      ...receiptsDb[idx],
      status: 'confirmed',
      bouncedDate: undefined,
      bounceReason: undefined,
    };

    return delay(receiptsDb[idx]);
  },
};
