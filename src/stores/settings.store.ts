/**
 * Settings Store — roles, holidays, payment modes, doc types, grading rules, communication.
 * Each sub-section has its own seed data and CRUD actions.
 * When backend exists, replace seed arrays with API calls.
 */
import { create } from 'zustand';
// date-fns used by pages that consume this store, not here directly

// ─── Types ─────��───────────────────────────────────────────
export interface Role { id: string; name: string; description: string; userCount: number; permissions: string[]; isSystem: boolean; }
export interface Holiday { id: string; name: string; date: string; type: 'national' | 'regional' | 'school'; recurring: boolean; }
export interface PaymentMode { id: string; name: string; code: string; enabled: boolean; requiresReference: boolean; }
export interface DocType { id: string; name: string; required: boolean; maxSizeMB: number; allowedFormats: string[]; }
export interface GradeRule { id: string; grade: string; minPct: number; maxPct: number; gpa: number; remark: string; }
export interface ChannelConfig { id: string; channel: string; enabled: boolean; provider: string; settings: { label: string; value: string }[]; }

// ─── Seed data ─��───────────────────────────────────────────
const permissionGroups = [
  { group: 'Dashboard', permissions: ['dashboard.read'] },
  { group: 'Admissions', permissions: ['admissions.read', 'admissions.write'] },
  { group: 'Academic', permissions: ['academic.read', 'academic.write'] },
  { group: 'Students', permissions: ['students.read', 'students.write'] },
  { group: 'Fees', permissions: ['fees.read', 'fees.write'] },
  { group: 'Ledger', permissions: ['ledger.read', 'ledger.write'] },
  { group: 'Expenses', permissions: ['expenses.read', 'expenses.write'] },
  { group: 'Receipts', permissions: ['receipts.read', 'receipts.write'] },
  { group: 'Notifications', permissions: ['notifications.read', 'notifications.write'] },
  { group: 'Reports', permissions: ['reports.read'] },
  { group: 'Settings', permissions: ['settings.manage'] },
];

let rolesDb: Role[] = [
  { id: 'r1', name: 'Super Admin', description: 'Full access to all modules', userCount: 1, permissions: permissionGroups.flatMap((g) => g.permissions), isSystem: true },
  { id: 'r2', name: 'School Admin', description: 'Full access to school operations', userCount: 3, permissions: permissionGroups.flatMap((g) => g.permissions).filter((p) => p !== 'settings.manage'), isSystem: true },
  { id: 'r3', name: 'Office Staff', description: 'Admissions, fees, receipts, reports', userCount: 5, permissions: ['dashboard.read', 'admissions.read', 'admissions.write', 'students.read', 'fees.read', 'fees.write', 'ledger.read', 'receipts.read', 'receipts.write', 'reports.read'], isSystem: false },
  { id: 'r4', name: 'Accountant', description: 'Financial modules only', userCount: 2, permissions: ['dashboard.read', 'fees.read', 'fees.write', 'ledger.read', 'ledger.write', 'expenses.read', 'expenses.write', 'receipts.read', 'receipts.write', 'reports.read'], isSystem: false },
];

let holidaysDb: Holiday[] = [
  { id: 'h1', name: 'Republic Day', date: '2026-01-26', type: 'national', recurring: true },
  { id: 'h2', name: 'Holi', date: '2026-03-17', type: 'national', recurring: false },
  { id: 'h3', name: 'Independence Day', date: '2026-08-15', type: 'national', recurring: true },
  { id: 'h4', name: 'Gandhi Jayanti', date: '2026-10-02', type: 'national', recurring: true },
  { id: 'h5', name: 'Diwali Break', date: '2026-10-20', type: 'school', recurring: false },
  { id: 'h6', name: 'Christmas', date: '2026-12-25', type: 'national', recurring: true },
  { id: 'h7', name: "Founder's Day", date: '2026-09-15', type: 'school', recurring: true },
];

let paymentModesDb: PaymentMode[] = [
  { id: 'pm1', name: 'Cash', code: 'CASH', enabled: true, requiresReference: false },
  { id: 'pm2', name: 'Cheque', code: 'CHQ', enabled: true, requiresReference: true },
  { id: 'pm3', name: 'Bank Transfer (NEFT/RTGS)', code: 'BANK', enabled: true, requiresReference: true },
  { id: 'pm4', name: 'UPI', code: 'UPI', enabled: true, requiresReference: true },
  { id: 'pm5', name: 'Credit/Debit Card', code: 'CARD', enabled: false, requiresReference: true },
  { id: 'pm6', name: 'Online Gateway', code: 'ONLINE', enabled: false, requiresReference: true },
  { id: 'pm7', name: 'Demand Draft', code: 'DD', enabled: true, requiresReference: true },
];

let docTypesDb: DocType[] = [
  { id: 'dt1', name: 'Birth Certificate', required: true, maxSizeMB: 5, allowedFormats: ['pdf', 'jpg', 'png'] },
  { id: 'dt2', name: 'Aadhaar Card', required: true, maxSizeMB: 5, allowedFormats: ['pdf', 'jpg', 'png'] },
  { id: 'dt3', name: 'Previous School TC', required: false, maxSizeMB: 5, allowedFormats: ['pdf'] },
  { id: 'dt4', name: 'Passport Photo', required: true, maxSizeMB: 2, allowedFormats: ['jpg', 'png'] },
  { id: 'dt5', name: 'Address Proof', required: true, maxSizeMB: 5, allowedFormats: ['pdf', 'jpg', 'png'] },
  { id: 'dt6', name: 'Medical Certificate', required: false, maxSizeMB: 5, allowedFormats: ['pdf'] },
  { id: 'dt7', name: 'Caste Certificate', required: false, maxSizeMB: 5, allowedFormats: ['pdf', 'jpg'] },
  { id: 'dt8', name: 'Income Certificate', required: false, maxSizeMB: 5, allowedFormats: ['pdf'] },
];

let gradesDb: GradeRule[] = [
  { id: 'g1', grade: 'A+', minPct: 91, maxPct: 100, gpa: 10, remark: 'Outstanding' },
  { id: 'g2', grade: 'A', minPct: 81, maxPct: 90, gpa: 9, remark: 'Excellent' },
  { id: 'g3', grade: 'B+', minPct: 71, maxPct: 80, gpa: 8, remark: 'Very Good' },
  { id: 'g4', grade: 'B', minPct: 61, maxPct: 70, gpa: 7, remark: 'Good' },
  { id: 'g5', grade: 'C+', minPct: 51, maxPct: 60, gpa: 6, remark: 'Above Average' },
  { id: 'g6', grade: 'C', minPct: 41, maxPct: 50, gpa: 5, remark: 'Average' },
  { id: 'g7', grade: 'D', minPct: 33, maxPct: 40, gpa: 4, remark: 'Below Average' },
  { id: 'g8', grade: 'E', minPct: 0, maxPct: 32, gpa: 0, remark: 'Needs Improvement' },
];

let channelsDb: ChannelConfig[] = [
  { id: 'ch1', channel: 'SMS', enabled: true, provider: 'MSG91', settings: [{ label: 'API Key', value: 'msg91_key_****3f8a' }, { label: 'Sender ID', value: 'SCHLMG' }] },
  { id: 'ch2', channel: 'Email', enabled: true, provider: 'SendGrid', settings: [{ label: 'API Key', value: 'SG.****_xK7z' }, { label: 'From Email', value: 'noreply@school.edu' }] },
  { id: 'ch3', channel: 'Push Notifications', enabled: true, provider: 'Firebase (FCM)', settings: [{ label: 'Project ID', value: 'admindesk-prod' }] },
  { id: 'ch4', channel: 'WhatsApp', enabled: false, provider: 'Not configured', settings: [{ label: 'Business API Key', value: '' }] },
];

// ─── Store interface ────────���──────────────────────────────
interface SettingsState {
  roles: Role[]; holidays: Holiday[]; paymentModes: PaymentMode[];
  docTypes: DocType[]; grades: GradeRule[]; channels: ChannelConfig[];
  loading: boolean;

  // Roles
  fetchRoles: () => Promise<void>;
  createRole: (r: Omit<Role, 'id' | 'isSystem' | 'userCount'>) => void;
  updateRole: (id: string, patch: Partial<Role>) => void;
  deleteRole: (id: string) => void;

  // Holidays
  fetchHolidays: () => Promise<void>;
  addHoliday: (h: Omit<Holiday, 'id'>) => void;
  deleteHoliday: (id: string) => void;

  // Payment modes
  fetchPaymentModes: () => Promise<void>;
  addPaymentMode: (pm: Omit<PaymentMode, 'id'>) => void;
  togglePaymentMode: (id: string) => void;
  deletePaymentMode: (id: string) => void;

  // Doc types
  fetchDocTypes: () => Promise<void>;
  addDocType: (dt: Omit<DocType, 'id'>) => void;
  deleteDocType: (id: string) => void;

  // Grades
  fetchGrades: () => Promise<void>;
  addGrade: (g: Omit<GradeRule, 'id'>) => void;
  deleteGrade: (id: string) => void;

  // Channels
  fetchChannels: () => Promise<void>;
  toggleChannel: (id: string) => void;

  // Helpers
  getPermissionGroups: () => typeof permissionGroups;
}

const d = async () => { await new Promise((r) => setTimeout(r, 100)); };

export const useSettingsStore = create<SettingsState>((set) => ({
  roles: [], holidays: [], paymentModes: [], docTypes: [], grades: [], channels: [],
  loading: false,

  // Roles
  fetchRoles: async () => { await d(); set({ roles: [...rolesDb] }); },
  createRole: (r) => {
    const role: Role = { id: crypto.randomUUID(), ...r, userCount: 0, isSystem: false };
    rolesDb.push(role);
    set((s) => ({ roles: [...s.roles, role] }));
  },
  updateRole: (id, patch) => {
    const idx = rolesDb.findIndex((r) => r.id === id);
    if (idx !== -1) rolesDb[idx] = { ...rolesDb[idx], ...patch };
    set((s) => ({ roles: s.roles.map((r) => r.id === id ? { ...r, ...patch } : r) }));
  },
  deleteRole: (id) => {
    rolesDb = rolesDb.filter((r) => r.id !== id);
    set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
  },

  // Holidays
  fetchHolidays: async () => { await d(); set({ holidays: [...holidaysDb].sort((a, b) => a.date.localeCompare(b.date)) }); },
  addHoliday: (h) => {
    const holiday: Holiday = { id: crypto.randomUUID(), ...h };
    holidaysDb.push(holiday);
    set((s) => ({ holidays: [...s.holidays, holiday].sort((a, b) => a.date.localeCompare(b.date)) }));
  },
  deleteHoliday: (id) => {
    holidaysDb = holidaysDb.filter((h) => h.id !== id);
    set((s) => ({ holidays: s.holidays.filter((h) => h.id !== id) }));
  },

  // Payment modes
  fetchPaymentModes: async () => { await d(); set({ paymentModes: [...paymentModesDb] }); },
  addPaymentMode: (pm) => {
    const mode: PaymentMode = { id: crypto.randomUUID(), ...pm };
    paymentModesDb.push(mode);
    set((s) => ({ paymentModes: [...s.paymentModes, mode] }));
  },
  togglePaymentMode: (id) => {
    const pm = paymentModesDb.find((m) => m.id === id);
    if (pm) pm.enabled = !pm.enabled;
    set((s) => ({ paymentModes: s.paymentModes.map((m) => m.id === id ? { ...m, enabled: !m.enabled } : m) }));
  },
  deletePaymentMode: (id) => {
    paymentModesDb = paymentModesDb.filter((m) => m.id !== id);
    set((s) => ({ paymentModes: s.paymentModes.filter((m) => m.id !== id) }));
  },

  // Doc types
  fetchDocTypes: async () => { await d(); set({ docTypes: [...docTypesDb] }); },
  addDocType: (dt) => {
    const type: DocType = { id: crypto.randomUUID(), ...dt };
    docTypesDb.push(type);
    set((s) => ({ docTypes: [...s.docTypes, type] }));
  },
  deleteDocType: (id) => {
    docTypesDb = docTypesDb.filter((t) => t.id !== id);
    set((s) => ({ docTypes: s.docTypes.filter((t) => t.id !== id) }));
  },

  // Grades
  fetchGrades: async () => { await d(); set({ grades: [...gradesDb].sort((a, b) => b.minPct - a.minPct) }); },
  addGrade: (g) => {
    const grade: GradeRule = { id: crypto.randomUUID(), ...g };
    gradesDb.push(grade);
    set((s) => ({ grades: [...s.grades, grade].sort((a, b) => b.minPct - a.minPct) }));
  },
  deleteGrade: (id) => {
    gradesDb = gradesDb.filter((g) => g.id !== id);
    set((s) => ({ grades: s.grades.filter((g) => g.id !== id) }));
  },

  // Channels
  fetchChannels: async () => { await d(); set({ channels: [...channelsDb] }); },
  toggleChannel: (id) => {
    const ch = channelsDb.find((c) => c.id === id);
    if (ch) ch.enabled = !ch.enabled;
    set((s) => ({ channels: s.channels.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c) }));
  },

  getPermissionGroups: () => permissionGroups,
}));
