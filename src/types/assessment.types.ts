export interface Assessment {
  id: string;
  schoolId: string;
  name: string;
  type: string;
  academicYearId: string;
  classMasterId?: string;
  classSectionId?: string | null;
  startDate?: string;
  endDate?: string;
  description?: string | null;
  // API returns maxMarks as a string on GET but accepts a number on POST/PUT.
  maxMarks: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentDto {
  schoolId: string;
  name: string;
  type: string;
  academicYearId: string;
  classMasterId: string;
  classSectionId: string;
  startDate: string;
  endDate: string;
  maxMarks: number;
  description?: string;
}

export type UpdateAssessmentDto = Partial<CreateAssessmentDto>;

export interface AssessmentListParams {
  page?: number;
  limit?: number;
}

export interface AssessmentListResponse {
  data: Assessment[];
  total: number;
  page: number;
  limit: number;
}

export interface MarkSubject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentMark {
  id: string;
  schoolId: string;
  studentEnrollmentId: string;
  assessmentId: string;
  subjectId: string;
  // API returns marksObtained as a string on GET but accepts a number on POST/PUT.
  marksObtained: string | number;
  grade: string;
  remarks: string;
  enteredById: string;
  createdAt: string;
  updatedAt: string;
  subject?: MarkSubject;
}

export interface CreateStudentMarkDto {
  schoolId: string;
  studentEnrollmentId: string;
  assessmentId: string;
  subjectId: string;
  marksObtained: number;
  grade: string;
  remarks: string;
  enteredById: string;
}

export type UpdateStudentMarkDto = Partial<CreateStudentMarkDto>;

export interface StudentMarkListParams {
  page?: number;
  limit?: number;
  assessmentId?: string;
  studentEnrollmentId?: string;
}

export interface StudentMarkListResponse {
  data: StudentMark[];
  total: number;
  page: number;
  limit: number;
}
