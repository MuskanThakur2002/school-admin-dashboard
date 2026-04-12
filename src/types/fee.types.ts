// ─── Fee Head ──────────────────────────────────────────────
export type FeeCategory = 'tuition' | 'transport' | 'hostel' | 'exam' | 'activity' | 'lab' | 'library' | 'other';
export type FeeFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  type: 'recurring' | 'one_time';
  category: FeeCategory;
  amount: number;
  frequency?: FeeFrequency;
  taxable: boolean;
  enabled: boolean;
}

export interface CreateFeeHeadDto {
  name: string;
  code: string;
  type: FeeHead['type'];
  category: FeeCategory;
  amount: number;
  frequency?: FeeFrequency;
  taxable: boolean;
}

// ─── Fee Structure ─────────────────────────────────────────
export interface FeeStructureHead {
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
}

export interface FeeStructure {
  id: string;
  name: string;
  academicYear: string;
  classes: string[];
  heads: FeeStructureHead[];
  totalAmount: number;
  studentCount: number;
  status: 'active' | 'draft';
}

export interface CreateFeeStructureDto {
  name: string;
  academicYear: string;
  classes: string[];
  headIds: string[];
  status: 'active' | 'draft';
}

// ─── Installment Plan ──────────────────────────────────────
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
