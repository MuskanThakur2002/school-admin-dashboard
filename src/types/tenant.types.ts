export type TenantPlan = 'starter' | 'growth' | 'enterprise';
export type TenantStatus = 'active' | 'onboarding' | 'suspended';

export interface TenantBranding {
  primaryColor: string;
  logoUrl: string;
  tagline: string;
}

export interface TenantAccessControl {
  modulesEnabled: string[];
  maxAdmins: number;
  maxStaff: number;
  allowApi: boolean;
  allowBulkImport: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  city: string;
  state: string;
  plan: TenantPlan;
  students: number;
  staff: number;
  status: TenantStatus;
  joinDate: string;
  branding: TenantBranding;
  access: TenantAccessControl;
  adminEmail: string;
  adminPhone: string;
  board: string;
}

export interface CreateTenantDto {
  name: string;
  domain: string;
  city: string;
  state: string;
  plan: TenantPlan;
  adminEmail: string;
  adminPhone: string;
  board: string;
}

export interface UpdateBrandingDto {
  primaryColor: string;
  logoUrl: string;
  tagline: string;
}

export interface UpdatePlanDto {
  plan: TenantPlan;
}

export interface UpdateAccessDto {
  modulesEnabled: string[];
  maxAdmins: number;
  maxStaff: number;
  allowApi: boolean;
  allowBulkImport: boolean;
}

export const ALL_MODULES = [
  'admissions',
  'students',
  'academics',
  'fees',
  'ledger',
  'expenses',
  'receipts',
  'notifications',
  'reports',
] as const;
