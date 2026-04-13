import { create } from 'zustand';
import { academicApi } from '@/services/modules/academic.api';
import type {
  AcademicYear, ClassGroup, Section, Subject, TimetableSlot, House,
  CreateAcademicYearDto, CreateClassDto, CreateSectionDto,
  CreateSubjectDto, CreateTimetableSlotDto, CreateHouseDto,
  RolloverPreview, RolloverRequest, RolloverResult,
} from '@/types/academic.types';

interface AcademicState {
  // Data
  years: AcademicYear[];
  classes: ClassGroup[];
  subjects: Subject[];
  houses: House[];

  // Loading flags
  yearsLoading: boolean;
  classesLoading: boolean;
  subjectsLoading: boolean;
  housesLoading: boolean;

  error: string | null;

  // ─── Years ─────────────────────────────────────
  fetchYears: () => Promise<void>;
  createYear: (dto: CreateAcademicYearDto) => Promise<AcademicYear>;
  activateYear: (id: string) => Promise<void>;

  // ─── Classes & Sections ────────────────────────
  fetchClasses: () => Promise<void>;
  createClass: (dto: CreateClassDto) => Promise<ClassGroup>;
  deleteClass: (id: string) => Promise<void>;
  addSection: (dto: CreateSectionDto) => Promise<Section>;
  deleteSection: (classId: string, sectionId: string) => Promise<void>;

  // ─── Subjects ──────────────────────────────────
  fetchSubjects: () => Promise<void>;
  createSubject: (dto: CreateSubjectDto) => Promise<Subject>;
  deleteSubject: (id: string) => Promise<void>;

  // ─── Timetable ─────────────────────────────────
  getTimetable: (classId: string, sectionId: string) => Promise<TimetableSlot[]>;
  setTimetableSlot: (dto: CreateTimetableSlotDto) => Promise<TimetableSlot>;
  clearTimetableSlot: (slotId: string) => Promise<void>;

  // ─── Houses ────────────────────────────────────
  fetchHouses: () => Promise<void>;
  createHouse: (dto: CreateHouseDto) => Promise<House>;
  deleteHouse: (id: string) => Promise<void>;

  // ─── Rollover ──────────────────────────────────
  getRolloverPreview: (sourceYearId: string, targetYearId: string) => Promise<RolloverPreview>;
  executeRollover: (req: RolloverRequest) => Promise<RolloverResult>;
}

export const useAcademicStore = create<AcademicState>((set) => ({
  years: [],
  classes: [],
  subjects: [],
  houses: [],
  yearsLoading: false,
  classesLoading: false,
  subjectsLoading: false,
  housesLoading: false,
  error: null,

  // ─── Years ─────────────────────────────────────
  fetchYears: async () => {
    set({ yearsLoading: true, error: null });
    try {
      const data = await academicApi.getYears();
      set({ years: data, yearsLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, yearsLoading: false });
    }
  },

  createYear: async (dto) => {
    const created = await academicApi.createYear(dto);
    set((state) => ({ years: [created, ...state.years] }));
    return created;
  },

  activateYear: async (id) => {
    await academicApi.activateYear(id);
    const fresh = await academicApi.getYears();
    set({ years: fresh });
  },

  // ─── Classes & Sections ────────────────────────
  fetchClasses: async () => {
    set({ classesLoading: true, error: null });
    try {
      const data = await academicApi.getClasses();
      set({ classes: data, classesLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, classesLoading: false });
    }
  },

  createClass: async (dto) => {
    const created = await academicApi.createClass(dto);
    const fresh = await academicApi.getClasses();
    set({ classes: fresh });
    return created;
  },

  deleteClass: async (id) => {
    await academicApi.deleteClass(id);
    set((state) => ({ classes: state.classes.filter((c) => c.id !== id) }));
  },

  addSection: async (dto) => {
    const section = await academicApi.addSection(dto);
    const fresh = await academicApi.getClasses();
    set({ classes: fresh });
    return section;
  },

  deleteSection: async (classId, sectionId) => {
    await academicApi.deleteSection(classId, sectionId);
    const fresh = await academicApi.getClasses();
    set({ classes: fresh });
  },

  // ─── Subjects ──────────────────────────────────
  fetchSubjects: async () => {
    set({ subjectsLoading: true, error: null });
    try {
      const data = await academicApi.getSubjects();
      set({ subjects: data, subjectsLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, subjectsLoading: false });
    }
  },

  createSubject: async (dto) => {
    const created = await academicApi.createSubject(dto);
    set((state) => ({ subjects: [...state.subjects, created] }));
    return created;
  },

  deleteSubject: async (id) => {
    await academicApi.deleteSubject(id);
    set((state) => ({ subjects: state.subjects.filter((s) => s.id !== id) }));
  },

  // ─── Timetable ─────────────────────────────────
  getTimetable: (classId, sectionId) => academicApi.getTimetable(classId, sectionId),
  setTimetableSlot: (dto) => academicApi.setTimetableSlot(dto),
  clearTimetableSlot: (slotId) => academicApi.clearTimetableSlot(slotId),

  // ─── Houses ────────────────────────────────────
  fetchHouses: async () => {
    set({ housesLoading: true, error: null });
    try {
      const data = await academicApi.getHouses();
      set({ houses: data, housesLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, housesLoading: false });
    }
  },

  createHouse: async (dto) => {
    const created = await academicApi.createHouse(dto);
    set((state) => ({ houses: [...state.houses, created] }));
    return created;
  },

  deleteHouse: async (id) => {
    await academicApi.deleteHouse(id);
    set((state) => ({ houses: state.houses.filter((h) => h.id !== id) }));
  },

  // ─── Rollover ──────────────────────────────────
  getRolloverPreview: (sourceYearId, targetYearId) =>
    academicApi.getRolloverPreview(sourceYearId, targetYearId),

  executeRollover: async (req) => {
    const result = await academicApi.executeRollover(req);
    // Refresh years after rollover
    const fresh = await academicApi.getYears();
    set({ years: fresh });
    return result;
  },
}));
