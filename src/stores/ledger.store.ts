import { create } from 'zustand';
import { ledgerApi, type LedgerListParams } from '@/services/modules/ledger.api';
import { useAuthStore } from '@/stores/auth.store';
import { useAcademicStore } from '@/stores/academic.store';
import { useEnrollmentStore } from '@/stores/enrollment.store';
import { isSuperAdmin } from '@/types/auth.types';
import type {
  LedgerEntry,
  StudentLedgerSummary,
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
  LedgerStatus,
} from '@/types/ledger.types';
import type { StudentEnrollment } from '@/types/student.types';

function resolveSchoolId(): string {
  const { user, activeSchoolId } = useAuthStore.getState();
  const id = isSuperAdmin(user) ? activeSchoolId : user?.schoolId ?? null;
  if (!id) throw new Error('No active school selected');
  return id;
}

function resolveActiveYearId(): string | null {
  const { years } = useAcademicStore.getState();
  return years.find((y) => y.isCurrent)?.id ?? years[0]?.id ?? null;
}

function deriveStatus(balance: number, totalPaid: number, oldestDebitDate: string): LedgerStatus {
  if (balance < 0) return 'overpaid';
  if (balance === 0) return 'clear';
  // balance > 0 from here
  if (oldestDebitDate) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    if (oldestDebitDate < cutoffStr) return 'overdue';
  }
  return totalPaid === 0 ? 'unpaid' : 'partial';
}

function buildSummaries(
  entries: LedgerEntry[],
  enrollmentsById: Map<string, StudentEnrollment>,
  classNameById: Map<string, string>,
): StudentLedgerSummary[] {
  const groups = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.studentEnrollmentId) ?? [];
    list.push(e);
    groups.set(e.studentEnrollmentId, list);
  }

  const summaries: StudentLedgerSummary[] = [];
  for (const [enrollmentId, group] of groups) {
    const enrollment = enrollmentsById.get(enrollmentId);
    const totalDue = group
      .filter((e) => e.entryType === 'Debit')
      .reduce((s, e) => s + Number(e.amount), 0);
    const totalPaid = group
      .filter((e) => e.entryType === 'Credit')
      .reduce((s, e) => s + Number(e.amount), 0);
    const balance = totalDue - totalPaid;

    const credits = group
      .filter((e) => e.entryType === 'Credit')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastPaymentDate = credits[0]?.createdAt.slice(0, 10) ?? '';

    // Latest entry of any type (Debit or Credit) — drives the "Last Activity"
    // column so freshly-billed students with no payment still show a date.
    const sortedDesc = [...group].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const lastActivityDate = sortedDesc[0]?.createdAt.slice(0, 10) ?? '';

    // Oldest Debit drives the "overdue" threshold. We use the oldest Debit
    // (not the oldest *unpaid* Debit) as a proxy since per-Debit settlement
    // isn't tracked client-side.
    const debits = group
      .filter((e) => e.entryType === 'Debit')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const oldestDebitDate = debits[0]?.createdAt.slice(0, 10) ?? '';

    const classMasterId = enrollment?.classSection?.classMasterId;
    summaries.push({
      studentEnrollmentId: enrollmentId,
      studentId: enrollment?.studentId ?? '',
      studentName: enrollment?.student?.name ?? '',
      admissionNo: enrollment?.student?.admissionNumber ?? '',
      class: classMasterId ? classNameById.get(classMasterId) ?? '' : '',
      section: enrollment?.classSection?.section ?? '',
      totalDue,
      totalPaid,
      balance,
      lastPaymentDate,
      lastActivityDate,
      status: deriveStatus(balance, totalPaid, oldestDebitDate),
      overpaymentAmount: balance < 0 ? Math.abs(balance) : 0,
    });
  }
  return summaries;
}

interface LedgerState {
  entries: LedgerEntry[];
  summaries: StudentLedgerSummary[];
  total: number;
  loading: boolean;
  error: string | null;

  // List ledger entries, defaulting to the active academic year.
  fetchLedgers: (params?: LedgerListParams) => Promise<LedgerEntry[]>;
  // Alias kept for callers that need to trigger a refresh after a mutation.
  fetchSummaries: () => Promise<void>;
  // Fetch entries for a single enrollment in the active year (or explicit year).
  fetchEnrollmentLedger: (
    studentEnrollmentId: string,
    academicYearId?: string,
  ) => Promise<LedgerEntry[]>;
  getEntry: (id: string) => Promise<LedgerEntry>;
  createEntry: (dto: CreateLedgerEntryDto) => Promise<LedgerEntry>;
  updateEntry: (id: string, dto: UpdateLedgerEntryDto) => Promise<LedgerEntry>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  entries: [],
  summaries: [],
  total: 0,
  loading: false,
  error: null,

  fetchLedgers: async (params) => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const academicYearId = params?.academicYearId ?? resolveActiveYearId() ?? undefined;
      const res = await ledgerApi.list(schoolId, {
        page: 1,
        limit: 500,
        ...params,
        ...(academicYearId ? { academicYearId } : {}),
      });

      // Make sure enrollments are loaded so we can hydrate names/classes.
      let enrollments = useEnrollmentStore.getState().enrollments;
      if (enrollments.length === 0) {
        enrollments = await useEnrollmentStore.getState().fetchEnrollments({
          ...(academicYearId ? { academicYearId } : {}),
        });
      }
      const enrollmentsById = new Map(enrollments.map((e) => [e.id, e]));

      // Classes give us human-readable names (e.g. "VIII") for the list view.
      const academic = useAcademicStore.getState();
      if (academic.classes.length === 0) {
        await academic.fetchClasses();
      }
      const classNameById = new Map(
        useAcademicStore.getState().classes.map((c) => [c.id, c.shortName || c.name]),
      );

      const summaries = buildSummaries(res.data, enrollmentsById, classNameById);
      set({ entries: res.data, summaries, total: res.total, loading: false });
      return res.data;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return [];
    }
  },

  fetchSummaries: async () => {
    await get().fetchLedgers();
  },

  fetchEnrollmentLedger: async (studentEnrollmentId, academicYearId) => {
    set({ loading: true, error: null });
    try {
      const schoolId = resolveSchoolId();
      const yearId = academicYearId ?? resolveActiveYearId() ?? undefined;
      const res = await ledgerApi.list(schoolId, {
        page: 1,
        limit: 500,
        studentEnrollmentId,
        ...(yearId ? { academicYearId: yearId } : {}),
      });
      // Sort chronologically so the journal reads top→bottom oldest→newest.
      const sorted = [...res.data].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      set({ entries: sorted, loading: false });
      return sorted;
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      return [];
    }
  },

  getEntry: async (id) => {
    const schoolId = resolveSchoolId();
    return ledgerApi.getById(schoolId, id);
  },

  createEntry: async (dto) => {
    const schoolId = resolveSchoolId();
    const created = await ledgerApi.create(schoolId, dto);
    set((s) => ({ entries: [...s.entries, created] }));
    return created;
  },

  updateEntry: async (id, dto) => {
    const schoolId = resolveSchoolId();
    const updated = await ledgerApi.update(schoolId, id, dto);
    set((s) => ({ entries: s.entries.map((e) => (e.id === id ? updated : e)) }));
    return updated;
  },

  deleteEntry: async (id) => {
    const schoolId = resolveSchoolId();
    await ledgerApi.remove(schoolId, id);
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      total: Math.max(0, s.total - 1),
    }));
  },
}));
