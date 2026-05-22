/**
 * Notifications Store
 *
 * Templates + notifications come from the backend (see notifications.api.ts).
 * Triggers are still mock-only — no backend endpoint exists for them yet.
 */
import { create } from 'zustand';
import {
  notificationsApi,
  notificationTemplatesApi,
} from '@/services/modules/notifications.api';
import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  CreateNotificationDto,
  CreateNotificationTemplateDto,
  Notification,
  NotificationTemplate,
  UpdateNotificationDto,
  UpdateNotificationTemplateDto,
} from '@/types/notification.types';

// ─── Triggers (mock-only — no backend) ─────────────────────
export interface NotificationTrigger {
  id: string;
  event: string;
  description: string;
  template: string;
  channels: string[];
  enabled: boolean;
}

const seedTriggers: NotificationTrigger[] = [
  { id: 'tr1', event: 'fee_due', description: 'When a fee installment due date arrives', template: 'Fee Due Reminder', channels: ['sms', 'push'], enabled: true },
  { id: 'tr2', event: 'payment_received', description: 'When a payment is recorded', template: 'Payment Confirmation', channels: ['sms'], enabled: true },
  { id: 'tr3', event: 'admission_approved', description: 'When an application is approved', template: 'Admission Approved', channels: ['email'], enabled: true },
  { id: 'tr4', event: 'attendance_absent', description: 'When a student is marked absent', template: 'Attendance Alert', channels: ['push'], enabled: true },
  { id: 'tr5', event: 'fee_overdue', description: 'When payment is overdue beyond grace period', template: 'Fee Overdue Warning', channels: ['sms', 'email'], enabled: false },
  { id: 'tr6', event: 'exam_scheduled', description: 'When exam schedule is published', template: 'Exam Schedule', channels: ['email', 'push'], enabled: false },
];

// ─── Helpers ───────────────────────────────────────────────
function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

function resolveSchoolIdOptional(): string | null {
  const { user, activeSchoolId } = useAuthStore.getState();
  return isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
}

const DEFAULT_LIMIT = 50;

// ─── Store ─────────────────────────────────────────────────
interface NotificationsState {
  // Templates
  templates: NotificationTemplate[];
  templatesTotal: number;
  templatesPage: number;
  templatesLimit: number;
  templatesLoading: boolean;
  templatesError: string | null;

  // Notifications (delivery records)
  notifications: Notification[];
  notificationsTotal: number;
  notificationsPage: number;
  notificationsLimit: number;
  notificationsLoading: boolean;
  notificationsError: string | null;

  // Triggers (mock)
  triggers: NotificationTrigger[];
  triggersLoading: boolean;

  // Templates actions
  fetchTemplates: (page?: number, limit?: number) => Promise<void>;
  createTemplate: (body: CreateNotificationTemplateDto) => Promise<NotificationTemplate>;
  updateTemplate: (id: string, body: UpdateNotificationTemplateDto) => Promise<NotificationTemplate>;
  deleteTemplate: (id: string) => Promise<void>;

  // Notifications actions
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  getNotification: (id: string) => Promise<Notification>;
  createNotification: (body: CreateNotificationDto) => Promise<Notification>;
  updateNotification: (id: string, body: UpdateNotificationDto) => Promise<Notification>;
  deleteNotification: (id: string) => Promise<void>;
  sendBulk: (
    templateId: string,
    recipientIds: string[],
    channel: string,
  ) => Promise<{ successCount: number; failureCount: number; errors: unknown[] }>;

  // Triggers actions
  fetchTriggers: () => Promise<void>;
  toggleTrigger: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  templates: [],
  templatesTotal: 0,
  templatesPage: 1,
  templatesLimit: DEFAULT_LIMIT,
  templatesLoading: false,
  templatesError: null,

  notifications: [],
  notificationsTotal: 0,
  notificationsPage: 1,
  notificationsLimit: DEFAULT_LIMIT,
  notificationsLoading: false,
  notificationsError: null,

  triggers: [],
  triggersLoading: false,

  // ─── Templates ──────────────────────────────────────────
  fetchTemplates: async (page = 1, limit = DEFAULT_LIMIT) => {
    const schoolId = resolveSchoolIdOptional();
    if (!schoolId) {
      set({ templates: [], templatesTotal: 0, templatesPage: page, templatesLimit: limit, templatesLoading: false });
      return;
    }
    set({ templatesLoading: true, templatesError: null });
    try {
      const res = await notificationTemplatesApi.list(schoolId, { page, limit });
      set({
        templates: res.data,
        templatesTotal: res.total,
        templatesPage: res.page,
        templatesLimit: res.limit,
        templatesLoading: false,
      });
    } catch (err) {
      set({ templatesError: (err as Error).message, templatesLoading: false });
    }
  },

  createTemplate: async (body) => {
    const schoolId = resolveSchoolId();
    const created = await notificationTemplatesApi.create(schoolId, body);
    // Re-fetch the current page so pagination math stays in sync with backend.
    const { templatesPage, templatesLimit } = get();
    await get().fetchTemplates(templatesPage, templatesLimit);
    return created;
  },

  updateTemplate: async (id, body) => {
    const schoolId = resolveSchoolId();
    const updated = await notificationTemplatesApi.update(schoolId, id, body);
    set((s) => ({
      templates: s.templates.map((t) => (t.id === id ? updated : t)),
    }));
    return updated;
  },

  deleteTemplate: async (id) => {
    const schoolId = resolveSchoolId();
    await notificationTemplatesApi.remove(schoolId, id);
    const { templatesPage, templatesLimit, templatesTotal } = get();
    // If we just deleted the last row on this page (and we're not on page 1), step back.
    const remainingOnPage = get().templates.filter((t) => t.id !== id).length;
    const targetPage = remainingOnPage === 0 && templatesPage > 1 ? templatesPage - 1 : templatesPage;
    await get().fetchTemplates(targetPage, templatesLimit);
    // Best-effort: keep totalled count from drifting if backend lags.
    if (get().templatesTotal === templatesTotal) {
      set({ templatesTotal: Math.max(0, templatesTotal - 1) });
    }
  },

  // ─── Notifications ──────────────────────────────────────
  fetchNotifications: async (page = 1, limit = DEFAULT_LIMIT) => {
    const schoolId = resolveSchoolIdOptional();
    if (!schoolId) {
      set({ notifications: [], notificationsTotal: 0, notificationsPage: page, notificationsLimit: limit, notificationsLoading: false });
      return;
    }
    set({ notificationsLoading: true, notificationsError: null });
    try {
      const res = await notificationsApi.list(schoolId, { page, limit });
      set({
        notifications: res.data,
        notificationsTotal: res.total,
        notificationsPage: res.page,
        notificationsLimit: res.limit,
        notificationsLoading: false,
      });
    } catch (err) {
      set({ notificationsError: (err as Error).message, notificationsLoading: false });
    }
  },

  getNotification: async (id) => {
    const schoolId = resolveSchoolId();
    return notificationsApi.getById(schoolId, id);
  },

  createNotification: async (body) => {
    const schoolId = resolveSchoolId();
    const created = await notificationsApi.create(schoolId, body);
    const { notificationsPage, notificationsLimit } = get();
    await get().fetchNotifications(notificationsPage, notificationsLimit);
    return created;
  },

  updateNotification: async (id, body) => {
    const schoolId = resolveSchoolId();
    const updated = await notificationsApi.update(schoolId, id, body);
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? updated : n)),
    }));
    return updated;
  },

  deleteNotification: async (id) => {
    const schoolId = resolveSchoolId();
    await notificationsApi.remove(schoolId, id);
    const { notificationsPage, notificationsLimit, notificationsTotal } = get();
    const remainingOnPage = get().notifications.filter((n) => n.id !== id).length;
    const targetPage = remainingOnPage === 0 && notificationsPage > 1 ? notificationsPage - 1 : notificationsPage;
    await get().fetchNotifications(targetPage, notificationsLimit);
    if (get().notificationsTotal === notificationsTotal) {
      set({ notificationsTotal: Math.max(0, notificationsTotal - 1) });
    }
  },

  sendBulk: async (templateId, recipientIds, channel) => {
    const schoolId = resolveSchoolId();
    const sentAt = new Date().toISOString();
    const items = recipientIds.map((recipientId) => ({
      templateId,
      recipientId,
      channel,
      status: 'pending' as const,
      sentAt,
    }));
    try {
      await notificationsApi.createBulk(schoolId, items);
      return { successCount: recipientIds.length, failureCount: 0, errors: [] };
    } catch (err) {
      return { successCount: 0, failureCount: recipientIds.length, errors: [err] };
    }
  },

  // ─── Triggers (mock) ────────────────────────────────────
  fetchTriggers: async () => {
    set({ triggersLoading: true });
    await new Promise((r) => setTimeout(r, 100));
    set({ triggers: [...seedTriggers], triggersLoading: false });
  },
  toggleTrigger: (id) => {
    const t = seedTriggers.find((x) => x.id === id);
    if (t) t.enabled = !t.enabled;
    set((s) => ({
      triggers: s.triggers.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
    }));
  },
}));

// ─── Re-exports for legacy page imports ────────────────────
export type { NotificationTemplate, Notification } from '@/types/notification.types';
