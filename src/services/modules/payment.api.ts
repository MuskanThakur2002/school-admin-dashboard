/**
 * Payment API Layer
 *
 * Endpoints:
 *   GET  /schools/:schoolId/payments?page&limit
 *   POST /schools/:schoolId/payments
 *
 * A payment must reference an existing Debit ledger entry via `ledgerEntryId`.
 * The backend creates the corresponding Credit ledger entry server-side, so
 * the frontend only posts to /payments — no separate ledger write needed.
 */
import { api } from '@/services/api-client';
import type { Payment, CreatePaymentDto } from '@/types/payment.types';

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
    const res = await api.post<ApiEnvelope<Payment>>(
      `/schools/${schoolId}/payments`,
      { schoolId, ...body },
    );
    return res.data;
  },
};
