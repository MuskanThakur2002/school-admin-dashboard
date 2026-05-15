import { create } from 'zustand';
import { feeApi } from '@/services/modules/fee.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  FeeHead, FeeStructure, FeeStructureItem,
  InstallmentPlan, Concession, LateFeeRule,
  CreateFeeHeadDto, UpdateFeeHeadDto,
  CreateFeeStructureDto, UpdateFeeStructureDto,
  CreateFeeStructureItemDto, UpdateFeeStructureItemDto,
  CreateInstallmentPlanDto, CreateConcessionDto, CreateLateFeeRuleDto,
} from '@/types/fee.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

interface FeeState {
  heads: FeeHead[];
  structures: FeeStructure[];
  plans: InstallmentPlan[];
  concessions: Concession[];
  rules: LateFeeRule[];
  loading: boolean;
  error: string | null;

  // ─── Heads ─────────────────────────────────────────
  fetchHeads: () => Promise<void>;
  createHead: (dto: CreateFeeHeadDto) => Promise<FeeHead>;
  updateHead: (id: string, dto: UpdateFeeHeadDto) => Promise<void>;
  deleteHead: (id: string) => Promise<void>;

  // ─── Structures ────────────────────────────────────
  fetchStructures: () => Promise<void>;
  createStructure: (dto: CreateFeeStructureDto) => Promise<FeeStructure>;
  updateStructure: (id: string, dto: UpdateFeeStructureDto) => Promise<FeeStructure>;
  deleteStructure: (id: string) => Promise<void>;

  // ─── Structure Items ───────────────────────────────
  createItem: (dto: CreateFeeStructureItemDto) => Promise<FeeStructureItem>;
  updateItem: (id: string, dto: UpdateFeeStructureItemDto) => Promise<FeeStructureItem>;
  deleteItem: (structureId: string, itemId: string) => Promise<void>;

  // ─── Plans (mock) ──────────────────────────────────
  fetchPlans: () => Promise<void>;
  createPlan: (dto: CreateInstallmentPlanDto) => Promise<InstallmentPlan>;
  deletePlan: (id: string) => Promise<void>;

  // ─── Concessions (mock) ────────────────────────────
  fetchConcessions: () => Promise<void>;
  createConcession: (dto: CreateConcessionDto) => Promise<Concession>;
  deleteConcession: (id: string) => Promise<void>;

  // ─── Rules (mock) ──────────────────────────────────
  fetchRules: () => Promise<void>;
  createRule: (dto: CreateLateFeeRuleDto) => Promise<LateFeeRule>;
  toggleRule: (id: string) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
}

export const useFeeStore = create<FeeState>((set) => ({
  heads: [], structures: [], plans: [], concessions: [], rules: [],
  loading: false, error: null,

  // ─── Heads ─────────────────────────────────────────
  fetchHeads: async () => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const res = await feeApi.listHeads(schoolId, { page: 1, limit: 100 });
      set({ heads: res.data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createHead: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await feeApi.createHead(schoolId, dto);
    set((s) => ({ heads: [...s.heads, created] }));
    return created;
  },

  updateHead: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await feeApi.updateHead(schoolId, id, dto);
    set((s) => ({ heads: s.heads.map((h) => (h.id === id ? updated : h)) }));
  },

  deleteHead: async (id) => {
    const schoolId = resolveSchoolId();
    await feeApi.deleteHead(schoolId, id);
    set((s) => ({ heads: s.heads.filter((h) => h.id !== id) }));
  },

  // ─── Structures ────────────────────────────────────
  fetchStructures: async () => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const res = await feeApi.listStructures(schoolId, { page: 1, limit: 100 });
      set({ structures: res.data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createStructure: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await feeApi.createStructure(schoolId, dto);
    // Server returns the bare row without nested items/installments — normalize.
    const normalized: FeeStructure = {
      ...created,
      feeStructureItems: created.feeStructureItems ?? [],
      feeInstallments: created.feeInstallments ?? [],
    };
    set((s) => ({ structures: [...s.structures, normalized] }));
    return normalized;
  },

  updateStructure: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await feeApi.updateStructure(schoolId, id, dto);
    set((s) => ({
      structures: s.structures.map((x) =>
        x.id === id
          ? {
              ...x,
              ...updated,
              feeStructureItems: updated.feeStructureItems ?? x.feeStructureItems,
              feeInstallments: updated.feeInstallments ?? x.feeInstallments,
            }
          : x,
      ),
    }));
    return updated;
  },

  deleteStructure: async (id) => {
    const schoolId = resolveSchoolId();
    await feeApi.deleteStructure(schoolId, id);
    set((s) => ({ structures: s.structures.filter((x) => x.id !== id) }));
  },

  // ─── Structure Items ───────────────────────────────
  createItem: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await feeApi.createItem(schoolId, dto);
    // Hydrate feeHead from the loaded heads list so the UI has a name immediately.
    set((s) => {
      const feeHead = s.heads.find((h) => h.id === created.feeHeadId);
      const hydrated: FeeStructureItem = feeHead ? { ...created, feeHead } : created;
      return {
        structures: s.structures.map((st) =>
          st.id === dto.feeStructureId
            ? { ...st, feeStructureItems: [...st.feeStructureItems, hydrated] }
            : st,
        ),
      };
    });
    return created;
  },

  updateItem: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await feeApi.updateItem(schoolId, id, dto);
    set((s) => ({
      structures: s.structures.map((st) => ({
        ...st,
        feeStructureItems: st.feeStructureItems.map((it) =>
          it.id === id ? { ...it, ...updated, feeHead: it.feeHead } : it,
        ),
      })),
    }));
    return updated;
  },

  deleteItem: async (structureId, itemId) => {
    const schoolId = resolveSchoolId();
    await feeApi.deleteItem(schoolId, itemId);
    set((s) => ({
      structures: s.structures.map((st) =>
        st.id === structureId
          ? { ...st, feeStructureItems: st.feeStructureItems.filter((it) => it.id !== itemId) }
          : st,
      ),
    }));
  },

  // ─── Plans (mock) ──────────────────────────────────
  fetchPlans: async () => {
    const data = await feeApi.getPlans();
    set({ plans: data });
  },
  createPlan: async (dto) => {
    const created = await feeApi.createPlan(dto);
    set((s) => ({ plans: [...s.plans, created] }));
    return created;
  },
  deletePlan: async (id) => {
    await feeApi.deletePlan(id);
    set((s) => ({ plans: s.plans.filter((x) => x.id !== id) }));
  },

  // ─── Concessions (mock) ────────────────────────────
  fetchConcessions: async () => {
    const data = await feeApi.getConcessions();
    set({ concessions: data });
  },
  createConcession: async (dto) => {
    const created = await feeApi.createConcession(dto);
    set((s) => ({ concessions: [...s.concessions, created] }));
    return created;
  },
  deleteConcession: async (id) => {
    await feeApi.deleteConcession(id);
    set((s) => ({ concessions: s.concessions.filter((x) => x.id !== id) }));
  },

  // ─── Rules (mock) ──────────────────────────────────
  fetchRules: async () => {
    const data = await feeApi.getRules();
    set({ rules: data });
  },
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
