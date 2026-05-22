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
  transactionRef: string | null;
  status: string;
  receiptNumber: string | null;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  studentEnrollmentId: string;
  ledgerEntryId: string;
  amount: number;
  paymentMode: string;
  // Backend Joi rejects empty strings on these — omit when blank.
  // receiptNumber is also auto-generated server-side when omitted.
  transactionRef?: string;
  status: string;
  receiptNumber?: string;
  // ISO datetime, e.g. new Date().toISOString()
  paidAt: string;
}

// All fields optional — refund flow only sets `status` and `receiptNumber`,
// but the backend accepts any subset of CreatePaymentDto.
export type UpdatePaymentDto = Partial<CreatePaymentDto>;

export type PaymentMode = 'cash' | 'cheque' | 'upi' | 'neft' | 'dd' | 'card' | 'online';
