import { create } from 'zustand';
import { expenseApi, type Expense, type PostExpenseDto } from '@/services/modules/expense.api';
import { useLedgerStore } from './ledger.store';

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  fetchExpenses: () => Promise<void>;
  postExpense: (dto: PostExpenseDto) => Promise<Expense>;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  loading: false,

  fetchExpenses: async () => {
    set({ loading: true });
    const data = await expenseApi.getExpenses();
    set({ expenses: data, loading: false });
  },

  postExpense: async (dto) => {
    const created = await expenseApi.postExpense(dto);
    set((s) => ({ expenses: [created, ...s.expenses] }));
    // Sync ledger summaries
    useLedgerStore.getState().fetchSummaries();
    return created;
  },
}));
