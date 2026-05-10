export interface Role {
  id: string;
  schoolId: string;
  name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleListParams {
  page?: number;
  limit?: number;
}

export interface RoleListResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
}
