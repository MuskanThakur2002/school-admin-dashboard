/**
 * Notifications Store
 * Templates, triggers, and delivery logs.
 * For now these use local mock data — when the backend exists,
 * this would call a notifications API.
 */
import { create } from 'zustand';

// ─── Types ─────────────────────────────────────────────────
export type NotificationChannel = 'sms' | 'email' | 'push';

export interface NotificationTemplate {
  id: string; name: string; channel: NotificationChannel;
  subject?: string; body: string; variables: string[]; lastUsed?: string;
}

export interface NotificationTrigger {
  id: string; event: string; description: string;
  template: string; channels: string[]; enabled: boolean;
}

export interface DeliveryLog {
  id: string; date: string; time: string; recipient: string;
  channel: NotificationChannel; template: string;
  status: 'delivered' | 'failed' | 'pending'; error?: string;
}

// ─── Seed data ─────────────────────────────────────────────
const seedTemplates: NotificationTemplate[] = [
  { id: 't1', name: 'Fee Due Reminder', channel: 'sms', body: 'Dear {{parent_name}}, fee of {{amount}} for {{student_name}} ({{class}}) is due on {{due_date}}.', variables: ['parent_name', 'amount', 'student_name', 'class', 'due_date'], lastUsed: '2026-04-10' },
  { id: 't2', name: 'Payment Confirmation', channel: 'sms', body: 'Payment of {{amount}} received for {{student_name}}. Receipt No: {{receipt_no}}.', variables: ['amount', 'student_name', 'receipt_no'], lastUsed: '2026-04-10' },
  { id: 't3', name: 'Admission Approved', channel: 'email', subject: 'Admission Confirmed — {{school_name}}', body: 'Dear {{parent_name}}, {{student_name}} has been admitted to {{class}}.', variables: ['parent_name', 'student_name', 'class', 'school_name'], lastUsed: '2026-04-09' },
  { id: 't4', name: 'Attendance Alert', channel: 'push', body: '{{student_name}} was marked absent today ({{date}})', variables: ['student_name', 'date'], lastUsed: '2026-04-10' },
  { id: 't5', name: 'Exam Schedule', channel: 'email', subject: 'Exam Schedule — {{term}}', body: 'Please find the exam schedule for {{term}} attached. Exams start on {{start_date}}.', variables: ['term', 'start_date'], lastUsed: '2026-03-20' },
  { id: 't6', name: 'Fee Overdue Warning', channel: 'sms', body: 'URGENT: Fee of {{amount}} for {{student_name}} is overdue by {{days}} days.', variables: ['amount', 'student_name', 'days'] },
];

const seedTriggers: NotificationTrigger[] = [
  { id: 'tr1', event: 'fee_due', description: 'When a fee installment due date arrives', template: 'Fee Due Reminder', channels: ['sms', 'push'], enabled: true },
  { id: 'tr2', event: 'payment_received', description: 'When a payment is recorded', template: 'Payment Confirmation', channels: ['sms'], enabled: true },
  { id: 'tr3', event: 'admission_approved', description: 'When an application is approved', template: 'Admission Approved', channels: ['email'], enabled: true },
  { id: 'tr4', event: 'attendance_absent', description: 'When a student is marked absent', template: 'Attendance Alert', channels: ['push'], enabled: true },
  { id: 'tr5', event: 'fee_overdue', description: 'When payment is overdue beyond grace period', template: 'Fee Overdue Warning', channels: ['sms', 'email'], enabled: false },
  { id: 'tr6', event: 'exam_scheduled', description: 'When exam schedule is published', template: 'Exam Schedule', channels: ['email', 'push'], enabled: false },
];

const seedLogs: DeliveryLog[] = [
  { id: 'dl1', date: '2026-04-11', time: '09:30', recipient: 'Rajesh Patel (9876543210)', channel: 'sms', template: 'Fee Due Reminder', status: 'delivered' },
  { id: 'dl2', date: '2026-04-11', time: '09:30', recipient: 'Vikram Sharma (9876543211)', channel: 'sms', template: 'Fee Due Reminder', status: 'delivered' },
  { id: 'dl3', date: '2026-04-11', time: '09:31', recipient: 'Sunil Gupta (9876543212)', channel: 'sms', template: 'Fee Due Reminder', status: 'failed', error: 'Invalid phone number' },
  { id: 'dl4', date: '2026-04-10', time: '14:15', recipient: 'neha.k@email.com', channel: 'email', template: 'Admission Approved', status: 'delivered' },
  { id: 'dl5', date: '2026-04-10', time: '11:00', recipient: 'Arjun Patel (Push)', channel: 'push', template: 'Attendance Alert', status: 'delivered' },
  { id: 'dl6', date: '2026-04-10', time: '11:00', recipient: 'Kabir Singh (Push)', channel: 'push', template: 'Attendance Alert', status: 'pending' },
  { id: 'dl7', date: '2026-04-09', time: '16:45', recipient: 'Harpreet Singh (9876543214)', channel: 'sms', template: 'Payment Confirmation', status: 'delivered' },
  { id: 'dl8', date: '2026-04-09', time: '10:20', recipient: 'amit.d@email.com', channel: 'email', template: 'Fee Overdue Warning', status: 'failed', error: 'Mailbox full' },
  { id: 'dl9', date: '2026-04-08', time: '08:00', recipient: 'All Parents (Push)', channel: 'push', template: 'Exam Schedule', status: 'delivered' },
];

// ─── Store ─────────────────────────────────────────────────
interface NotificationsState {
  templates: NotificationTemplate[];
  triggers: NotificationTrigger[];
  logs: DeliveryLog[];
  loading: boolean;

  fetchTemplates: () => Promise<void>;
  createTemplate: (t: Omit<NotificationTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;

  fetchTriggers: () => Promise<void>;
  toggleTrigger: (id: string) => void;

  fetchLogs: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  templates: [],
  triggers: [],
  logs: [],
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 100));
    set({ templates: [...seedTemplates], loading: false });
  },
  createTemplate: (t) => {
    const created: NotificationTemplate = { ...t, id: crypto.randomUUID() };
    seedTemplates.push(created);
    set((s) => ({ templates: [...s.templates, created] }));
  },
  deleteTemplate: (id) => {
    const idx = seedTemplates.findIndex((t) => t.id === id);
    if (idx !== -1) seedTemplates.splice(idx, 1);
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },

  fetchTriggers: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 100));
    set({ triggers: [...seedTriggers], loading: false });
  },
  toggleTrigger: (id) => {
    const t = seedTriggers.find((x) => x.id === id);
    if (t) t.enabled = !t.enabled;
    set((s) => ({ triggers: s.triggers.map((x) => x.id === id ? { ...x, enabled: !x.enabled } : x) }));
  },

  fetchLogs: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 100));
    set({ logs: [...seedLogs], loading: false });
  },
}));
