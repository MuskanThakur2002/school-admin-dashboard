import { create } from 'zustand';
import { reportsApi, type ReportResult } from '@/services/modules/reports.api';

interface ReportsState {
  report: ReportResult | null;
  loading: boolean;
  error: string | null;

  generateReport: (reportId: string) => Promise<ReportResult>;
  clearReport: () => void;
}

export const useReportsStore = create<ReportsState>((set) => ({
  report: null,
  loading: false,
  error: null,

  generateReport: async (reportId: string) => {
    set({ loading: true, error: null });
    try {
      const report = await reportsApi.generateReport(reportId);
      set({ report, loading: false });
      return report;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  clearReport: () => set({ report: null, error: null }),
}));
