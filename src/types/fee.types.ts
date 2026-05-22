// ─── Fee Head ──────────────────────────────────────────────
// Backend shape: { id, schoolId, name, createdAt, updatedAt }

export interface FeeHead {
  id: string;
  schoolId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeHeadDto {
  name: string;
}

export interface UpdateFeeHeadDto {
  name: string;
}

// ─── Fee Structure ─────────────────────────────────────────
// Backend shape: { id, schoolId, academicYearId, name, createdAt, updatedAt,
//                  feeStructureItems: [...], feeInstallments: [...] }

export interface FeeStructureItem {
  id: string;
  feeStructureId: string;
  feeHeadId: string;
  // Decimal-as-string from the backend. Use Number(item.amount) for math.
  amount: string;
  createdAt: string;
  updatedAt: string;
  feeHead?: FeeHead;
}

export interface FeeInstallment {
  id: string;
  feeStructureId: string;
  // Backend returns date-only ("YYYY-MM-DD"). On write, send full ISO datetime.
  dueDate: string;
  // POST returns string ("0"), PUT returns number (2000). Coerce with Number().
  amount: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeeInstallmentDto {
  feeStructureId: string;
  dueDate: string;
  amount: number;
}

export interface UpdateFeeInstallmentDto {
  feeStructureId?: string;
  dueDate?: string;
  amount?: number;
}

// ─── Fee Assignment ────────────────────────────────────────
// Bridge between a StudentEnrollment and a FeeStructure, with per-student
// concession/scholarship. Backend returns concessionPercent/scholarshipAmount
// as string from POST but number from PUT — coerce with Number() on read.

export interface FeeAssignment {
  id: string;
  studentEnrollmentId: string;
  feeStructureId: string;
  concessionPercent: string | number;
  scholarshipAmount: string | number;
  createdAt: string;
  updatedAt: string;
  feeStructure?: FeeStructure;
}

export interface CreateFeeAssignmentDto {
  studentEnrollmentId: string;
  feeStructureId: string;
  concessionPercent: number;
  scholarshipAmount: number;
}

export interface UpdateFeeAssignmentDto {
  studentEnrollmentId?: string;
  feeStructureId?: string;
  concessionPercent?: number;
  scholarshipAmount?: number;
}

// Bulk-assign one fee structure to every enrollment under either a single
// class section or every section of a class master for an academic year.
// Backend route: POST /schools/:schoolId/fee-assignments/bulk-class — must
// provide exactly one of `classSectionId` or `classMasterId`.
export type BulkClassAssignmentDto =
  | {
      classSectionId: string;
      classMasterId?: never;
      academicYearId: string;
      feeStructureId: string;
    }
  | {
      classMasterId: string;
      classSectionId?: never;
      academicYearId: string;
      feeStructureId: string;
    };

export interface BulkClassAssignmentResult {
  created: number;
  assignments: FeeAssignment[];
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  feeStructureItems: FeeStructureItem[];
  feeInstallments: FeeInstallment[];
}

export interface CreateFeeStructureDto {
  academicYearId: string;
  name: string;
}

export interface UpdateFeeStructureDto {
  academicYearId?: string;
  name?: string;
}

export interface CreateFeeStructureItemDto {
  feeStructureId: string;
  feeHeadId: string;
  amount: number;
}

export interface UpdateFeeStructureItemDto {
  amount: number;
}

// ─── Installment Plan ──────────────────────────────────────
// UI-only model used by the mock InstallmentPlanPage. Distinct from the
// per-structure `FeeInstallment` rows that live on the backend.
export interface Installment {
  id: string;
  label: string;
  dueDate: string;
  percentage: number;
  amount: number;
}

export interface InstallmentPlan {
  id: string;
  name: string;
  description: string;
  installments: { label: string; dueDate: string; percentage: number }[];
  linkedStructures: string[];
  isDefault: boolean;
}

export interface CreateInstallmentPlanDto {
  name: string;
  description: string;
  installments: { label: string; dueDate: string; percentage: number }[];
  linkedStructures: string[];
  isDefault: boolean;
}

// ─── Concession ────────────────────────────────────────────
// UI-only — backend models this as two scalars on FeeAssignment.
export interface Concession {
  id: string;
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  applicableTo: string;
  feeHeadIds: string[];
  studentCount: number;
  reason: string;
}

export interface CreateConcessionDto {
  name: string;
  type: 'percentage' | 'flat';
  value: number;
  applicableTo?: string;
  reason: string;
}

// ─── Late Fee Rule ─────────────────────────────────────────
// UI-only — no backend endpoint exists.
export type PenaltyType = 'flat' | 'percentage' | 'per_day';

export interface LateFeeRule {
  id: string;
  name: string;
  graceDays: number;
  penaltyType: PenaltyType;
  penaltyValue: number;
  maxPenalty?: number;
  enabled: boolean;
}

export interface CreateLateFeeRuleDto {
  name: string;
  graceDays: number;
  penaltyType: PenaltyType;
  penaltyValue: number;
  maxPenalty?: number;
}
