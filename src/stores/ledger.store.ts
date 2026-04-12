import { create } from 'zustand';
import { ledgerApi } from '@/services/modules/ledger.api';
import type {
  LedgerEntry,
  StudentLedgerSummary,
  CreateLedgerEntryDto,
  InitializeLedgerDto,
} from '@/types/ledger.types';

interface LedgerState {
  summaries: StudentLedgerSummary[];
  entries: LedgerEntry[];
  loading: boolean;

  fetchSummaries: () => Promise<void>;
  fetchStudentLedger: (studentId: string) => Promise<void>;
  postPayment: (dto: CreateLedgerEntryDto) => Promise<void>;
  initializeLedger: (dto: InitializeLedgerDto) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set) => ({
  summaries: [],
  entries: [],
  loading: false,

  fetchSummaries: async () => {
    set({ loading: true });
    const data = await ledgerApi.getLedgerSummaries();
    set({ summaries: data, loading: false });
  },

  fetchStudentLedger: async (studentId: string) => {
    set({ loading: true });
    const data = await ledgerApi.getStudentLedger(studentId);
    set({ entries: data, loading: false });
  },

  postPayment: async (dto: CreateLedgerEntryDto) => {
    await ledgerApi.createEntry(dto);
    // Re-fetch both the student ledger and all summaries
    const [entries, summaries] = await Promise.all([
      ledgerApi.getStudentLedger(dto.studentId),
      ledgerApi.getLedgerSummaries(),
    ]);
    set({ entries, summaries });
  },

  initializeLedger: async (dto: InitializeLedgerDto) => {
    await ledgerApi.initializeLedger(dto);
  },
}));
