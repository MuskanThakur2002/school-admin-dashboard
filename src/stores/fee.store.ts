import { create } from 'zustand';
import { feeApi, type FeeAssignmentListParams } from '@/services/modules/fee.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  FeeHead, FeeStructure, FeeStructureItem, FeeInstallment, FeeAssignment,
  InstallmentPlan, Concession, LateFeeRule,
  CreateFeeHeadDto, UpdateFeeHeadDto,
  CreateFeeStructureDto, UpdateFeeStructureDto,
  CreateFeeStructureItemDto, UpdateFeeStructureItemDto,
  CreateFeeInstallmentDto, UpdateFeeInstallmentDto,
  CreateFeeAssignmentDto, UpdateFeeAssignmentDto,
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
  headsPage: number;
  headsLimit: number;
  headsTotal: number;

  structures: FeeStructure[];
  structuresPage: number;
  structuresLimit: number;
  structuresTotal: number;

  assignments: FeeAssignment[];
  assignmentsPage: number;
  assignmentsLimit: number;
  assignmentsTotal: number;

  plans: InstallmentPlan[];
  concessions: Concession[];
  rules: LateFeeRule[];
  loading: boolean;
  assignmentsLoading: boolean;
  error: string | null;

  // ─── Heads ─────────────────────────────────────────
  fetchHeads: (page?: number, limit?: number) => Promise<void>;
  createHead: (dto: CreateFeeHeadDto) => Promise<FeeHead>;
  updateHead: (id: string, dto: UpdateFeeHeadDto) => Promise<void>;
  deleteHead: (id: string) => Promise<void>;

  // ─── Structures ────────────────────────────────────
  fetchStructures: (page?: number, limit?: number) => Promise<void>;
  createStructure: (dto: CreateFeeStructureDto) => Promise<FeeStructure>;
  updateStructure: (id: string, dto: UpdateFeeStructureDto) => Promise<FeeStructure>;
  deleteStructure: (id: string) => Promise<void>;

  // ─── Structure Items ───────────────────────────────
  createItem: (dto: CreateFeeStructureItemDto) => Promise<FeeStructureItem>;
  updateItem: (id: string, dto: UpdateFeeStructureItemDto) => Promise<FeeStructureItem>;
  deleteItem: (structureId: string, itemId: string) => Promise<void>;

  // ─── Installments ──────────────────────────────────
  createInstallment: (dto: CreateFeeInstallmentDto) => Promise<FeeInstallment>;
  updateInstallment: (id: string, dto: UpdateFeeInstallmentDto) => Promise<FeeInstallment>;
  deleteInstallment: (structureId: string, installmentId: string) => Promise<void>;

  // ─── Assignments ───────────────────────────────────
  fetchAssignments: (
    page?: number,
    limit?: number,
    params?: FeeAssignmentListParams,
  ) => Promise<void>;
  createAssignment: (dto: CreateFeeAssignmentDto) => Promise<FeeAssignment>;
  updateAssignment: (id: string, dto: UpdateFeeAssignmentDto) => Promise<FeeAssignment>;
  deleteAssignment: (id: string) => Promise<void>;

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
  heads: [], headsPage: 1, headsLimit: 25, headsTotal: 0,
  structures: [], structuresPage: 1, structuresLimit: 25, structuresTotal: 0,
  assignments: [], assignmentsPage: 1, assignmentsLimit: 25, assignmentsTotal: 0,
  plans: [], concessions: [], rules: [],
  loading: false, assignmentsLoading: false, error: null,

  // ─── Heads ─────────────────────────────────────────
  fetchHeads: async (page = 1, limit = 25) => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const res = await feeApi.listHeads(schoolId, { page, limit });
      set({
        heads: res.data,
        headsPage: res.page,
        headsLimit: res.limit,
        headsTotal: res.total,
        loading: false,
      });
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
  fetchStructures: async (page = 1, limit = 25) => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const res = await feeApi.listStructures(schoolId, { page, limit });
      set({
        structures: res.data,
        structuresPage: res.page,
        structuresLimit: res.limit,
        structuresTotal: res.total,
        loading: false,
      });
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

  // ─── Installments ──────────────────────────────────
  createInstallment: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await feeApi.createInstallment(schoolId, dto);
    set((s) => ({
      structures: s.structures.map((st) =>
        st.id === dto.feeStructureId
          ? { ...st, feeInstallments: [...st.feeInstallments, created] }
          : st,
      ),
    }));
    return created;
  },

  updateInstallment: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await feeApi.updateInstallment(schoolId, id, dto);
    set((s) => ({
      structures: s.structures.map((st) => ({
        ...st,
        feeInstallments: st.feeInstallments.map((inst) =>
          inst.id === id ? { ...inst, ...updated } : inst,
        ),
      })),
    }));
    return updated;
  },

  deleteInstallment: async (structureId, installmentId) => {
    const schoolId = resolveSchoolId();
    await feeApi.deleteInstallment(schoolId, installmentId);
    set((s) => ({
      structures: s.structures.map((st) =>
        st.id === structureId
          ? { ...st, feeInstallments: st.feeInstallments.filter((inst) => inst.id !== installmentId) }
          : st,
      ),
    }));
  },

  // ─── Assignments ───────────────────────────────────
  fetchAssignments: async (page = 1, limit = 25, params) => {
    set({ assignmentsLoading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const res = await feeApi.listAssignments(schoolId, { page, limit, ...params });
      set({
        assignments: res.data,
        assignmentsPage: res.page,
        assignmentsLimit: res.limit,
        assignmentsTotal: res.total,
        assignmentsLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, assignmentsLoading: false });
    }
  },

  createAssignment: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await feeApi.createAssignment(schoolId, dto);
    // Hydrate feeStructure from cache so the row renders the name immediately.
    set((s) => {
      const feeStructure = s.structures.find((st) => st.id === created.feeStructureId);
      const hydrated: FeeAssignment = feeStructure ? { ...created, feeStructure } : created;
      return { assignments: [hydrated, ...s.assignments] };
    });
    return created;
  },

  updateAssignment: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await feeApi.updateAssignment(schoolId, id, dto);
    set((s) => ({
      assignments: s.assignments.map((a) =>
        a.id === id
          ? {
              ...a,
              ...updated,
              feeStructure:
                updated.feeStructure
                ?? s.structures.find((st) => st.id === updated.feeStructureId)
                ?? a.feeStructure,
            }
          : a,
      ),
    }));
    return updated;
  },

  deleteAssignment: async (id) => {
    const schoolId = resolveSchoolId();
    await feeApi.deleteAssignment(schoolId, id);
    set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) }));
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
