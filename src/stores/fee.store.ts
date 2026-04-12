import { create } from 'zustand';
import { feeApi } from '@/services/modules/fee.api';
import type {
  FeeHead, FeeStructure, InstallmentPlan, Concession, LateFeeRule,
  CreateFeeHeadDto, CreateFeeStructureDto, CreateInstallmentPlanDto,
  CreateConcessionDto, CreateLateFeeRuleDto,
} from '@/types/fee.types';

interface FeeState {
  heads: FeeHead[];
  structures: FeeStructure[];
  plans: InstallmentPlan[];
  concessions: Concession[];
  rules: LateFeeRule[];
  loading: boolean;
  error: string | null;

  // Fetch
  fetchHeads: () => Promise<void>;
  fetchStructures: () => Promise<void>;
  fetchPlans: () => Promise<void>;
  fetchConcessions: () => Promise<void>;
  fetchRules: () => Promise<void>;

  // Heads
  createHead: (dto: CreateFeeHeadDto) => Promise<FeeHead>;
  updateHead: (id: string, patch: Partial<FeeHead>) => Promise<void>;
  deleteHead: (id: string) => Promise<void>;
  toggleHead: (id: string) => Promise<void>;

  // Structures
  createStructure: (dto: CreateFeeStructureDto) => Promise<FeeStructure>;
  deleteStructure: (id: string) => Promise<void>;
  getStructureForClass: (className: string) => Promise<FeeStructure | null>;

  // Plans
  createPlan: (dto: CreateInstallmentPlanDto) => Promise<InstallmentPlan>;
  deletePlan: (id: string) => Promise<void>;

  // Concessions
  createConcession: (dto: CreateConcessionDto) => Promise<Concession>;
  deleteConcession: (id: string) => Promise<void>;

  // Rules
  createRule: (dto: CreateLateFeeRuleDto) => Promise<LateFeeRule>;
  toggleRule: (id: string) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
}

export const useFeeStore = create<FeeState>((set) => ({
  heads: [], structures: [], plans: [], concessions: [], rules: [],
  loading: false, error: null,

  // ─── Fetch ─────────────────────────────────────────
  fetchHeads: async () => {
    set({ loading: true });
    const data = await feeApi.getHeads();
    set({ heads: data, loading: false });
  },
  fetchStructures: async () => {
    set({ loading: true });
    const data = await feeApi.getStructures();
    set({ structures: data, loading: false });
  },
  fetchPlans: async () => {
    const data = await feeApi.getPlans();
    set({ plans: data });
  },
  fetchConcessions: async () => {
    const data = await feeApi.getConcessions();
    set({ concessions: data });
  },
  fetchRules: async () => {
    const data = await feeApi.getRules();
    set({ rules: data });
  },

  // ─── Heads ─────────────────────────────────────────
  createHead: async (dto) => {
    const created = await feeApi.createHead(dto);
    set((s) => ({ heads: [...s.heads, created] }));
    return created;
  },
  updateHead: async (id, patch) => {
    const updated = await feeApi.updateHead(id, patch);
    set((s) => ({ heads: s.heads.map((h) => (h.id === id ? updated : h)) }));
  },
  deleteHead: async (id) => {
    await feeApi.deleteHead(id);
    set((s) => ({ heads: s.heads.filter((h) => h.id !== id) }));
  },
  toggleHead: async (id) => {
    const updated = await feeApi.toggleHead(id);
    set((s) => ({ heads: s.heads.map((h) => (h.id === id ? updated : h)) }));
  },

  // ─── Structures ────────────────────────────────────
  createStructure: async (dto) => {
    const created = await feeApi.createStructure(dto);
    set((s) => ({ structures: [...s.structures, created] }));
    return created;
  },
  deleteStructure: async (id) => {
    await feeApi.deleteStructure(id);
    set((s) => ({ structures: s.structures.filter((x) => x.id !== id) }));
  },
  getStructureForClass: (className) => feeApi.getStructureForClass(className),

  // ─── Plans ─────────────────────────────────────────
  createPlan: async (dto) => {
    const created = await feeApi.createPlan(dto);
    set((s) => ({ plans: [...s.plans, created] }));
    return created;
  },
  deletePlan: async (id) => {
    await feeApi.deletePlan(id);
    set((s) => ({ plans: s.plans.filter((x) => x.id !== id) }));
  },

  // ─── Concessions ───────────────────────────────────
  createConcession: async (dto) => {
    const created = await feeApi.createConcession(dto);
    set((s) => ({ concessions: [...s.concessions, created] }));
    return created;
  },
  deleteConcession: async (id) => {
    await feeApi.deleteConcession(id);
    set((s) => ({ concessions: s.concessions.filter((x) => x.id !== id) }));
  },

  // ─── Rules ─────────────────────────────────────────
  createRule: async (dto) => {
    const created = await feeApi.createRule(dto);
    set((s) => ({ rules: [...s.rules, created] }));
    return created;
  },
  toggleRule: async (id) => {
    const updated = await feeApi.toggleRule(id);
    set((s) => ({ rules: s.rules.map((r) => (r.id === id ? updated : r)) }));
  },
  deleteRule: async (id) => {
    await feeApi.deleteRule(id);
    set((s) => ({ rules: s.rules.filter((r) => r.id !== id) }));
  },
}));
