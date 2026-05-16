// ─── Payment ────────────────────────────────────────────────
// Backend shape from /schools/:schoolId/payments. `amount` arrives as a
// decimal string; coerce with Number() before doing math. A Payment must
// reference an existing Debit ledger entry via `ledgerEntryId`.

export interface Payment {
  id: string;
  studentEnrollmentId: string;
  ledgerEntryId: string;
  amount: string;
  paymentMode: string;
  transactionRef: string;
  status: string;
  receiptNumber: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  studentEnrollmentId: string;
  ledgerEntryId: string;
  amount: number;
  paymentMode: string;
  transactionRef: string;
  status: string;
  receiptNumber: string;
  // ISO datetime, e.g. new Date().toISOString()
  paidAt: string;
}

export type PaymentMode = 'cash' | 'cheque' | 'upi' | 'neft' | 'dd' | 'card' | 'online';
