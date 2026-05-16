import { create } from 'zustand';
import { paymentApi, type PaymentListParams } from '@/services/modules/payment.api';
import { useAuthStore } from '@/stores/auth.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { isSuperAdmin } from '@/types/auth.types';
import type { Payment, CreatePaymentDto } from '@/types/payment.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

interface PaymentState {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;

  fetchPayments: (params?: PaymentListParams) => Promise<Payment[]>;
  createPayment: (dto: CreatePaymentDto) => Promise<Payment>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  total: 0,
  page: 1,
  limit: 25,
  loading: false,
  error: null,

  fetchPayments: async (params) => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const res = await paymentApi.list(schoolId, { page: 1, limit: 100, ...params });
      set({
        payments: res.data,
        total: res.total,
        page: res.page,
        limit: res.limit,
        loading: false,
      });
      return res.data;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return [];
    }
  },

  createPayment: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await paymentApi.create(schoolId, dto);
    set((s) => ({ payments: [created, ...s.payments], total: s.total + 1 }));
    // Backend creates the matching Credit ledger entry server-side. Refresh
    // the ledger view so the new entry shows up.
    await useLedgerStore.getState().fetchLedgers();
    return created;
  },
}));
