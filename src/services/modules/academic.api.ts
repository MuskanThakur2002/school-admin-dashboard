/**
 * Academic Setup API Layer
 * Backend-swap point — replace function bodies with fetch() calls.
 */
import type {
  AcademicYear, ClassGroup, Section, Subject, TimetableSlot,
  CreateAcademicYearDto, CreateClassDto, CreateSectionDto,
  CreateSubjectDto, CreateTimetableSlotDto, DayOfWeek,
  House, CreateHouseDto, AssignHouseDto,
  RolloverPreview, RolloverRequest, RolloverResult,
} from '@/types/academic.types';

const NETWORK_DELAY_MS = 150;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

// ─── Mock DBs ──────────────────────────────────────────────

let yearsDb: AcademicYear[] = [
  { id: 'y1', name: '2025-26', startDate: '2025-04-01', endDate: '2026-03-31', status: 'active', totalStudents: 932, totalClasses: 36 },
  { id: 'y2', name: '2026-27', startDate: '2026-04-01', endDate: '2027-03-31', status: 'upcoming', totalStudents: 0, totalClasses: 0 },
  { id: 'y3', name: '2024-25', startDate: '2024-04-01', endDate: '2025-03-31', status: 'archived', totalStudents: 891, totalClasses: 34 },
];

let classesDb: ClassGroup[] = [
  {
    id: 'c1', name: 'Class I', shortName: 'I', grade: 1,
    sections: [
      { id: 's1a', name: 'A', classTeacher: 'Ms. Priya Sharma', studentCount: 32, capacity: 40 },
      { id: 's1b', name: 'B', classTeacher: 'Ms. Anjali Gupta', studentCount: 30, capacity: 40 },
    ],
  },
  {
    id: 'c2', name: 'Class II', shortName: 'II', grade: 2,
    sections: [
      { id: 's2a', name: 'A', classTeacher: 'Ms. Sunita Reddy', studentCount: 35, capacity: 40 },
    ],
  },
  {
    id: 'c5', name: 'Class V', shortName: 'V', grade: 5,
    sections: [
      { id: 's5a', name: 'A', classTeacher: 'Mr. Amit Verma', studentCount: 38, capacity: 45 },
      { id: 's5b', name: 'B', classTeacher: 'Ms. Sunita Devi', studentCount: 36, capacity: 45 },
      { id: 's5c', name: 'C', classTeacher: 'Mr. Rajesh Patel', studentCount: 34, capacity: 45 },
    ],
  },
  {
    id: 'c8', name: 'Class VIII', shortName: 'VIII', grade: 8,
    sections: [
      { id: 's8a', name: 'A', classTeacher: 'Dr. Suresh Iyer', studentCount: 40, capacity: 45 },
      { id: 's8b', name: 'B', classTeacher: 'Ms. Kavita Reddy', studentCount: 38, capacity: 45 },
    ],
  },
  {
    id: 'c10', name: 'Class X', shortName: 'X', grade: 10,
    sections: [
      { id: 's10a', name: 'A', classTeacher: 'Mr. Deepak Joshi', studentCount: 42, capacity: 45 },
      { id: 's10b', name: 'B', classTeacher: 'Ms. Meena Nair', studentCount: 40, capacity: 45 },
    ],
  },
  {
    id: 'c12', name: 'Class XII', shortName: 'XII', grade: 12,
    sections: [
      { id: 's12a', name: 'A (Science)', classTeacher: 'Dr. Arun Mehta', studentCount: 35, capacity: 40 },
      { id: 's12b', name: 'B (Commerce)', classTeacher: 'Mr. Vikram Shah', studentCount: 30, capacity: 40 },
    ],
  },
];

let subjectsDb: Subject[] = [
  { id: 'sub1', name: 'English', code: 'ENG', type: 'core', classes: ['I', 'II', 'V', 'VIII', 'X', 'XII'] },
  { id: 'sub2', name: 'Hindi', code: 'HIN', type: 'core', classes: ['I', 'II', 'V', 'VIII', 'X'] },
  { id: 'sub3', name: 'Mathematics', code: 'MAT', type: 'core', classes: ['I', 'II', 'V', 'VIII', 'X', 'XII'] },
  { id: 'sub4', name: 'Science', code: 'SCI', type: 'core', classes: ['V', 'VIII'] },
  { id: 'sub5', name: 'Physics', code: 'PHY', type: 'core', classes: ['X', 'XII'] },
  { id: 'sub6', name: 'Chemistry', code: 'CHE', type: 'core', classes: ['X', 'XII'] },
  { id: 'sub7', name: 'Biology', code: 'BIO', type: 'elective', classes: ['X', 'XII'] },
  { id: 'sub8', name: 'Social Studies', code: 'SST', type: 'core', classes: ['V', 'VIII', 'X'] },
  { id: 'sub9', name: 'Computer Science', code: 'CS', type: 'elective', classes: ['VIII', 'X', 'XII'] },
  { id: 'sub10', name: 'Physical Education', code: 'PE', type: 'activity', classes: ['I', 'II', 'V', 'VIII', 'X', 'XII'] },
  { id: 'sub11', name: 'Art & Craft', code: 'ART', type: 'activity', classes: ['I', 'II', 'V'] },
  { id: 'sub12', name: 'Music', code: 'MUS', type: 'activity', classes: ['I', 'II', 'V', 'VIII'] },
];

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
const sortClasses = (arr: ClassGroup[]) => [...arr].sort((a, b) => a.grade - b.grade);

// ═════════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════════

export const academicApi = {
  // ─── Academic Years ─────────────────────────────────────
  getYears: (): Promise<AcademicYear[]> => delay([...yearsDb]),

  createYear: (dto: CreateAcademicYearDto): Promise<AcademicYear> => {
    const year: AcademicYear = {
      id: crypto.randomUUID(),
      name: dto.name, startDate: dto.startDate, endDate: dto.endDate,
      status: 'upcoming', totalStudents: 0, totalClasses: 0,
    };
    yearsDb = [year, ...yearsDb];
    return delay(year);
  },

  activateYear: (id: string): Promise<AcademicYear> => {
    yearsDb = yearsDb.map((y) => ({
      ...y,
      status: y.id === id ? 'active' : (y.status === 'active' ? 'archived' : y.status),
    }));
    const year = yearsDb.find((y) => y.id === id);
    if (!year) return Promise.reject(new Error('Year not found'));
    return delay(year);
  },

  // ─── Classes & Sections ─────────────────────────────────
  getClasses: (): Promise<ClassGroup[]> => delay(sortClasses(classesDb)),

  createClass: (dto: CreateClassDto): Promise<ClassGroup> => {
    const cls: ClassGroup = {
      id: crypto.randomUUID(),
      name: dto.name, shortName: dto.shortName, grade: dto.grade,
      sections: [],
    };
    classesDb = sortClasses([...classesDb, cls]);
    return delay(cls);
  },

  deleteClass: (id: string): Promise<void> => {
    classesDb = classesDb.filter((c) => c.id !== id);
    return delay(undefined);
  },

  addSection: (dto: CreateSectionDto): Promise<Section> => {
    const cls = classesDb.find((c) => c.id === dto.classId);
    if (!cls) return Promise.reject(new Error('Class not found'));
    const section: Section = {
      id: crypto.randomUUID(),
      name: dto.name,
      classTeacher: dto.classTeacher,
      studentCount: 0,
      capacity: dto.capacity ?? 40,
    };
    cls.sections = [...cls.sections, section];
    return delay(section);
  },

  deleteSection: (classId: string, sectionId: string): Promise<void> => {
    const cls = classesDb.find((c) => c.id === classId);
    if (!cls) return Promise.reject(new Error('Class not found'));
    cls.sections = cls.sections.filter((s) => s.id !== sectionId);
    return delay(undefined);
  },

  // ─── Subjects ───────────────────────────────────────────
  getSubjects: (): Promise<Subject[]> => delay([...subjectsDb]),

  createSubject: (dto: CreateSubjectDto): Promise<Subject> => {
    const sub: Subject = {
      id: crypto.randomUUID(),
      name: dto.name, code: dto.code.toUpperCase(),
      type: dto.type, classes: dto.classes,
    };
    subjectsDb = [...subjectsDb, sub];
    return delay(sub);
  },

  deleteSubject: (id: string): Promise<void> => {
    subjectsDb = subjectsDb.filter((s) => s.id !== id);
    return delay(undefined);
  },

  // ─── Timetable ──────────────────────────────────────────
  getTimetable: (classId: string, sectionId: string): Promise<TimetableSlot[]> => {
    return delay(timetableDb.filter((s) => s.classId === classId && s.sectionId === sectionId));
  },

  setTimetableSlot: (dto: CreateTimetableSlotDto): Promise<TimetableSlot> => {
    const sub = subjectsDb.find((s) => s.id === dto.subjectId);
    if (!sub) return Promise.reject(new Error('Subject not found'));

    const period = periodTimes.find((p) => p.period === dto.period);
    if (!period) return Promise.reject(new Error('Invalid period'));

    // Replace any existing slot at this position
    timetableDb = timetableDb.filter(
      (s) => !(s.classId === dto.classId && s.sectionId === dto.sectionId && s.day === dto.day && s.period === dto.period),
    );

    const slot: TimetableSlot = {
      id: `slot-${dto.classId}-${dto.sectionId}-${dto.day}-${dto.period}`,
      classId: dto.classId, sectionId: dto.sectionId, day: dto.day, period: dto.period,
      subjectId: sub.id, subjectName: sub.name, teacher: dto.teacher,
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
  getRolloverPreview: (sourceYearId: string, targetYearId: string): Promise<RolloverPreview> => {
    const source = yearsDb.find((y) => y.id === sourceYearId);
    const target = yearsDb.find((y) => y.id === targetYearId);
    if (!source || !target) return Promise.reject(new Error('Year not found'));

    const sectionCount = classesDb.reduce((sum, c) => sum + c.sections.length, 0);
    return delay({
      sourceYear: source,
      targetYear: target,
      classCount: classesDb.length,
      sectionCount,
      subjectCount: subjectsDb.length,
      timetableSlotCount: timetableDb.length,
    });
  },

  executeRollover: (req: RolloverRequest): Promise<RolloverResult> => {
    const sectionCount = classesDb.reduce((sum, c) => sum + c.sections.length, 0);
    // Mock: pretend we cloned everything requested
    return delay({
      classesCloned: req.copyClasses ? classesDb.length : 0,
      sectionsCloned: req.copySections ? sectionCount : 0,
      subjectsCloned: req.copySubjects ? subjectsDb.length : 0,
      timetableSlotsCloned: req.copyTimetable ? timetableDb.length : 0,
    });
  },
};
