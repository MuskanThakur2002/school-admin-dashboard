import { useAuthStore } from '@/stores/auth.store';
import { isSuperAdmin } from '@/types/auth.types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sms.qbitlog.com/api';

class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { token, user, activeSchoolId } = useAuthStore.getState();

  // Super admins can drill into a specific school. The backend reads this
  // header to scope nested resources (students, fees, etc.). School admins
  // are already scoped by their JWT and never send this header.
  const sendSchoolScope = isSuperAdmin(user) && !!activeSchoolId;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sendSchoolScope ? { 'X-School-Id': activeSchoolId as string } : {}),
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(response.status, error.message, error.errors);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function uploadRequest<T>(endpoint: string, formData: FormData): Promise<T> {
  const { token, user, activeSchoolId } = useAuthStore.getState();
  const sendSchoolScope = isSuperAdmin(user) && !!activeSchoolId;

  // Note: we DO NOT set Content-Type — the browser fills it with the correct
  // multipart boundary. JSON Content-Type is intentionally omitted here.
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sendSchoolScope ? { 'X-School-Id': activeSchoolId as string } : {}),
    },
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError(401, 'Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new ApiError(response.status, error.message, error.errors);
  }
  return response.json();
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) => uploadRequest<T>(url, formData),
};

export { ApiError };
