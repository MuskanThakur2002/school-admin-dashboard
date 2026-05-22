/**
 * Academic Setup API Layer
 * Academic Years, Classes (class-masters), Sections (class-sections),
 * Subjects, and Timetable Slots use the real backend. Houses and rollover
 * are still mocked.
 */
import { api } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  AcademicYear, ClassGroup, Section, Subject, TimetableSlot,
  CreateAcademicYearDto, UpdateAcademicYearDto,
  CreateClassDto, UpdateClassDto, CreateSectionDto, UpdateSectionDto,
  CreateSubjectDto, UpdateSubjectDto, CreateTimetableSlotDto, DayOfWeek,
  House, CreateHouseDto, AssignHouseDto,
  RolloverPreview, RolloverRequest, RolloverResult,
} from '@/types/academic.types';

const NETWORK_DELAY_MS = 150;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

// ─── Academic Year backend wire format & mappers ──────────
interface BackendAcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

function resolveSchoolId(): string {
  const { activeSchoolId, user } = useAuthStore.getState();
  const schoolId = activeSchoolId ?? user?.schoolId ?? null;
  if (!schoolId) {
    throw new Error('No active school selected. Please choose a school first.');
  }
  return schoolId;
}

function mapYear(b: BackendAcademicYear): AcademicYear {
  return {
    id: b.id,
    schoolId: b.schoolId,
    name: b.name,
    startDate: b.startDate,
    endDate: b.endDate,
    isCurrent: b.isCurrent,
    status: b.isCurrent ? 'active' : 'upcoming',
    totalStudents: 0,
    totalClasses: 0,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

// ─── Class Master / Section backend wire format & mappers ─
interface BackendClassMaster {
  id: string;
  schoolId: string;
  name: string;
  gradeLevel: number;
  createdAt?: string;
  updatedAt?: string;
  classSections?: BackendClassSection[];
}

interface BackendClassSection {
  id: string;
  schoolId: string;
  classMasterId: string;
  academicYearId: string;
  section: string;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  classMaster?: BackendClassMaster;
  academicYear?: BackendAcademicYear;
}

function mapSection(b: BackendClassSection): Section {
  return {
    id: b.id,
    name: b.section,
    classMasterId: b.classMasterId,
    academicYearId: b.academicYearId,
    status: b.status ?? null,
    schoolId: b.schoolId,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    // Defaults for legacy mock-driven UI compatibility:
    classTeacher: '',
    studentCount: 0,
    capacity: 0,
  };
}

// ─── Subject backend wire format & mapper ─────────────────
interface BackendSubject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapSubject(b: BackendSubject): Subject {
  return {
    id: b.id,
    schoolId: b.schoolId,
    name: b.name,
    code: b.code,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function mapClass(b: BackendClassMaster, sections: Section[] = []): ClassGroup {
  return {
    id: b.id,
    name: b.name,
    gradeLevel: b.gradeLevel,
    sections,
    schoolId: b.schoolId,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    // Legacy aliases for sibling pages still on mock data:
    shortName: b.name,
    grade: b.gradeLevel,
  };
}

// ─── Mock DBs ──────────────────────────────────────────────
// Fixed period grid the UI renders against. Backend stores arbitrary
// start/end times per slot, so on read we match `startTime` back to one
// of these entries to derive a period number.
const periodTimes = [
  { period: 1, start: '09:00', end: '09:45' },
  { period: 2, start: '09:45', end: '10:30' },
  { period: 3, start: '10:45', end: '11:30' },
  { period: 4, start: '11:30', end: '12:15' },
  { period: 5, start: '13:00', end: '13:45' },
  { period: 6, start: '13:45', end: '14:30' },
];

// ─── Timetable Slot backend wire format & mappers ─────────
interface BackendTimetableSlot {
  id: string;
  schoolId: string;
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "09:00" or "09:00:00"
  endTime: string;
  createdAt?: string;
  updatedAt?: string;
  subject?: { id: string; name: string; code: string };
  teacher?: { id: string; user?: { id: string; name: string } };
}

const dayByNum: Record<number, DayOfWeek> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};
const numByDay: Record<DayOfWeek, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const trimTime = (t: string): string => t.slice(0, 5); // "09:00:00" → "09:00"

let housesDb: House[] = [
  { id: 'h1', name: 'Red House', color: '#DC2626', motto: 'Courage and strength', captainName: 'Aarav Patel', studentCount: 58 },
  { id: 'h2', name: 'Blue House', color: '#2563EB', motto: 'Wisdom and integrity', captainName: 'Priya Sharma', studentCount: 62 },
  { id: 'h3', name: 'Green House', color: '#16A34A', motto: 'Growth and harmony', captainName: 'Rohan Gupta', studentCount: 55 },
  { id: 'h4', name: 'Yellow House', color: '#CA8A04', motto: 'Joy and perseverance', captainName: 'Ananya Reddy', studentCount: 60 },
];

// ─── Helpers ───────────────────────────────────────────────
const sortClasses = (arr: ClassGroup[]) => [...arr].sort((a, b) => a.gradeLevel - b.gradeLevel);

// ═════════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════════

export const academicApi = {
  // ─── Academic Years ─────────────────────────────────────
  /** GET /schools/:schoolId/academic-years */
  getYears: async (): Promise<AcademicYear[]> => {
    const schoolId = resolveSchoolId();
    const res = await api.get<PaginatedEnvelope<BackendAcademicYear>>(
      `/schools/${schoolId}/academic-years?page=1&limit=100`,
    );
    return (res.data ?? []).map(mapYear);
  },

  /** GET /schools/:schoolId/academic-years/:id */
  getYear: async (id: string): Promise<AcademicYear> => {
    const schoolId = resolveSchoolId();
    const res = await api.get<ApiEnvelope<BackendAcademicYear>>(
      `/schools/${schoolId}/academic-years/${id}`,
    );
    return mapYear(res.data);
  },

  /** POST /schools/:schoolId/academic-years */
  createYear: async (dto: CreateAcademicYearDto): Promise<AcademicYear> => {
    const schoolId = resolveSchoolId();
    const res = await api.post<ApiEnvelope<BackendAcademicYear>>(
      `/schools/${schoolId}/academic-years`,
      dto,
    );
    return mapYear(res.data);
  },

  /** PUT /schools/:schoolId/academic-years/:id */
  updateYear: async (id: string, dto: UpdateAcademicYearDto): Promise<AcademicYear> => {
    const schoolId = resolveSchoolId();
    const res = await api.put<ApiEnvelope<BackendAcademicYear>>(
      `/schools/${schoolId}/academic-years/${id}`,
      dto,
    );
    return mapYear(res.data);
  },

  /** Activate by setting isCurrent=true via PUT. */
  activateYear: async (id: string): Promise<AcademicYear> => {
    const schoolId = resolveSchoolId();
    const res = await api.put<ApiEnvelope<BackendAcademicYear>>(
      `/schools/${schoolId}/academic-years/${id}`,
      { isCurrent: true },
    );
    return mapYear(res.data);
  },

  /** DELETE /schools/:schoolId/academic-years/:id */
  deleteYear: async (id: string): Promise<void> => {
    const schoolId = resolveSchoolId();
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/academic-years/${id}`);
  },

  // ─── Classes (class-masters) & Sections (class-sections) ──
  /**
   * GET /schools/:schoolId/class-masters and /class-sections in parallel,
   * then merge sections under their parent class. The list endpoints don't
   * accept a filter for the active academic year, so we pull everything and
   * group client-side.
   */
  getClasses: async (): Promise<ClassGroup[]> => {
    const schoolId = resolveSchoolId();
    const [classRes, sectionRes] = await Promise.all([
      api.get<PaginatedEnvelope<BackendClassMaster>>(
        `/schools/${schoolId}/class-masters?page=1&limit=100`,
      ),
      api.get<PaginatedEnvelope<BackendClassSection>>(
        `/schools/${schoolId}/class-sections?page=1&limit=500`,
      ),
    ]);

    const sectionsByClass = new Map<string, Section[]>();
    for (const s of sectionRes.data ?? []) {
      const list = sectionsByClass.get(s.classMasterId) ?? [];
      list.push(mapSection(s));
      sectionsByClass.set(s.classMasterId, list);
    }

    const merged = (classRes.data ?? []).map((c) =>
      mapClass(c, (sectionsByClass.get(c.id) ?? []).sort((a, b) => a.name.localeCompare(b.name))),
    );
    return sortClasses(merged);
  },

  /** GET /schools/:schoolId/class-masters/:id */
  getClass: async (id: string): Promise<ClassGroup> => {
    const schoolId = resolveSchoolId();
    const res = await api.get<ApiEnvelope<BackendClassMaster>>(
      `/schools/${schoolId}/class-masters/${id}`,
    );
    const sections = (res.data.classSections ?? []).map(mapSection);
    return mapClass(res.data, sections);
  },

  /** POST /schools/:schoolId/class-masters */
  createClass: async (dto: CreateClassDto): Promise<ClassGroup> => {
    const schoolId = resolveSchoolId();
    const res = await api.post<ApiEnvelope<BackendClassMaster>>(
      `/schools/${schoolId}/class-masters`,
      { name: dto.name, gradeLevel: dto.gradeLevel },
    );
    return mapClass(res.data);
  },

  /** PUT /schools/:schoolId/class-masters/:id */
  updateClass: async (id: string, dto: UpdateClassDto): Promise<ClassGroup> => {
    const schoolId = resolveSchoolId();
    const res = await api.put<ApiEnvelope<BackendClassMaster>>(
      `/schools/${schoolId}/class-masters/${id}`,
      dto,
    );
    return mapClass(res.data);
  },

  /** DELETE /schools/:schoolId/class-masters/:id */
  deleteClass: async (id: string): Promise<void> => {
    const schoolId = resolveSchoolId();
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/class-masters/${id}`);
  },

  /** POST /schools/:schoolId/class-sections */
  addSection: async (dto: CreateSectionDto): Promise<Section> => {
    const schoolId = resolveSchoolId();
    const res = await api.post<ApiEnvelope<BackendClassSection>>(
      `/schools/${schoolId}/class-sections`,
      dto,
    );
    return mapSection(res.data);
  },

  /** PUT /schools/:schoolId/class-sections/:id */
  updateSection: async (id: string, dto: UpdateSectionDto): Promise<Section> => {
    const schoolId = resolveSchoolId();
    const res = await api.put<ApiEnvelope<BackendClassSection>>(
      `/schools/${schoolId}/class-sections/${id}`,
      dto,
    );
    return mapSection(res.data);
  },

  /** DELETE /schools/:schoolId/class-sections/:id */
  deleteSection: async (sectionId: string): Promise<void> => {
    const schoolId = resolveSchoolId();
    await api.delete<ApiEnvelope<unknown>>(
      `/schools/${schoolId}/class-sections/${sectionId}`,
    );
  },

  // ─── Subjects ───────────────────────────────────────────
  /** GET /schools/:schoolId/subjects */
  getSubjects: async (): Promise<Subject[]> => {
    const schoolId = resolveSchoolId();
    const res = await api.get<PaginatedEnvelope<BackendSubject>>(
      `/schools/${schoolId}/subjects?page=1&limit=100`,
    );
    return (res.data ?? []).map(mapSubject);
  },

  /** GET /schools/:schoolId/subjects/:id */
  getSubject: async (id: string): Promise<Subject> => {
    const schoolId = resolveSchoolId();
    const res = await api.get<ApiEnvelope<BackendSubject>>(
      `/schools/${schoolId}/subjects/${id}`,
    );
    return mapSubject(res.data);
  },

  /** POST /schools/:schoolId/subjects */
  createSubject: async (dto: CreateSubjectDto): Promise<Subject> => {
    const schoolId = resolveSchoolId();
    const res = await api.post<ApiEnvelope<BackendSubject>>(
      `/schools/${schoolId}/subjects`,
      { name: dto.name, code: dto.code },
    );
    return mapSubject(res.data);
  },

  /** PUT /schools/:schoolId/subjects/:id */
  updateSubject: async (id: string, dto: UpdateSubjectDto): Promise<Subject> => {
    const schoolId = resolveSchoolId();
    const res = await api.put<ApiEnvelope<BackendSubject>>(
      `/schools/${schoolId}/subjects/${id}`,
      dto,
    );
    return mapSubject(res.data);
  },

  /** DELETE /schools/:schoolId/subjects/:id */
  deleteSubject: async (id: string): Promise<void> => {
    const schoolId = resolveSchoolId();
    await api.delete<ApiEnvelope<unknown>>(
      `/schools/${schoolId}/subjects/${id}`,
    );
  },

  // ─── Timetable ──────────────────────────────────────────
  /**
   * GET /schools/:schoolId/timetable-slots — list endpoint has no
   * section filter documented, so we pull a page and filter client-side.
   * Period is derived by matching the slot's startTime back to the fixed
   * `periodTimes` table; slots that don't line up cannot be placed in the
   * grid, so we count them in `hiddenSlotCount` and the page renders a
   * banner so admins know hidden data exists on the server.
   */
  getTimetable: async (
    sectionId: string,
  ): Promise<{ slots: TimetableSlot[]; hiddenSlotCount: number }> => {
    const schoolId = resolveSchoolId();
    const res = await api.get<PaginatedEnvelope<BackendTimetableSlot>>(
      `/schools/${schoolId}/timetable-slots?page=1&limit=500`,
    );
    const slots: TimetableSlot[] = [];
    let hiddenSlotCount = 0;
    for (const b of res.data ?? []) {
      if (b.classSectionId !== sectionId) continue;
      const day = dayByNum[b.dayOfWeek];
      const start = trimTime(b.startTime);
      const periodEntry = periodTimes.find((p) => p.start === start);
      if (!day || !periodEntry) {
        hiddenSlotCount += 1;
        continue;
      }
      slots.push({
        id: b.id,
        sectionId: b.classSectionId,
        day,
        period: periodEntry.period,
        subjectId: b.subjectId,
        subjectName: b.subject?.name ?? '',
        teacherId: b.teacherId,
        teacher: b.teacher?.user?.name ?? '',
        startTime: start,
        endTime: trimTime(b.endTime),
      });
    }
    return { slots, hiddenSlotCount };
  },

  /**
   * Upsert a slot. If `dto.existingId` is set, PUT it; otherwise pre-flight
   * the tuple against the server (no unique constraint exists yet) and PUT
   * the conflicting row if one is found, else POST. Backend stores time +
   * dayOfWeek directly — `period` is a UI concept that we expand into
   * startTime/endTime via the periodTimes table.
   */
  setTimetableSlot: async (dto: CreateTimetableSlotDto): Promise<TimetableSlot> => {
    const schoolId = resolveSchoolId();
    const period = periodTimes.find((p) => p.period === dto.period);
    if (!period) throw new Error('Invalid period');

    const body = {
      classSectionId: dto.sectionId,
      subjectId: dto.subjectId,
      teacherId: dto.teacherId,
      academicYearId: dto.academicYearId,
      dayOfWeek: numByDay[dto.day],
      startTime: period.start,
      endTime: period.end,
    };

    let existingId = dto.existingId;
    if (!existingId) {
      // Pre-flight: another tab/user may have created a slot at this tuple
      // since our last fetch. Without a server unique constraint, skipping
      // this check produces silent duplicates.
      const pre = await api.get<PaginatedEnvelope<BackendTimetableSlot>>(
        `/schools/${schoolId}/timetable-slots?page=1&limit=500`,
      );
      const conflict = (pre.data ?? []).find(
        (b) =>
          b.classSectionId === dto.sectionId &&
          b.academicYearId === dto.academicYearId &&
          b.dayOfWeek === numByDay[dto.day] &&
          trimTime(b.startTime) === period.start,
      );
      if (conflict) existingId = conflict.id;
    }

    const res = existingId
      ? await api.put<ApiEnvelope<BackendTimetableSlot>>(
          `/schools/${schoolId}/timetable-slots/${existingId}`,
          body,
        )
      : await api.post<ApiEnvelope<BackendTimetableSlot>>(
          `/schools/${schoolId}/timetable-slots`,
          body,
        );

    const b = res.data;
    return {
      id: b.id,
      sectionId: b.classSectionId,
      day: dayByNum[b.dayOfWeek] ?? dto.day,
      period: dto.period,
      subjectId: b.subjectId,
      subjectName: dto.subjectName,
      teacherId: b.teacherId,
      teacher: dto.teacher,
      startTime: trimTime(b.startTime),
      endTime: trimTime(b.endTime),
    };
  },

  /** DELETE /schools/:schoolId/timetable-slots/:id */
  clearTimetableSlot: async (slotId: string): Promise<void> => {
    const schoolId = resolveSchoolId();
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/timetable-slots/${slotId}`);
  },

  getPeriods: () => periodTimes,

  // ─── Houses ─────────────────────────────────────────────
  getHouses: (): Promise<House[]> => delay([...housesDb]),

  createHouse: (dto: CreateHouseDto): Promise<House> => {
    const house: House = {
      id: crypto.randomUUID(),
      name: dto.name,
      color: dto.color,
      motto: dto.motto,
      captainName: dto.captainName ?? '',
      studentCount: 0,
    };
    housesDb = [...housesDb, house];
    return delay(house);
  },

  deleteHouse: (id: string): Promise<void> => {
    housesDb = housesDb.filter((h) => h.id !== id);
    return delay(undefined);
  },

  assignStudentToHouse: (_dto: AssignHouseDto): Promise<void> => {
    // In a real backend this updates the student record
    const house = housesDb.find((h) => h.id === _dto.houseId);
    if (house) house.studentCount += 1;
    return delay(undefined);
  },

  // ─── Rollover ───────────────────────────────────────────
  // Rollover itself is still mocked; counts come from the real backend.
  getRolloverPreview: async (sourceYearId: string, targetYearId: string): Promise<RolloverPreview> => {
    const schoolId = resolveSchoolId();
    const [years, classes, subjects, slotsRes] = await Promise.all([
      academicApi.getYears(),
      academicApi.getClasses(),
      academicApi.getSubjects(),
      api.get<PaginatedEnvelope<BackendTimetableSlot>>(
        `/schools/${schoolId}/timetable-slots?page=1&limit=1`,
      ),
    ]);
    const source = years.find((y) => y.id === sourceYearId);
    const target = years.find((y) => y.id === targetYearId);
    if (!source || !target) throw new Error('Year not found');

    const sectionCount = classes.reduce((sum, c) => sum + c.sections.length, 0);
    return delay({
      sourceYear: source,
      targetYear: target,
      classCount: classes.length,
      sectionCount,
      subjectCount: subjects.length,
      timetableSlotCount: slotsRes.total ?? 0,
    });
  },

  executeRollover: async (req: RolloverRequest): Promise<RolloverResult> => {
    const schoolId = resolveSchoolId();
    const [classes, subjects, slotsRes] = await Promise.all([
      academicApi.getClasses(),
      academicApi.getSubjects(),
      api.get<PaginatedEnvelope<BackendTimetableSlot>>(
        `/schools/${schoolId}/timetable-slots?page=1&limit=1`,
      ),
    ]);
    const sectionCount = classes.reduce((sum, c) => sum + c.sections.length, 0);
    const slotCount = slotsRes.total ?? 0;
    // Mock: pretend we cloned everything requested
    return delay({
      classesCloned: req.copyClasses ? classes.length : 0,
      sectionsCloned: req.copySections ? sectionCount : 0,
      subjectsCloned: req.copySubjects ? subjects.length : 0,
      timetableSlotsCloned: req.copyTimetable ? slotCount : 0,
    });
  },
};
