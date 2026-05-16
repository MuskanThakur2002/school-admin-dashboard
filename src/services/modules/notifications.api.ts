import { api } from '@/services/api-client';
import type {
  CreateNotificationDto,
  CreateNotificationTemplateDto,
  Notification,
  NotificationTemplate,
  PaginatedListParams,
  PaginatedListResponse,
  UpdateNotificationDto,
} from '@/types/notification.types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

function buildQuery(params?: PaginatedListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const notificationTemplatesApi = {
  /** GET /schools/:schoolId/notification-templates */
  list: async (
    schoolId: string,
    params?: PaginatedListParams,
  ): Promise<PaginatedListResponse<NotificationTemplate>> => {
    const res = await api.get<PaginatedEnvelope<NotificationTemplate>>(
      `/schools/${schoolId}/notification-templates${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** POST /schools/:schoolId/notification-templates */
  create: async (
    schoolId: string,
    body: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplate> => {
    const res = await api.post<ApiEnvelope<NotificationTemplate>>(
      `/schools/${schoolId}/notification-templates`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/notification-templates/:id */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(
      `/schools/${schoolId}/notification-templates/${id}`,
    );
  },
};

export const notificationsApi = {
  /** GET /schools/:schoolId/notifications */
  list: async (
    schoolId: string,
    params?: PaginatedListParams,
  ): Promise<PaginatedListResponse<Notification>> => {
    const res = await api.get<PaginatedEnvelope<Notification>>(
      `/schools/${schoolId}/notifications${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/notifications/:id */
  getById: async (schoolId: string, id: string): Promise<Notification> => {
    const res = await api.get<ApiEnvelope<Notification>>(
      `/schools/${schoolId}/notifications/${id}`,
    );
    return res.data;
  },

  /** POST /schools/:schoolId/notifications */
  create: async (schoolId: string, body: CreateNotificationDto): Promise<Notification> => {
    const res = await api.post<ApiEnvelope<Notification>>(
      `/schools/${schoolId}/notifications`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/notifications/:id */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateNotificationDto,
  ): Promise<Notification> => {
    const res = await api.put<ApiEnvelope<Notification>>(
      `/schools/${schoolId}/notifications/${id}`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/notifications/:id */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/notifications/${id}`);
  },
};
