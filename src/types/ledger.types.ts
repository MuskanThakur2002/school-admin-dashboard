export interface LedgerEntry {
  id: string;
  studentId: string;
  date: string;
  description: string;
  type: 'debit' | 'credit';
  category: 'tuition' | 'transport' | 'exam' | 'lab' | 'library' | 'activity' | 'hostel' | 'other' | 'payment' | 'concession' | 'late_fee' | 'refund';
  amount: number;
  mode?: string; // 'cash' | 'cheque' | 'upi' | 'neft' | 'dd'
  reference?: string;
  balance: number; // running balance after this entry
  remarks?: string;
  createdBy: string;
}

export interface StudentLedgerSummary {
  studentId: string;
  studentName: string;
  admissionNo: string;
  class: string;
  section: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  lastPaymentDate: string;
  status: 'clear' | 'partial' | 'overdue';
}

export interface CreateLedgerEntryDto {
  studentId: string;
  description: string;
  type: 'debit' | 'credit';
  category: LedgerEntry['category'];
  amount: number;
  mode?: string;
  reference?: string;
  remarks?: string;
}

export interface InitializeLedgerDto {
  studentId: string;
  feeStructureId: string;
}
