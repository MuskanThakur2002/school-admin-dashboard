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
  dueDate: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
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
