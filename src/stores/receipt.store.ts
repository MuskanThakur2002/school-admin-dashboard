import { create } from 'zustand';
import { receiptApi } from '@/services/modules/receipt.api';
import { useLedgerStore } from '@/stores/ledger.store';
import type {
  Receipt,
  PostPaymentDto,
  BounceReceiptDto,
  CancelReceiptDto,
  AddSettlementNoteDto,
  UpdateSettlementStatusDto,
} from '@/types/receipt.types';

interface ReceiptState {
  receipts: Receipt[];
  loading: boolean;

  fetchReceipts: () => Promise<void>;
  postPayment: (dto: PostPaymentDto) => Promise<Receipt>;
  bounceReceipt: (dto: BounceReceiptDto) => Promise<void>;
  cancelReceipt: (dto: CancelReceiptDto) => Promise<void>;
  resolveBouncedReceipt: (receiptId: string) => Promise<void>;
  addSettlementNote: (dto: AddSettlementNoteDto) => Promise<void>;
  updateSettlementStatus: (dto: UpdateSettlementStatusDto) => Promise<void>;
}

export const useReceiptStore = create<ReceiptState>((set) => ({
  receipts: [],
  loading: false,

  fetchReceipts: async () => {
    set({ loading: true });
    const data = await receiptApi.getReceipts();
    set({ receipts: data, loading: false });
  },

  postPayment: async (dto: PostPaymentDto) => {
    const created = await receiptApi.postPayment(dto);
    set((s) => ({ receipts: [created, ...s.receipts] }));
    // Re-fetch ledger summaries so /ledger reflects the payment
    await useLedgerStore.getState().fetchSummaries();
    return created;
  },

  bounceReceipt: async (dto: BounceReceiptDto) => {
    const updated = await receiptApi.bounceReceipt(dto);
    set((s) => ({ receipts: s.receipts.map((r) => (r.id === updated.id ? updated : r)) }));
    await useLedgerStore.getState().fetchSummaries();
  },

  cancelReceipt: async (dto: CancelReceiptDto) => {
    const updated = await receiptApi.cancelReceipt(dto);
    set((s) => ({ receipts: s.receipts.map((r) => (r.id === updated.id ? updated : r)) }));
    await useLedgerStore.getState().fetchSummaries();
  },

  resolveBouncedReceipt: async (receiptId: string) => {
    const updated = await receiptApi.resolveBouncedReceipt(receiptId);
    set((s) => ({ receipts: s.receipts.map((r) => (r.id === updated.id ? updated : r)) }));
  },

  addSettlementNote: async (dto: AddSettlementNoteDto) => {
    const updated = await receiptApi.addSettlementNote(dto);
    set((s) => ({ receipts: s.receipts.map((r) => (r.id === updated.id ? updated : r)) }));
  },

  updateSettlementStatus: async (dto: UpdateSettlementStatusDto) => {
    const updated = await receiptApi.updateSettlementStatus(dto);
    set((s) => ({ receipts: s.receipts.map((r) => (r.id === updated.id ? updated : r)) }));
  },
}));
