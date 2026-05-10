import type { Role } from '@/types/role.types';

export interface User {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  address: string | null;
  phoneNumber: string | null;
  whatsapp: string | null;
  roleId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  loginAttempts: number;
  failedAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  role?: Role;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  address?: string;
  phoneNumber?: string;
  whatsapp?: string;
  roleId: string;
  isActive?: boolean;
}

export type UpdateUserDto = Partial<Omit<CreateUserDto, 'password'>> & { password?: string };

export interface UserListParams {
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}
