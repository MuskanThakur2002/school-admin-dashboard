/**
 * Ledger API Layer
 *
 * Endpoints (note the singular/plural quirk):
 *   GET    /schools/:schoolId/ledgers              — list, paginated
 *   POST   /schools/:schoolId/ledgers              — create entry
 *   GET    /schools/:schoolId/ledger/:id           — get one
 *   PUT    /schools/:schoolId/ledger/:id           — update
 *
 * `runningBalance` is sent as 0 on writes — the backend recomputes the
 * real value from prior entries for the enrollment/year.
 */
import { api } from '@/services/api-client';
import type {
  LedgerEntry,
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
} from '@/types/ledger.types';

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

export interface LedgerListParams {
  page?: number;
  limit?: number;
  studentEnrollmentId?: string;
  academicYearId?: string;
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

export const ledgerApi = {
  /** GET /schools/:schoolId/ledgers */
  list: async (schoolId: string, params?: LedgerListParams) => {
    const res = await api.get<PaginatedEnvelope<LedgerEntry>>(
      `/schools/${schoolId}/ledgers${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/ledger/:id  (singular) */
  getById: async (schoolId: string, id: string): Promise<LedgerEntry> => {
    const res = await api.get<ApiEnvelope<LedgerEntry>>(`/schools/${schoolId}/ledger/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/ledgers */
  create: async (schoolId: string, body: CreateLedgerEntryDto): Promise<LedgerEntry> => {
    const res = await api.post<ApiEnvelope<LedgerEntry>>(
      `/schools/${schoolId}/ledgers`,
      { schoolId, ...body },
    );
    return res.data;
  },

  /** PUT /schools/:schoolId/ledger/:id  (singular) */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateLedgerEntryDto,
  ): Promise<LedgerEntry> => {
    const res = await api.put<ApiEnvelope<LedgerEntry>>(
      `/schools/${schoolId}/ledger/${id}`,
      { schoolId, ...body },
    );
    return res.data;
  },
};
