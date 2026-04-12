export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface FilterOption {
  label: string;
  value: string;
}
