/**
 * Fee Engine API Layer
 *
 * Heads, Structures, and Structure Items are wired to the real backend.
 * Installment Plans, Concessions, and Late-fee Rules remain on in-memory
 * mocks pending Phase 2 (those pages will be hidden in the sidebar).
 */
import { api } from '@/services/api-client';
import { format } from 'date-fns';
import type {
  FeeHead, FeeStructure, FeeStructureItem, FeeInstallment, FeeAssignment,
  CreateFeeHeadDto, UpdateFeeHeadDto,
  CreateFeeStructureDto, UpdateFeeStructureDto,
  CreateFeeStructureItemDto, UpdateFeeStructureItemDto,
  CreateFeeInstallmentDto, UpdateFeeInstallmentDto,
  CreateFeeAssignmentDto, UpdateFeeAssignmentDto,
  BulkClassAssignmentDto, BulkClassAssignmentResult,
  InstallmentPlan, Concession, LateFeeRule,
  CreateInstallmentPlanDto, CreateConcessionDto, CreateLateFeeRuleDto,
} from '@/types/fee.types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FeeStructureItemListParams extends PaginationParams {
  feeStructureId?: string;
}

export interface FeeInstallmentListParams extends PaginationParams {
  feeStructureId?: string;
}

export interface FeeAssignmentListParams extends PaginationParams {
  studentEnrollmentId?: string;
  feeStructureId?: string;
}

/**
 * Backend accepts full ISO datetime on POST/PUT but normalizes the response
 * to a date-only string ("YYYY-MM-DD"). If a date-only string is supplied,
 * we expand to UTC midnight before sending; ISO strings pass through.
 */
function toIsoDueDate(value: string): string {
  if (!value) return value;
  if (value.includes('T')) return value;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function buildQuery(params?: object): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ═════════════════════════════════════════════════════════════
// REAL BACKEND — Heads, Structures, Items
// ═════════════════════════════════════════════════════════════

// ─── Mock DBs (Phase 2 features still on mocks) ──────────────
const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

let plansDb: InstallmentPlan[] = [
  { id: 'ip1', name: 'Quarterly Plan', description: '4 equal quarterly installments', installments: [
    { label: 'Q1 — Apr-Jun', dueDate: '2025-04-15', percentage: 25 }, { label: 'Q2 — Jul-Sep', dueDate: '2025-07-15', percentage: 25 },
    { label: 'Q3 — Oct-Dec', dueDate: '2025-10-15', percentage: 25 }, { label: 'Q4 — Jan-Mar', dueDate: '2026-01-15', percentage: 25 },
  ], linkedStructures: ['Primary (I–V)', 'Middle (VI–VIII)', 'Sr. Secondary (IX–X)'], isDefault: true },
  { id: 'ip2', name: 'Half-yearly Plan', description: '2 equal half-yearly installments', installments: [
    { label: 'H1 — Apr-Sep', dueDate: '2025-04-15', percentage: 50 }, { label: 'H2 — Oct-Mar', dueDate: '2025-10-15', percentage: 50 },
  ], linkedStructures: ['Primary (I–V)', 'Middle (VI–VIII)'], isDefault: false },
  { id: 'ip3', name: 'Annual Plan (5% Discount)', description: 'Full upfront with 5% discount', installments: [
    { label: 'Full Year', dueDate: '2025-04-15', percentage: 100 },
  ], linkedStructures: ['All Structures'], isDefault: false },
  { id: 'ip4', name: 'Monthly Plan', description: '12 monthly installments', installments: Array.from({ length: 12 }, (_, i) => ({
    label: format(new Date(2025, 3 + i, 1), 'MMM yyyy'), dueDate: format(new Date(2025, 3 + i, 10), 'yyyy-MM-dd'), percentage: parseFloat((100 / 12).toFixed(2)),
  })), linkedStructures: ['All Structures'], isDefault: false },
];

let concessionsDb: Concession[] = [
  { id: 'cn1', name: 'Sibling Discount', type: 'percentage', value: 10, applicableTo: 'Tuition Fee', feeHeadIds: ['fh1'], studentCount: 45, reason: 'Discount for second child and onwards' },
  { id: 'cn2', name: 'Merit Scholarship', type: 'percentage', value: 25, applicableTo: 'All Fee Heads', feeHeadIds: [], studentCount: 12, reason: 'Students with 95%+ in previous year' },
  { id: 'cn3', name: 'Staff Ward', type: 'percentage', value: 50, applicableTo: 'Tuition Fee', feeHeadIds: ['fh1'], studentCount: 8, reason: 'Children of school staff members' },
  { id: 'cn4', name: 'EWS Concession', type: 'percentage', value: 100, applicableTo: 'All Fee Heads', feeHeadIds: [], studentCount: 25, reason: 'Economically weaker section quota' },
  { id: 'cn5', name: 'Sports Excellence', type: 'flat', value: 15000, applicableTo: 'Annual Dev Fund', feeHeadIds: ['fh2'], studentCount: 6, reason: 'National/state level sports achievement' },
  { id: 'cn6', name: 'Early Bird Discount', type: 'flat', value: 5000, applicableTo: 'Tuition Fee', feeHeadIds: ['fh1'], studentCount: 120, reason: 'Payment before April 15 deadline' },
];

let lateRulesDb: LateFeeRule[] = [
  { id: 'lr1', name: 'Standard Late Fee', graceDays: 7, penaltyType: 'flat', penaltyValue: 500, maxPenalty: undefined, enabled: true },
  { id: 'lr2', name: 'Extended Overdue', graceDays: 30, penaltyType: 'percentage', penaltyValue: 2, maxPenalty: 5000, enabled: true },
  { id: 'lr3', name: 'Per-Day Penalty', graceDays: 15, penaltyType: 'per_day', penaltyValue: 50, maxPenalty: 3000, enabled: false },
];

// ═════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════

export const feeApi = {
  // ─── Fee Heads (real backend) ───────────────────────────
  /** GET /schools/:schoolId/fee-heads */
  listHeads: async (schoolId: string, params?: PaginationParams) => {
    const res = await api.get<PaginatedEnvelope<FeeHead>>(
      `/schools/${schoolId}/fee-heads${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/fee-heads/:id */
  getHead: async (schoolId: string, id: string): Promise<FeeHead> => {
    const res = await api.get<ApiEnvelope<FeeHead>>(`/schools/${schoolId}/fee-heads/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/fee-heads */
  createHead: async (schoolId: string, body: CreateFeeHeadDto): Promise<FeeHead> => {
    const res = await api.post<ApiEnvelope<FeeHead>>(
      `/schools/${schoolId}/fee-heads`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/fee-heads/:id */
  updateHead: async (schoolId: string, id: string, body: UpdateFeeHeadDto): Promise<FeeHead> => {
    const res = await api.put<ApiEnvelope<FeeHead>>(
      `/schools/${schoolId}/fee-heads/${id}`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/fee-heads/:id */
  deleteHead: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/fee-heads/${id}`);
  },

  // ─── Fee Structures (real backend) ──────────────────────
  // Backend sometimes omits feeStructureItems/feeInstallments on the structure
  // payload even though the type says they're required arrays. Normalizing
  // here keeps every consumer's .map/.find/.length safe.
  /** GET /schools/:schoolId/fee-structures */
  listStructures: async (schoolId: string, params?: PaginationParams) => {
    const res = await api.get<PaginatedEnvelope<FeeStructure>>(
      `/schools/${schoolId}/fee-structures${buildQuery(params)}`,
    );
    return {
      data: res.data.map((s) => ({
        ...s,
        feeStructureItems: s.feeStructureItems ?? [],
        feeInstallments: s.feeInstallments ?? [],
      })),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  },

  /** GET /schools/:schoolId/fee-structures/:id */
  getStructure: async (schoolId: string, id: string): Promise<FeeStructure> => {
    const res = await api.get<ApiEnvelope<FeeStructure>>(`/schools/${schoolId}/fee-structures/${id}`);
    return {
      ...res.data,
      feeStructureItems: res.data.feeStructureItems ?? [],
      feeInstallments: res.data.feeInstallments ?? [],
    };
  },

  /** POST /schools/:schoolId/fee-structures */
  createStructure: async (schoolId: string, body: CreateFeeStructureDto): Promise<FeeStructure> => {
    const res = await api.post<ApiEnvelope<FeeStructure>>(
      `/schools/${schoolId}/fee-structures`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/fee-structures/:id */
  updateStructure: async (
    schoolId: string,
    id: string,
    body: UpdateFeeStructureDto,
  ): Promise<FeeStructure> => {
    const res = await api.put<ApiEnvelope<FeeStructure>>(
      `/schools/${schoolId}/fee-structures/${id}`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/fee-structures/:id */
  deleteStructure: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/fee-structures/${id}`);
  },

  // ─── Fee Structure Items (real backend) ─────────────────
  /** GET /schools/:schoolId/fee-structure-items */
  listItems: async (schoolId: string, params?: FeeStructureItemListParams) => {
    const res = await api.get<PaginatedEnvelope<FeeStructureItem>>(
      `/schools/${schoolId}/fee-structure-items${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/fee-structure-items/:id */
  getItem: async (schoolId: string, id: string): Promise<FeeStructureItem> => {
    const res = await api.get<ApiEnvelope<FeeStructureItem>>(
      `/schools/${schoolId}/fee-structure-items/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/fee-structure-items */
  createItem: async (
    schoolId: string,
    body: CreateFeeStructureItemDto,
  ): Promise<FeeStructureItem> => {
    const res = await api.post<ApiEnvelope<FeeStructureItem>>(
      `/schools/${schoolId}/fee-structure-items`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/fee-structure-items/:id */
  updateItem: async (
    schoolId: string,
    id: string,
    body: UpdateFeeStructureItemDto,
  ): Promise<FeeStructureItem> => {
    const res = await api.put<ApiEnvelope<FeeStructureItem>>(
      `/schools/${schoolId}/fee-structure-items/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/fee-structure-items/:id */
  deleteItem: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/fee-structure-items/${id}`);
  },

  // ─── Fee Installments (real backend) ────────────────────
  /** GET /schools/:schoolId/fee-installments */
  listInstallments: async (schoolId: string, params?: FeeInstallmentListParams) => {
    const res = await api.get<PaginatedEnvelope<FeeInstallment>>(
      `/schools/${schoolId}/fee-installments${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/fee-installments/:id */
  getInstallment: async (schoolId: string, id: string): Promise<FeeInstallment> => {
    const res = await api.get<ApiEnvelope<FeeInstallment>>(
      `/schools/${schoolId}/fee-installments/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/fee-installments */
  createInstallment: async (
    schoolId: string,
    body: CreateFeeInstallmentDto,
  ): Promise<FeeInstallment> => {
    const res = await api.post<ApiEnvelope<FeeInstallment>>(
      `/schools/${schoolId}/fee-installments`,
      { schoolId, ...body, dueDate: toIsoDueDate(body.dueDate) },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/fee-installments/:id */
  updateInstallment: async (
    schoolId: string,
    id: string,
    body: UpdateFeeInstallmentDto,
  ): Promise<FeeInstallment> => {
    const payload = { schoolId, ...body };
    if (payload.dueDate) payload.dueDate = toIsoDueDate(payload.dueDate);
    const res = await api.put<ApiEnvelope<FeeInstallment>>(
      `/schools/${schoolId}/fee-installments/${id}`,
      payload,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/fee-installments/:id */
  deleteInstallment: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/fee-installments/${id}`);
  },

  // ─── Fee Assignments (real backend) ─────────────────────
  /** GET /schools/:schoolId/fee-assignments */
  listAssignments: async (schoolId: string, params?: FeeAssignmentListParams) => {
    const res = await api.get<PaginatedEnvelope<FeeAssignment>>(
      `/schools/${schoolId}/fee-assignments${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/fee-assignments/:id */
  getAssignment: async (schoolId: string, id: string): Promise<FeeAssignment> => {
    const res = await api.get<ApiEnvelope<FeeAssignment>>(
      `/schools/${schoolId}/fee-assignments/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/fee-assignments */
  createAssignment: async (
    schoolId: string,
    body: CreateFeeAssignmentDto,
  ): Promise<FeeAssignment> => {
    const res = await api.post<ApiEnvelope<FeeAssignment>>(
      `/schools/${schoolId}/fee-assignments`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/fee-assignments/:id */
  updateAssignment: async (
    schoolId: string,
    id: string,
    body: UpdateFeeAssignmentDto,
  ): Promise<FeeAssignment> => {
    const res = await api.put<ApiEnvelope<FeeAssignment>>(
      `/schools/${schoolId}/fee-assignments/${id}`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/fee-assignments/:id */
  deleteAssignment: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/fee-assignments/${id}`);
  },

  /**
   * POST /schools/:schoolId/fee-assignments/bulk-class
   * Assigns one fee structure to every enrollment in either a single class
   * section or every section of a class master for the given academic year.
   * Caller must populate exactly one of `classSectionId` / `classMasterId`
   * (enforced by the discriminated `BulkClassAssignmentDto`).
   * Response shape varies — backend may return an array of assignments or
   * { created, assignments }. Normalize both into BulkClassAssignmentResult.
   */
  bulkAssignByClass: async (
    schoolId: string,
    body: BulkClassAssignmentDto,
  ): Promise<BulkClassAssignmentResult> => {
    const res = await api.post<ApiEnvelope<unknown>>(
      `/schools/${schoolId}/fee-assignments/bulk-class`,
      { schoolId, ...body },
    );
    const data = res.data;
    if (Array.isArray(data)) {
      return { created: data.length, assignments: data as FeeAssignment[] };
    }
    if (data && typeof data === 'object') {
      const obj = data as { created?: number; assignments?: FeeAssignment[] };
      const assignments = obj.assignments ?? [];
      return { created: obj.created ?? assignments.length, assignments };
    }
    return { created: 0, assignments: [] };
  },

  // ─── Installment Plans (mock — Phase 2) ─────────────────
  getPlans: (): Promise<InstallmentPlan[]> => delay([...plansDb]),

  createPlan: (dto: CreateInstallmentPlanDto): Promise<InstallmentPlan> => {
    const plan: InstallmentPlan = { id: crypto.randomUUID(), ...dto };
    plansDb = [...plansDb, plan];
    return delay(plan);
  },

  deletePlan: (id: string): Promise<void> => {
    plansDb = plansDb.filter((p) => p.id !== id);
    return delay(undefined);
  },

  // ─── Concessions (mock — Phase 2) ───────────────────────
  getConcessions: (): Promise<Concession[]> => delay([...concessionsDb]),

  createConcession: (dto: CreateConcessionDto): Promise<Concession> => {
    const c: Concession = {
      id: crypto.randomUUID(), name: dto.name, type: dto.type, value: dto.value,
      applicableTo: dto.applicableTo || 'All Fee Heads', feeHeadIds: [], studentCount: 0, reason: dto.reason,
    };
    concessionsDb = [...concessionsDb, c];
    return delay(c);
  },

  deleteConcession: (id: string): Promise<void> => {
    concessionsDb = concessionsDb.filter((c) => c.id !== id);
    return delay(undefined);
  },

  // ─── Late Fee Rules (mock — Phase 2) ────────────────────
  getRules: (): Promise<LateFeeRule[]> => delay([...lateRulesDb]),

  createRule: (dto: CreateLateFeeRuleDto): Promise<LateFeeRule> => {
    const rule: LateFeeRule = { id: crypto.randomUUID(), ...dto, enabled: true };
    lateRulesDb = [...lateRulesDb, rule];
    return delay(rule);
  },

  toggleRule: (id: string): Promise<LateFeeRule> => {
    const idx = lateRulesDb.findIndex((r) => r.id === id);
    if (idx === -1) return Promise.reject(new Error('Not found'));
    lateRulesDb[idx] = { ...lateRulesDb[idx], enabled: !lateRulesDb[idx].enabled };
    return delay(lateRulesDb[idx]);
  },

  deleteRule: (id: string): Promise<void> => {
    lateRulesDb = lateRulesDb.filter((r) => r.id !== id);
    return delay(undefined);
  },
};
