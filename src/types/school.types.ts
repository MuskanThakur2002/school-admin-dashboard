export interface SchoolLocation {
  lat: number;
  lng: number;
}

export interface School {
  id: string;
  name: string;
  address: string;
  location: SchoolLocation;
  phoneNumber: string;
  domain: string;
  branding: Record<string, unknown> | null;
  isActive: boolean;
  initialPayment: number;
  monthlyPayment: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolDto {
  name: string;
  address: string;
  location: SchoolLocation;
  phoneNumber: string;
  domain: string;
  branding: Record<string, unknown>;
  isActive: boolean;
  initialPayment: number;
  monthlyPayment: number;
}

export type UpdateSchoolDto = Partial<CreateSchoolDto>;

export interface SchoolListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface SchoolListResponse {
  data: School[];
  total: number;
  page: number;
  limit: number;
}
