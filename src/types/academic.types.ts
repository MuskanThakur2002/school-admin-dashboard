// ─── Academic Year ─────────────────────────────────────────
export type AcademicYearStatus = 'active' | 'upcoming' | 'archived';

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2025-26"
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  totalStudents: number;
  totalClasses: number;
}

export interface CreateAcademicYearDto {
  name: string;
  startDate: string;
  endDate: string;
}

// ─── Section ───────────────────────────────────────────────
export interface Section {
  id: string;
  name: string;
  classTeacher: string;
  studentCount: number;
  capacity: number;
}

export interface CreateSectionDto {
  classId: string;
  name: string;
  classTeacher: string;
  capacity?: number;
}

// ─── Class ─────────────────────────────────────────────────
export interface ClassGroup {
  id: string;
  name: string; // e.g. "Class V"
  shortName: string; // e.g. "V"
  grade: number; // numeric for sorting
  sections: Section[];
}

export interface CreateClassDto {
  name: string;
  shortName: string;
  grade: number;
}

// ─── Subject ───────────────────────────────────────────────
export type SubjectType = 'core' | 'elective' | 'activity';

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: SubjectType;
  classes: string[]; // class shortNames (V, VIII, etc.)
}

export interface CreateSubjectDto {
  name: string;
  code: string;
  type: SubjectType;
  classes: string[];
}

// ─── Timetable ─────────────────────────────────────────────
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface TimetableSlot {
  id: string;
  classId: string;
  sectionId: string;
  day: DayOfWeek;
  period: number; // 1-8
  subjectId: string;
  subjectName: string; // denormalized for display
  teacher: string;
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
}

export interface CreateTimetableSlotDto {
  classId: string;
  sectionId: string;
  day: DayOfWeek;
  period: number;
  subjectId: string;
  teacher: string;
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
