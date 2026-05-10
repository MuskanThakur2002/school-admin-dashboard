export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId: string;
  employeeId: string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
  user?: TeacherUser;
}

export interface CreateTeacherDto {
  userId: string;
  employeeId: string;
  hireDate: string;
}

export type UpdateTeacherDto = Partial<CreateTeacherDto>;

export interface TeacherListParams {
  page?: number;
  limit?: number;
}

export interface TeacherListResponse {
  data: Teacher[];
  total: number;
  page: number;
  limit: number;
}
