import { create } from 'zustand';
import { adjustmentApi, type Adjustment, type PostAdjustmentDto } from '@/services/modules/adjustment.api';
import { useLedgerStore } from './ledger.store';

interface AdjustmentState {
  adjustments: Adjustment[];
  loading: boolean;
  fetchAdjustments: () => Promise<void>;
  postAdjustment: (dto: PostAdjustmentDto) => Promise<Adjustment>;
}

export const useAdjustmentStore = create<AdjustmentState>((set) => ({
  adjustments: [],
  loading: false,

  fetchAdjustments: async () => {
    set({ loading: true });
    const data = await adjustmentApi.getAdjustments();
    set({ adjustments: data, loading: false });
  },

  postAdjustment: async (dto) => {
    const created = await adjustmentApi.postAdjustment(dto);
    set((s) => ({ adjustments: [created, ...s.adjustments] }));
    // Sync ledger summaries
    useLedgerStore.getState().fetchSummaries();
    return created;
  },
}));
