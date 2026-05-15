import type { School } from '@/types/school.types';

export type StudentGender = 'Male' | 'Female' | 'Other';

export interface Student {
  id: string;
  schoolId: string;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  gender: StudentGender;
  parentId: string;
  siblingGroupId: string | null;
  transportRoute: string | null;
  medicalNotes: string | null;
  enrollmentDate: string | null;
  status: string;
  applicationId: string | null;
  createdAt: string;
  updatedAt: string;
  school?: School;
}

export interface CreateStudentDto {
  name: string;
  admissionNumber: string;
  dateOfBirth: string;
  gender: StudentGender;
  parentId: string;
  status: string;
}

export type UpdateStudentDto = Partial<CreateStudentDto> & {
  siblingGroupId?: string | null;
  transportRoute?: string | null;
  medicalNotes?: string | null;
  enrollmentDate?: string | null;
};

export interface StudentListParams {
  page?: number;
  limit?: number;
}

export interface StudentListResponse {
  data: Student[];
  total: number;
  page: number;
  limit: number;
}

// ─── Demo / mock-only shape ──────────────────────────────────────
// Used by modules whose own backends haven't landed yet (admissions,
// receipts, expenses, ledger, fee-engine, promotion). Will be retired
// once those modules cut over to the real Student.
export interface DemoStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  class: string;
  section: string;
  rollNo: number;
  bloodGroup?: string;
  religion?: string;
  category?: string;
  nationality: string;
  motherTongue?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parents?: ParentGuardian[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  transportRoute?: string;
  medicalNotes?: string;
  previousSchool?: string;
  siblingIds?: string[];
  status: 'active' | 'inactive' | 'alumni' | 'tc_issued';
  joinDate: string;
  avatar?: string;
}

export interface ParentGuardian {
  id: string;
  name: string;
  relation: 'father' | 'mother' | 'guardian';
  phone: string;
  email?: string;
  occupation?: string;
  annualIncome?: string;
}

// ─── Student Enrollment ─────────────────────────────────────────
// One enrollment row per (student, class-section, academic year).
// `joinedAt` / `leftAt` track tenure within that section.

export interface EnrollmentStudentRef {
  id: string;
  schoolId: string;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  gender: StudentGender;
  parentId: string;
  status: string;
  enrollmentDate: string | null;
}

export interface EnrollmentClassSectionRef {
  id: string;
  schoolId: string;
  classMasterId: string;
  academicYearId: string;
  section: string;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classSectionId: string;
  academicYearId: string;
  rollNumber: number;
  status: string;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated on list endpoint; absent on getById.
  student?: EnrollmentStudentRef;
  classSection?: EnrollmentClassSectionRef;
}

export interface CreateEnrollmentDto {
  studentId: string;
  classSectionId: string;
  academicYearId: string;
  rollNumber: number;
  status: string;
  joinedAt: string;
  leftAt?: string | null;
}

export type UpdateEnrollmentDto = Partial<{
  classSectionId: string;
  academicYearId: string;
  rollNumber: number;
  status: string;
  joinedAt: string;
  leftAt: string | null;
}>;

export interface EnrollmentListParams {
  page?: number;
  limit?: number;
  studentId?: string;
  classSectionId?: string;
  academicYearId?: string;
}

export interface EnrollmentListResponse {
  data: StudentEnrollment[];
  total: number;
  page: number;
  limit: number;
}
