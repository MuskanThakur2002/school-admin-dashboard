import type {
  Tenant,
  CreateTenantDto,
  UpdateBrandingDto,
  UpdatePlanDto,
  UpdateAccessDto,
  TenantBranding,
  TenantAccessControl,
} from '@/types/tenant.types';

const NETWORK_DELAY_MS = 150;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

// ─── Default values ────────────────────────────────────────────

const defaultBranding: TenantBranding = {
  primaryColor: '#002c98',
  logoUrl: '',
  tagline: '',
};

const defaultAccess: TenantAccessControl = {
  modulesEnabled: ['admissions', 'students', 'academics', 'fees', 'ledger', 'receipts', 'notifications', 'reports'],
  maxAdmins: 3,
  maxStaff: 50,
  allowApi: false,
  allowBulkImport: true,
};

// ─── Mock DB ───────────────────────────────────────────────────

let tenantsDb: Tenant[] = [
  {
    id: 'ten-1', name: 'Delhi Public School — Noida', domain: 'dps-noida.admindesk.io',
    city: 'Noida', state: 'UP', plan: 'enterprise', students: 2450, staff: 180,
    status: 'active', joinDate: '2025-01-15', board: 'CBSE',
    adminEmail: 'admin@dps-noida.edu.in', adminPhone: '9800000001',
    branding: { primaryColor: '#1a237e', logoUrl: '', tagline: 'Leaders of Tomorrow' },
    access: { modulesEnabled: ['admissions', 'students', 'academics', 'fees', 'ledger', 'expenses', 'receipts', 'notifications', 'reports'], maxAdmins: 10, maxStaff: 200, allowApi: true, allowBulkImport: true },
  },
  {
    id: 'ten-2', name: 'Ryan International — Mumbai', domain: 'ryan-mumbai.admindesk.io',
    city: 'Mumbai', state: 'Maharashtra', plan: 'growth', students: 1200, staff: 95,
    status: 'active', joinDate: '2025-03-01', board: 'ICSE',
    adminEmail: 'admin@ryan-mumbai.edu.in', adminPhone: '9800000002',
    branding: { primaryColor: '#b71c1c', logoUrl: '', tagline: 'Excellence in Education' },
    access: { ...defaultAccess, maxAdmins: 5, maxStaff: 100, allowApi: true },
  },
  {
    id: 'ten-3', name: 'Greenwood Academy', domain: 'greenwood.admindesk.io',
    city: 'Bangalore', state: 'Karnataka', plan: 'growth', students: 932, staff: 72,
    status: 'active', joinDate: '2025-04-01', board: 'CBSE',
    adminEmail: 'admin@greenwood.edu.in', adminPhone: '9800000003',
    branding: { primaryColor: '#2e7d32', logoUrl: '', tagline: 'Nurturing Young Minds' },
    access: { ...defaultAccess, maxAdmins: 5, maxStaff: 100 },
  },
  {
    id: 'ten-4', name: "St. Xavier's — Kolkata", domain: 'xavier-kol.admindesk.io',
    city: 'Kolkata', state: 'West Bengal', plan: 'starter', students: 580, staff: 45,
    status: 'active', joinDate: '2025-06-15', board: 'ICSE',
    adminEmail: 'admin@xavier-kol.edu.in', adminPhone: '9800000004',
    branding: { ...defaultBranding },
    access: { ...defaultAccess },
  },
  {
    id: 'ten-5', name: 'Modern Public School', domain: 'modern-ps.admindesk.io',
    city: 'Jaipur', state: 'Rajasthan', plan: 'starter', students: 0, staff: 0,
    status: 'onboarding', joinDate: '2026-04-01', board: 'RBSE',
    adminEmail: 'admin@modern-ps.edu.in', adminPhone: '9800000005',
    branding: { ...defaultBranding },
    access: { ...defaultAccess },
  },
];

let nextId = 6;

// ─── Public API ────────────────────────────────────────────────

export const tenantApi = {
  getTenants: (): Promise<Tenant[]> => delay([...tenantsDb]),

  getTenant: (id: string): Promise<Tenant> => {
    const tenant = tenantsDb.find((t) => t.id === id);
    if (!tenant) return Promise.reject(new Error('Tenant not found'));
    return delay({ ...tenant });
  },

  createTenant: (dto: CreateTenantDto): Promise<Tenant> => {
    const tenant: Tenant = {
      id: `ten-${nextId++}`,
      ...dto,
      students: 0,
      staff: 0,
      status: 'onboarding',
      joinDate: new Date().toISOString().split('T')[0],
      branding: { ...defaultBranding },
      access: { ...defaultAccess },
    };
    tenantsDb = [tenant, ...tenantsDb];
    return delay(tenant);
  },

  updateBranding: (id: string, dto: UpdateBrandingDto): Promise<Tenant> => {
    const idx = tenantsDb.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error('Tenant not found'));
    tenantsDb[idx] = { ...tenantsDb[idx], branding: { ...dto } };
    return delay({ ...tenantsDb[idx] });
  },

  updatePlan: (id: string, dto: UpdatePlanDto): Promise<Tenant> => {
    const idx = tenantsDb.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error('Tenant not found'));
    tenantsDb[idx] = { ...tenantsDb[idx], plan: dto.plan };
    return delay({ ...tenantsDb[idx] });
  },

  updateAccess: (id: string, dto: UpdateAccessDto): Promise<Tenant> => {
    const idx = tenantsDb.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error('Tenant not found'));
    tenantsDb[idx] = { ...tenantsDb[idx], access: { ...dto } };
    return delay({ ...tenantsDb[idx] });
  },

  suspendTenant: (id: string): Promise<Tenant> => {
    const idx = tenantsDb.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error('Tenant not found'));
    tenantsDb[idx] = { ...tenantsDb[idx], status: 'suspended' };
    return delay({ ...tenantsDb[idx] });
  },

  activateTenant: (id: string): Promise<Tenant> => {
    const idx = tenantsDb.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error('Tenant not found'));
    tenantsDb[idx] = { ...tenantsDb[idx], status: 'active' };
    return delay({ ...tenantsDb[idx] });
  },
};
