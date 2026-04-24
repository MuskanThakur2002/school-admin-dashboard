import { api } from '@/services/api-client';
import { USE_MOCK_API } from '@/mocks/mock-mode';
import { mockLogin } from '@/mocks/mock-users';
import type { LoginRequest, LoginResponseData } from '@/types/auth.types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export const authApi = {
  /** POST /auth/login */
  login: async (body: LoginRequest): Promise<LoginResponseData> => {
    if (USE_MOCK_API) {
      await new Promise((r) => setTimeout(r, 300));
      const result = mockLogin(body.email, body.password);
      if (!result) throw new Error('Invalid email or password');
      return result;
    }
    const res = await api.post<ApiEnvelope<LoginResponseData>>('/auth/login', body);
    return res.data;
  },
};
