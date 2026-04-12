/**
 * Fee Engine API Layer
 * Backend-swap point — replace function bodies with fetch() calls.
 */
import type {
  FeeHead, FeeStructure, InstallmentPlan, Concession, LateFeeRule,
  CreateFeeHeadDto, CreateFeeStructureDto, CreateInstallmentPlanDto,
  CreateConcessionDto, CreateLateFeeRuleDto, FeeStructureHead,
} from '@/types/fee.types';
import { format } from 'date-fns';

const D = 150;
const delay = <T>(data: T): Promise<T> => new Promise((r) => setTimeout(() => r(data), D));

// ─── Mock DBs ──────────────────────────────────────────────

let headsDb: FeeHead[] = [
  { id: 'fh1', name: 'Tuition Fee', code: 'TUI', type: 'recurring', category: 'tuition', amount: 5000, frequency: 'monthly', taxable: false, enabled: true },
  { id: 'fh2', name: 'Annual Development Fund', code: 'ADF', type: 'one_time', category: 'tuition', amount: 15000, taxable: false, enabled: true },
  { id: 'fh3', name: 'Transport Fee', code: 'TRN', type: 'recurring', category: 'transport', amount: 2500, frequency: 'monthly', taxable: true, enabled: true },
  { id: 'fh4', name: 'Computer Lab Fee', code: 'LAB', type: 'one_time', category: 'lab', amount: 3000, taxable: true, enabled: true },
  { id: 'fh5', name: 'Exam Fee', code: 'EXM', type: 'recurring', category: 'exam', amount: 1500, frequency: 'quarterly', taxable: false, enabled: true },
  { id: 'fh6', name: 'Library Fee', code: 'LIB', type: 'one_time', category: 'library', amount: 1200, taxable: false, enabled: true },
  { id: 'fh7', name: 'Sports & Activities', code: 'SPT', type: 'one_time', category: 'activity', amount: 2000, taxable: false, enabled: true },
  { id: 'fh8', name: 'Hostel Fee', code: 'HST', type: 'recurring', category: 'hostel', amount: 8000, frequency: 'monthly', taxable: true, enabled: false },
  { id: 'fh9', name: 'Smart Class Fee', code: 'SMT', type: 'one_time', category: 'other', amount: 2500, taxable: false, enabled: true },
  { id: 'fh10', name: 'Uniform & Books', code: 'UNI', type: 'one_time', category: 'other', amount: 4500, taxable: true, enabled: true },
];

const buildHeads = (ids: string[]): FeeStructureHead[] =>
  ids.map((id) => {
    const h = headsDb.find((x) => x.id === id);
    return h ? { feeHeadId: h.id, feeHeadName: h.name, amount: h.amount } : { feeHeadId: id, feeHeadName: '?', amount: 0 };
  });

let structuresDb: FeeStructure[] = [
  { id: 'fs1', name: 'Primary (I–V) Standard', academicYear: '2025-26', classes: ['I', 'II', 'III', 'IV', 'V'],
    heads: buildHeads(['fh1', 'fh2', 'fh6', 'fh7', 'fh9']), totalAmount: 68700, studentCount: 310, status: 'active' },
  { id: 'fs2', name: 'Middle School (VI–VIII)', academicYear: '2025-26', classes: ['VI', 'VII', 'VIII'],
    heads: buildHeads(['fh1', 'fh2', 'fh4', 'fh5', 'fh6', 'fh7']), totalAmount: 87200, studentCount: 280, status: 'active' },
  { id: 'fs3', name: 'Senior Secondary (IX–X)', academicYear: '2025-26', classes: ['IX', 'X'],
    heads: buildHeads(['fh1', 'fh2', 'fh4', 'fh5', 'fh6', 'fh9']), totalAmount: 106500, studentCount: 190, status: 'active' },
  { id: 'fs4', name: 'Higher Secondary (XI–XII)', academicYear: '2025-26', classes: ['XI', 'XII'],
    heads: buildHeads(['fh1', 'fh2', 'fh4', 'fh5', 'fh6']), totalAmount: 121000, studentCount: 152, status: 'active' },
  { id: 'fs5', name: 'Transport Add-on', academicYear: '2025-26', classes: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'],
    heads: buildHeads(['fh3']), totalAmount: 30000, studentCount: 420, status: 'active' },
];

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
  // ─── Fee Heads ──────────────────────────────────────────
  getHeads: (): Promise<FeeHead[]> => delay([...headsDb]),

  createHead: (dto: CreateFeeHeadDto): Promise<FeeHead> => {
    const head: FeeHead = { id: crypto.randomUUID(), ...dto, code: dto.code.toUpperCase(), enabled: true };
    headsDb = [...headsDb, head];
    return delay(head);
  },

  updateHead: (id: string, patch: Partial<FeeHead>): Promise<FeeHead> => {
    const idx = headsDb.findIndex((h) => h.id === id);
    if (idx === -1) return Promise.reject(new Error('Not found'));
    headsDb[idx] = { ...headsDb[idx], ...patch };
    return delay(headsDb[idx]);
  },

  deleteHead: (id: string): Promise<void> => {
    headsDb = headsDb.filter((h) => h.id !== id);
    return delay(undefined);
  },

  toggleHead: (id: string): Promise<FeeHead> => {
    const idx = headsDb.findIndex((h) => h.id === id);
    if (idx === -1) return Promise.reject(new Error('Not found'));
    headsDb[idx] = { ...headsDb[idx], enabled: !headsDb[idx].enabled };
    return delay(headsDb[idx]);
  },

  // ─── Fee Structures ─────────────────────────────────────
  getStructures: (): Promise<FeeStructure[]> => delay([...structuresDb]),

  createStructure: (dto: CreateFeeStructureDto): Promise<FeeStructure> => {
    const heads = buildHeads(dto.headIds);
    const total = heads.reduce((s, h) => s + h.amount, 0);
    const structure: FeeStructure = {
      id: crypto.randomUUID(), name: dto.name, academicYear: dto.academicYear,
      classes: dto.classes, heads, totalAmount: total, studentCount: 0, status: dto.status,
    };
    structuresDb = [...structuresDb, structure];
    return delay(structure);
  },

  deleteStructure: (id: string): Promise<void> => {
    structuresDb = structuresDb.filter((s) => s.id !== id);
    return delay(undefined);
  },

  /** Find the fee structure that applies to a given class (used during approval). */
  getStructureForClass: (className: string): Promise<FeeStructure | null> => {
    const match = structuresDb.find((s) => s.status === 'active' && s.classes.includes(className));
    return delay(match || null);
  },

  // ─── Installment Plans ──────────────────────────────────
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

  // ─── Concessions ────────────────────────────────────────
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

  // ─── Late Fee Rules ─────────────────────────────────────
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
