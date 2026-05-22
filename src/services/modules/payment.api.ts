/**
 * Payment API Layer
 *
 * Endpoints:
 *   GET    /schools/:schoolId/payments?page&limit
 *   POST   /schools/:schoolId/payments
 *   GET    /schools/:schoolId/payments/:id
 *   PUT    /schools/:schoolId/payments/:id
 *   DELETE /schools/:schoolId/payments/:id
 *
 * A payment must reference an existing Debit ledger entry via `ledgerEntryId`.
 * The backend creates the corresponding Credit ledger entry server-side, so
 * the frontend only posts to /payments — no separate ledger write needed.
 */
import { api } from '@/services/api-client';
import type { Payment, CreatePaymentDto, UpdatePaymentDto } from '@/types/payment.types';

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

export interface PaymentListParams {
  page?: number;
  limit?: number;
}

function buildQuery(params?: object): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const paymentApi = {
  /** GET /schools/:schoolId/payments */
  list: async (schoolId: string, params?: PaymentListParams) => {
    const res = await api.get<PaginatedEnvelope<Payment>>(
      `/schools/${schoolId}/payments${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** POST /schools/:schoolId/payments */
  create: async (schoolId: string, body: CreatePaymentDto): Promise<Payment> => {
    // Backend Joi rejects empty strings for transactionRef / receiptNumber —
    // strip them so callers can pass through form state without guarding.
    const clean: Record<string, unknown> = { schoolId, ...body };
    if (clean.transactionRef === '' || clean.transactionRef == null) delete clean.transactionRef;
    if (clean.receiptNumber === '' || clean.receiptNumber == null) delete clean.receiptNumber;
    const res = await api.post<ApiEnvelope<Payment>>(
      `/schools/${schoolId}/payments`,
      clean,
    );
    return res.data;
  },

  /** GET /schools/:schoolId/payments/:id */
  getById: async (schoolId: string, id: string): Promise<Payment> => {
    const res = await api.get<ApiEnvelope<Payment>>(
      `/schools/${schoolId}/payments/${id}`,
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/payments/:id */
  update: async (
    schoolId: string,
    id: string,
    body: UpdatePaymentDto,
  ): Promise<Payment> => {
    const res = await api.put<ApiEnvelope<Payment>>(
      `/schools/${schoolId}/payments/${id}`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/payments/:id */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/payments/${id}`);
  },
};
