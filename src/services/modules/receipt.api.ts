/**
 * Receipt API Layer
 * Backend-swap point — replace function bodies with fetch() calls.
 */
import type {
  Receipt,
  PostPaymentDto,
  BounceReceiptDto,
  CancelReceiptDto,
  AddSettlementNoteDto,
  UpdateSettlementStatusDto,
  PaymentMode,
  SettlementNote,
} from '@/types/receipt.types';
import { ledgerApi } from './ledger.api';
import { demoStudentsApi } from './students.api';

const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

// ─── Mock DB ──────────────────────────────────────────────
let receiptsDb: Receipt[] = [
  { id: 'rcp-1', receiptNo: 'RCP-2026-0451', date: '2026-04-10', studentId: 'stu-1', studentName: 'Arjun Patel', admissionNo: 'ADM-2025-001', class: 'VIII', section: 'A', amount: 25000, mode: 'neft', reference: 'NEFT-ICI-89012', status: 'confirmed', ledgerEntryId: 'le-14', settlementStatus: 'settled', settlementNotes: [{ id: 'sn-1', text: 'Settled against Q2 tuition fees', createdAt: '2026-04-10T14:30:00Z', createdBy: 'admin' }] },
  { id: 'rcp-2', receiptNo: 'RCP-2026-0450', date: '2026-04-08', studentId: 'stu-2', studentName: 'Priya Sharma', admissionNo: 'ADM-2025-002', class: 'VIII', section: 'A', amount: 21800, mode: 'upi', reference: 'UPI-TXN-45123', status: 'confirmed', settlementStatus: 'partial', settlementNotes: [{ id: 'sn-2', text: 'Partial payment — ₹3,200 remaining against transport fee', createdAt: '2026-04-08T16:00:00Z', createdBy: 'admin' }] },
  { id: 'rcp-3', receiptNo: 'RCP-2026-0449', date: '2026-04-07', studentId: 'stu-3', studentName: 'Rohan Gupta', admissionNo: 'ADM-2025-003', class: 'X', section: 'A', amount: 26625, mode: 'cheque', reference: 'CHQ-778901', status: 'bounced', bouncedDate: '2026-04-09', bounceReason: 'Insufficient funds', settlementStatus: 'unsettled', settlementNotes: [] },
  { id: 'rcp-4', receiptNo: 'RCP-2026-0448', date: '2026-04-05', studentId: 'stu-4', studentName: 'Ananya Iyer', admissionNo: 'ADM-2025-004', class: 'V', section: 'B', amount: 17175, mode: 'cash', reference: 'CASH-0448', status: 'confirmed', settlementStatus: 'settled', settlementNotes: [] },
  { id: 'rcp-5', receiptNo: 'RCP-2026-0447', date: '2026-04-04', studentId: 'stu-6', studentName: 'Meera Nair', admissionNo: 'ADM-2025-006', class: 'XII', section: 'A', amount: 30250, mode: 'neft', reference: 'NEFT-SBI-34521', status: 'confirmed', settlementStatus: 'unsettled', settlementNotes: [] },
  { id: 'rcp-6', receiptNo: 'RCP-2026-0446', date: '2026-04-03', studentId: 'stu-5', studentName: 'Kabir Singh', admissionNo: 'ADM-2025-005', class: 'VIII', section: 'B', amount: 21800, mode: 'cheque', reference: 'CHQ-556712', status: 'cancelled', cancelledDate: '2026-04-04', cancelReason: 'Duplicate payment', settlementStatus: 'unsettled', settlementNotes: [] },
  { id: 'rcp-7', receiptNo: 'RCP-2026-0445', date: '2026-04-02', studentId: 'stu-7', studentName: 'Dev Reddy', admissionNo: 'ADM-2025-007', class: 'II', section: 'A', amount: 68700, mode: 'neft', reference: 'NEFT-HDFC-90123', status: 'confirmed', settlementStatus: 'settled', settlementNotes: [{ id: 'sn-3', text: 'Full-year tuition settled in advance', createdAt: '2026-04-02T10:15:00Z', createdBy: 'admin' }] },
  { id: 'rcp-8', receiptNo: 'RCP-2026-0444', date: '2026-04-01', studentId: 'stu-8', studentName: 'Sneha Joshi', admissionNo: 'ADM-2024-089', class: 'X', section: 'B', amount: 26625, mode: 'upi', reference: 'UPI-TXN-78234', status: 'confirmed', settlementStatus: 'unsettled', settlementNotes: [] },
  { id: 'rcp-9', receiptNo: 'RCP-2026-0438', date: '2026-03-28', studentId: 'stu-9', studentName: 'Ravi Kumar', admissionNo: 'ADM-2023-045', class: 'XII', section: 'B', amount: 30250, mode: 'cheque', reference: 'CHQ-662301', status: 'bounced', bouncedDate: '2026-03-30', bounceReason: 'Signature mismatch', settlementStatus: 'unsettled', settlementNotes: [] },
  { id: 'rcp-10', receiptNo: 'RCP-2026-0435', date: '2026-03-25', studentId: 'stu-10', studentName: 'Ishita Verma', admissionNo: 'ADM-2022-112', class: 'V', section: 'A', amount: 17175, mode: 'dd', reference: 'DD-LKO-44321', status: 'confirmed', settlementStatus: 'settled', settlementNotes: [] },
];

let receiptCounter = 451;
const nextReceiptNo = () => `RCP-2026-${String(++receiptCounter).padStart(4, '0')}`;

let idCounter = 10;
const nextId = () => `rcp-${++idCounter}`;

let noteCounter = 3;
const nextNoteId = () => `sn-${++noteCounter}`;

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
    const student = await demoStudentsApi.getStudent(dto.studentId);
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
      settlementStatus: 'unsettled',
      settlementNotes: [],
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

  /**
   * Add a settlement note to a receipt.
   */
  addSettlementNote: async (dto: AddSettlementNoteDto): Promise<Receipt> => {
    const idx = receiptsDb.findIndex((r) => r.id === dto.receiptId);
    if (idx === -1) throw new Error('Receipt not found');

    const note: SettlementNote = {
      id: nextNoteId(),
      text: dto.text,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
    };

    receiptsDb[idx] = {
      ...receiptsDb[idx],
      settlementNotes: [...receiptsDb[idx].settlementNotes, note],
    };

    return delay(receiptsDb[idx]);
  },

  /**
   * Update the settlement status of a receipt (unsettled / partial / settled).
   */
  updateSettlementStatus: async (dto: UpdateSettlementStatusDto): Promise<Receipt> => {
    const idx = receiptsDb.findIndex((r) => r.id === dto.receiptId);
    if (idx === -1) throw new Error('Receipt not found');

    receiptsDb[idx] = {
      ...receiptsDb[idx],
      settlementStatus: dto.status,
    };

    return delay(receiptsDb[idx]);
  },
};
