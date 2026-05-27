// ─── Academic Year ─────────────────────────────────────────
export type AcademicYearStatus = 'active' | 'upcoming' | 'archived';

export interface AcademicYear {
  id: string;
  schoolId?: string;
  name: string; // e.g. "2025-26"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicYearStatus; // UI-derived from isCurrent
  totalStudents?: number;
  totalClasses?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAcademicYearDto {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export type UpdateAcademicYearDto = Partial<CreateAcademicYearDto>;

// ─── Section ───────────────────────────────────────────────
// Backend stores: { section, classMasterId, academicYearId, status, schoolId }.
// `classTeacher`/`studentCount`/`capacity` are kept on the type with mapper-
// supplied defaults so legacy mock-driven pages (Timetable, AcademicHub)
// keep compiling until they migrate to real data.
export interface Section {
  id: string;
  name: string; // backend `section` (e.g. "A")
  classMasterId?: string;
  academicYearId?: string;
  status?: string | null;
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
  classTeacher: string;
  studentCount: number;
  capacity: number;
}

export interface CreateSectionDto {
  classMasterId: string;
  academicYearId: string;
  section: string;
}

export type UpdateSectionDto = Partial<{
  section: string;
  classMasterId: string;
  academicYearId: string;
}>;

// ─── Class ─────────────────────────────────────────────────
// Backend stores: { name, gradeLevel, schoolId }. `shortName` and `grade`
// are populated by the API mapper (defaulting to `name` and `gradeLevel`)
// so dependent pages (Promotion, Timetable, SubjectMapping) keep compiling.
export interface ClassGroup {
  id: string;
  name: string; // e.g. "3rd standard"
  gradeLevel: number;
  sections: Section[];
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
  shortName: string;
  grade: number;
}

export interface CreateClassDto {
  name: string;
  gradeLevel: number;
}

export type UpdateClassDto = Partial<CreateClassDto>;

// ─── Subject ───────────────────────────────────────────────
export interface Subject {
  id: string;
  schoolId?: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubjectDto {
  name: string;
  code: string;
}

export type UpdateSubjectDto = Partial<CreateSubjectDto>;

// ─── Timetable ─────────────────────────────────────────────
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimetableSlot {
  id: string;
  sectionId: string;
  day: DayOfWeek;
  subjectId: string;
  subjectName: string; // denormalized for display
  teacherId: string;
  teacher: string; // denormalized teacher name for display
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
}

export interface CreateTimetableSlotDto {
  sectionId: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
  subjectId: string;
  subjectName: string;
  teacher: string;
  teacherId: string;
  academicYearId: string;
  /** If set, the backend slot is updated via PUT; otherwise a new slot is POSTed. */
  existingId?: string;
}

// ─── House / Team Grouping ─────────────────────────────────
export interface House {
  id: string;
  name: string;        // e.g. "Red House"
  color: string;       // hex color
  motto: string;
  captainName: string; // student name or empty
  studentCount: number;
}

export interface CreateHouseDto {
  name: string;
  color: string;
  motto: string;
  captainName?: string;
}

export interface AssignHouseDto {
  studentId: string;
  houseId: string;
}

// ─── Rollover ──────────────────────────────────────────────
export interface RolloverPreview {
  sourceYear: AcademicYear;
  targetYear: AcademicYear;
  classCount: number;
  sectionCount: number;
  subjectCount: number;
  timetableSlotCount: number;
}

export interface RolloverRequest {
  sourceYearId: string;
  targetYearId: string;
  copyClasses: boolean;
  copySections: boolean;
  copySubjects: boolean;
  copyTimetable: boolean;
}

export interface RolloverResult {
  classesCloned: number;
  sectionsCloned: number;
  subjectsCloned: number;
  timetableSlotsCloned: number;
}

// ─── Promotion ─────────────────────────────────────────────
export interface PromotionStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  fromClass: string;
  fromSection: string;
  selected: boolean;
  // Override target if needed
  toSection?: string;
}

export interface PromotionRequest {
  fromClassId: string;
  toClassId: string;
  studentIds: string[];
  defaultToSection: string;
}
