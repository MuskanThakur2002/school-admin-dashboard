import { schoolsApi } from '@/services/modules/schools.api';
import { USE_MOCK_SCHOOLS } from '@/mocks/mock-mode';
import { mockTenants } from '@/mocks/mock-tenants';
import type { School } from '@/types/school.types';
import type {
  Tenant,
  CreateTenantDto,
  UpdateBrandingDto,
  UpdatePlanDto,
  UpdateAccessDto,
  TenantBranding,
  TenantAccessControl,
  TenantPlan,
  TenantStatus,
} from '@/types/tenant.types';

// The `/schools` API only persists { name, address, location, phoneNumber,
// domain, branding, isActive, initialPayment, monthlyPayment }. The admin UI
// needs richer fields (plan, city, state, board, students, staff, access,
// joinDate, adminEmail/Phone). We stash those inside `branding._meta` so they
// round-trip through the backend until a richer schema exists.

interface UiMeta {
  plan?: TenantPlan;
  status?: TenantStatus;
  city?: string;
  state?: string;
  board?: string;
  students?: number;
  staff?: number;
  joinDate?: string;
  adminEmail?: string;
  adminPhone?: string;
  access?: TenantAccessControl;
}

interface BrandingPayload {
  primaryColor?: string;
  logoUrl?: string;
  tagline?: string;
  _meta?: UiMeta;
}

const defaultBranding: TenantBranding = {
  primaryColor: '#002c98',
  logoUrl: '',
  tagline: '',
};

const defaultAccess: TenantAccessControl = {
  modulesEnabled: [
    'admissions', 'students', 'academics', 'fees',
    'ledger', 'receipts', 'notifications', 'reports',
  ],
  maxAdmins: 3,
  maxStaff: 50,
  allowApi: false,
  allowBulkImport: true,
};

function readBranding(raw: Record<string, unknown> | null): BrandingPayload {
  return (raw ?? {}) as BrandingPayload;
}

function splitAddress(address: string): { city: string; state: string } {
  const [city = '', state = ''] = (address ?? '').split(',').map((s) => s.trim());
  return { city, state };
}

function schoolToTenant(school: School): Tenant {
  const b = readBranding(school.branding);
  const meta = b._meta ?? {};
  const { city, state } = splitAddress(school.address);

  const status: TenantStatus =
    meta.status ?? (school.isActive ? 'active' : 'suspended');

  return {
    id: school.id,
    name: school.name,
    domain: school.domain,
    city: meta.city ?? city,
    state: meta.state ?? state,
    plan: meta.plan ?? 'starter',
    students: meta.students ?? 0,
    staff: meta.staff ?? 0,
    status,
    joinDate: meta.joinDate ?? (school.createdAt ? school.createdAt.split('T')[0] : ''),
    board: meta.board ?? '',
    adminEmail: meta.adminEmail ?? '',
    adminPhone: meta.adminPhone ?? school.phoneNumber ?? '',
    branding: {
      primaryColor: b.primaryColor ?? defaultBranding.primaryColor,
      logoUrl: b.logoUrl ?? defaultBranding.logoUrl,
      tagline: b.tagline ?? defaultBranding.tagline,
    },
    access: meta.access ?? defaultAccess,
  };
}

function patchBranding(
  current: Record<string, unknown> | null,
  patch: Partial<BrandingPayload>,
  metaPatch?: Partial<UiMeta>,
): BrandingPayload {
  const existing = readBranding(current);
  return {
    ...existing,
    ...patch,
    _meta: { ...(existing._meta ?? {}), ...(metaPatch ?? {}) },
  };
}

const mockStore: Tenant[] = [...mockTenants];

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), ms));
}

function mockPatch(id: string, patch: Partial<Tenant>): Tenant {
  const idx = mockStore.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error('Tenant not found');
  mockStore[idx] = { ...mockStore[idx], ...patch };
  return mockStore[idx];
}

export const tenantApi = {
  getTenants: async (): Promise<Tenant[]> => {
    if (USE_MOCK_SCHOOLS) return delay([...mockStore]);
    const res = await schoolsApi.list({ page: 1, limit: 100 });
    return res.data.map(schoolToTenant);
  },

  getTenant: async (id: string): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) {
      const t = mockStore.find((x) => x.id === id);
      if (!t) throw new Error('Tenant not found');
      return delay(t);
    }
    const school = await schoolsApi.getById(id);
    return schoolToTenant(school);
  },

  createTenant: async (dto: CreateTenantDto): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) {
      const t: Tenant = {
        id: `school-${Date.now()}`,
        name: dto.name,
        domain: dto.domain,
        city: dto.city,
        state: dto.state,
        plan: dto.plan,
        students: 0,
        staff: 0,
        status: 'onboarding',
        joinDate: new Date().toISOString().split('T')[0],
        board: dto.board,
        adminEmail: dto.adminEmail,
        adminPhone: dto.adminPhone,
        branding: { ...defaultBranding },
        access: defaultAccess,
      };
      mockStore.unshift(t);
      return delay(t);
    }
    const meta: UiMeta = {
      plan: dto.plan,
      status: 'onboarding',
      city: dto.city,
      state: dto.state,
      board: dto.board,
      students: 0,
      staff: 0,
      joinDate: new Date().toISOString().split('T')[0],
      adminEmail: dto.adminEmail,
      adminPhone: dto.adminPhone,
      access: defaultAccess,
    };
    const school = await schoolsApi.create({
      name: dto.name,
      address: `${dto.city}, ${dto.state}`,
      location: { lat: 0, lng: 0 },
      phoneNumber: dto.adminPhone,
      domain: dto.domain,
      branding: { ...defaultBranding, _meta: meta } as Record<string, unknown>,
      isActive: true,
      initialPayment: 0,
      monthlyPayment: 0,
    });
    return schoolToTenant(school);
  },

  updateBranding: async (id: string, dto: UpdateBrandingDto): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) return delay(mockPatch(id, { branding: { ...dto } }));
    const current = await schoolsApi.getById(id);
    const nextBranding = patchBranding(current.branding, {
      primaryColor: dto.primaryColor,
      logoUrl: dto.logoUrl,
      tagline: dto.tagline,
    });
    const updated = await schoolsApi.update(id, { branding: nextBranding as Record<string, unknown> });
    return schoolToTenant(updated);
  },

  updatePlan: async (id: string, dto: UpdatePlanDto): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) return delay(mockPatch(id, { plan: dto.plan }));
    const current = await schoolsApi.getById(id);
    const nextBranding = patchBranding(current.branding, {}, { plan: dto.plan });
    const updated = await schoolsApi.update(id, { branding: nextBranding as Record<string, unknown> });
    return schoolToTenant(updated);
  },

  updateAccess: async (id: string, dto: UpdateAccessDto): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) return delay(mockPatch(id, { access: { ...dto } }));
    const current = await schoolsApi.getById(id);
    const nextBranding = patchBranding(current.branding, {}, { access: { ...dto } });
    const updated = await schoolsApi.update(id, { branding: nextBranding as Record<string, unknown> });
    return schoolToTenant(updated);
  },

  suspendTenant: async (id: string): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) return delay(mockPatch(id, { status: 'suspended' }));
    const current = await schoolsApi.getById(id);
    const nextBranding = patchBranding(current.branding, {}, { status: 'suspended' });
    const updated = await schoolsApi.update(id, {
      isActive: false,
      branding: nextBranding as Record<string, unknown>,
    });
    return schoolToTenant(updated);
  },

  activateTenant: async (id: string): Promise<Tenant> => {
    if (USE_MOCK_SCHOOLS) return delay(mockPatch(id, { status: 'active' }));
    const current = await schoolsApi.getById(id);
    const nextBranding = patchBranding(current.branding, {}, { status: 'active' });
    const updated = await schoolsApi.update(id, {
      isActive: true,
      branding: nextBranding as Record<string, unknown>,
    });
    return schoolToTenant(updated);
  },

  deleteTenant: async (id: string): Promise<void> => {
    if (USE_MOCK_SCHOOLS) {
      const idx = mockStore.findIndex((t) => t.id === id);
      if (idx >= 0) mockStore.splice(idx, 1);
      await delay(null);
      return;
    }
    await schoolsApi.remove(id);
  },
};
