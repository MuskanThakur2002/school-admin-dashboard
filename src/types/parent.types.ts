export interface ParentUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
}

export interface Parent {
  id: string;
  schoolId: string;
  userId: string;
  annualIncome: number;
  createdAt: string;
  updatedAt: string;
  user?: ParentUser;
}

export interface CreateParentDto {
  userId: string;
  annualIncome: number;
}

export type UpdateParentDto = Partial<CreateParentDto>;

export interface ParentListParams {
  page?: number;
  limit?: number;
}

export interface ParentListResponse {
  data: Parent[];
  total: number;
  page: number;
  limit: number;
}
