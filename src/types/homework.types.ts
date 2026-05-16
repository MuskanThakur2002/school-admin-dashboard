export interface HomeworkSubject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Homework {
  id: string;
  schoolId: string;
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  title: string;
  description: string;
  dueDate: string;
  attachments: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  subject?: HomeworkSubject;
}

export interface CreateHomeworkDto {
  schoolId: string;
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  title: string;
  description: string;
  dueDate: string;
  attachments?: Record<string, unknown>;
}

export type UpdateHomeworkDto = Partial<CreateHomeworkDto>;

export interface HomeworkListParams {
  page?: number;
  limit?: number;
  classSectionId?: string;
  subjectId?: string;
}

export interface HomeworkListResponse {
  data: Homework[];
  total: number;
  page: number;
  limit: number;
}
