export type PaymentMode = 'cash' | 'cheque' | 'upi' | 'neft' | 'dd' | 'card' | 'online';
export type ReceiptStatus = 'confirmed' | 'bounced' | 'cancelled';
export type SettlementStatus = 'unsettled' | 'partial' | 'settled';

export interface Receipt {
  id: string;
  receiptNo: string;
  date: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  class: string;
  section: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  status: ReceiptStatus;
  remarks?: string;
  ledgerEntryId?: string;
  bouncedDate?: string;
  bounceReason?: string;
  cancelledDate?: string;
  cancelReason?: string;
  settlementStatus: SettlementStatus;
  settlementNotes: SettlementNote[];
}

export interface SettlementNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export interface PostPaymentDto {
  studentId: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  remarks?: string;
}

export interface BounceReceiptDto {
  receiptId: string;
  reason: string;
}

export interface CancelReceiptDto {
  receiptId: string;
  reason: string;
}

export interface AddSettlementNoteDto {
  receiptId: string;
  text: string;
}

export interface UpdateSettlementStatusDto {
  receiptId: string;
  status: SettlementStatus;
}
