export type NotificationChannel = 'sms' | 'email' | 'push' | string;

export interface NotificationTemplate {
  id: string;
  schoolId: string;
  name: string;
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  triggerEvent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationTemplateDto {
  name: string;
  channel: string;
  subject?: string;
  body: string;
  triggerEvent?: string;
}

export interface Notification {
  id: string;
  schoolId: string;
  templateId: string;
  recipientId: string;
  channel: NotificationChannel;
  status: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  templateId: string;
  recipientId: string;
  channel: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

export type UpdateNotificationDto = Partial<CreateNotificationDto>;

export interface PaginatedListParams {
  page?: number;
  limit?: number;
}

export interface PaginatedListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
