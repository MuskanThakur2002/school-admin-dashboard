import { create } from 'zustand';
import { paymentApi, type PaymentListParams } from '@/services/modules/payment.api';
import { useAuthStore } from '@/stores/auth.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { isSuperAdmin } from '@/types/auth.types';
import type { Payment, CreatePaymentDto, UpdatePaymentDto } from '@/types/payment.types';

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
  fetchPayment: (id: string) => Promise<Payment>;
  createPayment: (dto: CreatePaymentDto) => Promise<Payment>;
  updatePayment: (id: string, dto: UpdatePaymentDto) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;
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
      const res = await paymentApi.list(schoolId, { page: 1, limit: 25, ...params });
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

  fetchPayment: async (id) => {
    const schoolId = resolveSchoolId();
    const fresh = await paymentApi.getById(schoolId, id);
    set((s) => ({
      payments: s.payments.some((p) => p.id === id)
        ? s.payments.map((p) => (p.id === id ? fresh : p))
        : s.payments,
    }));
    return fresh;
  },

  createPayment: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await paymentApi.create(schoolId, dto);
    set((s) => ({ payments: [created, ...s.payments], total: s.total + 1 }));
    // Refresh ledger so any server-side credit entry shows up. (See
    // tmp/ISSUES.md → "Module: Payments / Receipts" — the auto-create
    // claim is currently unverified.)
    await useLedgerStore.getState().fetchLedgers();
    return created;
  },

  updatePayment: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await paymentApi.update(schoolId, id, dto);
    set((s) => ({
      payments: s.payments.map((p) => (p.id === id ? updated : p)),
    }));
    // Refresh ledger view. NOTE: as of the current backend, a status flip
    // (e.g. Success → Refunded) does NOT reverse the matching credit entry —
    // the ledger stays stale until backend gets the fix tracked in
    // tmp/ISSUES.md → "Module: Payments / Receipts".
    await useLedgerStore.getState().fetchLedgers();
    return updated;
  },

  deletePayment: async (id) => {
    const schoolId = resolveSchoolId();
    await paymentApi.remove(schoolId, id);
    set((s) => ({
      payments: s.payments.filter((p) => p.id !== id),
      total: Math.max(0, s.total - 1),
    }));
    // Same caveat as updatePayment: backend currently does not remove the
    // matching credit entry on delete.
    await useLedgerStore.getState().fetchLedgers();
  },
}));
