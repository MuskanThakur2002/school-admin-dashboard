/**
 * Academic Setup API Layer
 * Academic Years, Classes (class-masters), Sections (class-sections), and
 * Subjects use the real backend. Timetable, houses, and rollover are still
 * mocked.
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
// Seed timetable for Class V Section A
const periodTimes = [
  { period: 1, start: '09:00', end: '09:45' },
  { period: 2, start: '09:45', end: '10:30' },
  { period: 3, start: '10:45', end: '11:30' },
  { period: 4, start: '11:30', end: '12:15' },
  { period: 5, start: '13:00', end: '13:45' },
  { period: 6, start: '13:45', end: '14:30' },
];

const seedSlots = (classId: string, sectionId: string): TimetableSlot[] => {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const subjectsRotation = [
    { id: 'sub3', name: 'Mathematics', teacher: 'Mr. Amit Verma' },
    { id: 'sub1', name: 'English', teacher: 'Ms. Sunita Devi' },
    { id: 'sub4', name: 'Science', teacher: 'Mr. Rajesh Patel' },
    { id: 'sub2', name: 'Hindi', teacher: 'Ms. Pooja Mishra' },
    { id: 'sub8', name: 'Social Studies', teacher: 'Ms. Kavita Reddy' },
    { id: 'sub10', name: 'Physical Education', teacher: 'Mr. Suresh Singh' },
  ];

  const slots: TimetableSlot[] = [];
  days.forEach((day, dayIdx) => {
    periodTimes.forEach((p, pIdx) => {
      const sub = subjectsRotation[(dayIdx + pIdx) % subjectsRotation.length];
      slots.push({
        id: `slot-${classId}-${sectionId}-${day}-${p.period}`,
        classId, sectionId, day, period: p.period,
        subjectId: sub.id, subjectName: sub.name, teacher: sub.teacher,
        startTime: p.start, endTime: p.end,
      });
    });
  });
  return slots;
};

let timetableDb: TimetableSlot[] = [
  ...seedSlots('c5', 's5a'),
  ...seedSlots('c8', 's8a'),
];

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
  getTimetable: (classId: string, sectionId: string): Promise<TimetableSlot[]> => {
    return delay(timetableDb.filter((s) => s.classId === classId && s.sectionId === sectionId));
  },

  setTimetableSlot: (dto: CreateTimetableSlotDto): Promise<TimetableSlot> => {
    const period = periodTimes.find((p) => p.period === dto.period);
    if (!period) return Promise.reject(new Error('Invalid period'));

    // Replace any existing slot at this position
    timetableDb = timetableDb.filter(
      (s) => !(s.classId === dto.classId && s.sectionId === dto.sectionId && s.day === dto.day && s.period === dto.period),
    );

    const slot: TimetableSlot = {
      id: `slot-${dto.classId}-${dto.sectionId}-${dto.day}-${dto.period}`,
      classId: dto.classId, sectionId: dto.sectionId, day: dto.day, period: dto.period,
      subjectId: dto.subjectId, subjectName: dto.subjectName, teacher: dto.teacher,
      startTime: period.start, endTime: period.end,
    };
    timetableDb = [...timetableDb, slot];
    return delay(slot);
  },

  clearTimetableSlot: (slotId: string): Promise<void> => {
    timetableDb = timetableDb.filter((s) => s.id !== slotId);
    return delay(undefined);
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
  // Timetable counts are still mocked. Class, section & subject counts now
  // come from the real backend.
  getRolloverPreview: async (sourceYearId: string, targetYearId: string): Promise<RolloverPreview> => {
    const [years, classes, subjects] = await Promise.all([
      academicApi.getYears(),
      academicApi.getClasses(),
      academicApi.getSubjects(),
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
      timetableSlotCount: timetableDb.length,
    });
  },

  executeRollover: async (req: RolloverRequest): Promise<RolloverResult> => {
    const [classes, subjects] = await Promise.all([
      academicApi.getClasses(),
      academicApi.getSubjects(),
    ]);
    const sectionCount = classes.reduce((sum, c) => sum + c.sections.length, 0);
    // Mock: pretend we cloned everything requested
    return delay({
      classesCloned: req.copyClasses ? classes.length : 0,
      sectionsCloned: req.copySections ? sectionCount : 0,
      subjectsCloned: req.copySubjects ? subjects.length : 0,
      timetableSlotsCloned: req.copyTimetable ? timetableDb.length : 0,
    });
  },
};
