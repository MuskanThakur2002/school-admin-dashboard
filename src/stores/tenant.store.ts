import { create } from 'zustand';
import { tenantApi } from '@/services/modules/tenant.api';
import type {
  Tenant,
  CreateTenantDto,
  UpdateBrandingDto,
  UpdatePlanDto,
  UpdateAccessDto,
} from '@/types/tenant.types';

interface TenantState {
  tenants: Tenant[];
  loading: boolean;
  error: string | null;

  fetchTenants: () => Promise<void>;
  getTenant: (id: string) => Promise<Tenant>;
  createTenant: (dto: CreateTenantDto) => Promise<Tenant>;
  updateBranding: (id: string, dto: UpdateBrandingDto) => Promise<Tenant>;
  updatePlan: (id: string, dto: UpdatePlanDto) => Promise<Tenant>;
  updateAccess: (id: string, dto: UpdateAccessDto) => Promise<Tenant>;
  suspendTenant: (id: string) => Promise<Tenant>;
  activateTenant: (id: string) => Promise<Tenant>;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenants: [],
  loading: false,
  error: null,

  fetchTenants: async () => {
    set({ loading: true, error: null });
    try {
      const data = await tenantApi.getTenants();
      set({ tenants: data, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  getTenant: (id: string) => tenantApi.getTenant(id),

  createTenant: async (dto) => {
    const created = await tenantApi.createTenant(dto);
    set((state) => ({ tenants: [created, ...state.tenants] }));
    return created;
  },

  updateBranding: async (id, dto) => {
    const updated = await tenantApi.updateBranding(id, dto);
    set((state) => ({ tenants: state.tenants.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  updatePlan: async (id, dto) => {
    const updated = await tenantApi.updatePlan(id, dto);
    set((state) => ({ tenants: state.tenants.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  updateAccess: async (id, dto) => {
    const updated = await tenantApi.updateAccess(id, dto);
    set((state) => ({ tenants: state.tenants.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  suspendTenant: async (id) => {
    const updated = await tenantApi.suspendTenant(id);
    set((state) => ({ tenants: state.tenants.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },

  activateTenant: async (id) => {
    const updated = await tenantApi.activateTenant(id);
    set((state) => ({ tenants: state.tenants.map((t) => (t.id === id ? updated : t)) }));
    return updated;
  },
}));
