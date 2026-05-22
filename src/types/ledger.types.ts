// ─── Ledger Entry ──────────────────────────────────────────
// Backend shape from /schools/:schoolId/ledgers. `amount` and
// `runningBalance` come back as decimal strings — coerce with
// Number() before doing math. `entryType` is capitalized.

export type LedgerEntryType = 'Debit' | 'Credit';

export interface LedgerEntry {
  id: string;
  studentEnrollmentId: string;
  academicYearId: string;
  entryType: LedgerEntryType;
  category: string;
  amount: string;
  runningBalance: string;
  reference: string;
  paymentMode: string;
  remarks: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerEntryDto {
  studentEnrollmentId: string;
  academicYearId: string;
  entryType: LedgerEntryType;
  category: string;
  amount: number;
  // We send 0; the backend recomputes the real running balance.
  runningBalance: number;
  reference: string;
  paymentMode: string;
  remarks: string;
  createdById: string;
}

export type UpdateLedgerEntryDto = Partial<Omit<CreateLedgerEntryDto, 'createdById'>>;

// ─── UI-Derived Summary ────────────────────────────────────
// The backend has no summary endpoint — this is computed client-side
// from the ledger entries list grouped by studentEnrollmentId.
export type LedgerStatus = 'clear' | 'unpaid' | 'partial' | 'overdue' | 'overpaid';

export interface StudentLedgerSummary {
  studentEnrollmentId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  class: string;
  section: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  // Date of the most recent Credit entry (i.e. last time the student paid).
  // Empty string when the student has never paid.
  lastPaymentDate: string;
  // Date of the most recent ledger entry of any type — useful for surfacing
  // freshly-billed students (who have no payment yet) in the list view.
  lastActivityDate: string;
  status: LedgerStatus;
  overpaymentAmount: number;
}
