import { api } from '@/services/api-client';
import { USE_MOCK_API } from '@/mocks/mock-mode';
import type {
  Enquiry,
  EnquiryStatus,
  CreateEnquiryDto,
  UpdateEnquiryDto,
} from '@/types/admissions.types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface PaginatedEnvelope<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface EnquiryDto {
  id: string;
  schoolId: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string | null;
  studentName: string;
  classInterested: string;
  source: string;
  status: string;
  remarks: string | null;
  handledById: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TO_API: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  lost: 'Lost',
};

const STATUS_FROM_API = (s: string): EnquiryStatus => {
  switch (s) {
    case 'New': return 'new';
    case 'Contacted': return 'contacted';
    case 'Converted': return 'converted';
    case 'Lost': return 'lost';
    default: return 'new';
  }
};

function toEnquiry(dto: EnquiryDto): Enquiry {
  return {
    id: dto.id,
    studentName: dto.studentName,
    parentName: dto.name,
    parentPhone: dto.phoneNumber,
    parentEmail: dto.email ?? '',
    classInterest: dto.classInterested,
    source: dto.source ?? '',
    status: STATUS_FROM_API(dto.status),
    date: (dto.createdAt || '').split('T')[0],
    notes: dto.remarks ?? '',
  };
}

interface ApiBody {
  name: string;
  phoneNumber: string;
  email: string;
  studentName: string;
  classInterested: string;
  source: string;
  status: string;
  remarks: string;
}

function toApiBody(input: CreateEnquiryDto, status: EnquiryStatus = 'new'): ApiBody {
  return {
    name: input.parentName,
    phoneNumber: input.parentPhone,
    email: input.parentEmail || '',
    studentName: input.studentName,
    classInterested: input.classInterest,
    source: input.source || '',
    status: STATUS_TO_API[status],
    remarks: input.notes || '',
  };
}

export interface EnquiryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EnquiryStatus;
}

export interface EnquiryListResponse {
  data: Enquiry[];
  total: number;
  page: number;
  limit: number;
}

function buildQuery(params?: EnquiryListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', STATUS_TO_API[params.status]);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ─── Mock seed (used only when USE_MOCK_API is true) ──────────
let mockEnquiriesDb: Enquiry[] = [
  { id: '1', studentName: 'Aarav Mehta', parentName: 'Deepak Mehta', parentPhone: '9812345001', parentEmail: 'deepak.m@email.com', classInterest: 'V', source: 'Online', status: 'new', date: '2026-04-08', notes: 'Interested in CBSE curriculum' },
  { id: '2', studentName: 'Diya Kapoor', parentName: 'Neha Kapoor', parentPhone: '9812345002', parentEmail: 'neha.k@email.com', classInterest: 'I', source: 'Walk-in', status: 'contacted', date: '2026-04-06', notes: 'Campus tour done' },
  { id: '3', studentName: 'Vihaan Rao', parentName: 'Sanjay Rao', parentPhone: '9812345003', parentEmail: 'sanjay.r@email.com', classInterest: 'VIII', source: 'Referral', status: 'converted', date: '2026-03-28', notes: 'Referred by Mr. Patel' },
  { id: '4', studentName: 'Saanvi Das', parentName: 'Amit Das', parentPhone: '9812345004', parentEmail: 'amit.d@email.com', classInterest: 'III', source: 'Advertisement', status: 'new', date: '2026-04-09', notes: 'Saw newspaper ad' },
  { id: '5', studentName: 'Reyansh Jain', parentName: 'Priya Jain', parentPhone: '9812345005', parentEmail: 'priya.j@email.com', classInterest: 'X', source: 'Online', status: 'lost', date: '2026-03-15', notes: 'Chose different school' },
  { id: '6', studentName: 'Anika Bose', parentName: 'Rahul Bose', parentPhone: '9812345006', parentEmail: 'rahul.b@email.com', classInterest: 'VI', source: 'Walk-in', status: 'contacted', date: '2026-04-05', notes: 'Follow up next week' },
  { id: '7', studentName: 'Aryan Tiwari', parentName: 'Pooja Tiwari', parentPhone: '9812345007', parentEmail: 'pooja.t@email.com', classInterest: 'II', source: 'Referral', status: 'new', date: '2026-04-10', notes: 'Sibling already enrolled' },
  { id: '8', studentName: 'Zara Sheikh', parentName: 'Imran Sheikh', parentPhone: '9812345008', parentEmail: 'imran.s@email.com', classInterest: 'IV', source: 'Online', status: 'new', date: '2026-04-11', notes: 'Relocating from Pune' },
];

const mockDelay = <T>(v: T): Promise<T> =>
  new Promise((r) => setTimeout(() => r(v), 150));

export const enquiriesApi = {
  /** GET /schools/:schoolId/enquiries — requires MANAGE_ENQUIRIES */
  list: async (schoolId: string, params?: EnquiryListParams): Promise<EnquiryListResponse> => {
    if (USE_MOCK_API) {
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      let filtered = [...mockEnquiriesDb];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.studentName.toLowerCase().includes(q) ||
            e.parentName.toLowerCase().includes(q),
        );
      }
      if (params?.status) {
        filtered = filtered.filter((e) => e.status === params.status);
      }
      const start = (page - 1) * limit;
      return mockDelay({
        data: filtered.slice(start, start + limit),
        total: filtered.length,
        page,
        limit,
      });
    }
    const res = await api.get<PaginatedEnvelope<EnquiryDto>>(
      `/schools/${schoolId}/enquiries${buildQuery(params)}`,
    );
    return {
      data: res.data.map(toEnquiry),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  },

  /** GET /schools/:schoolId/enquiries/:id — requires MANAGE_ENQUIRIES */
  getById: async (schoolId: string, id: string): Promise<Enquiry> => {
    if (USE_MOCK_API) {
      const e = mockEnquiriesDb.find((x) => x.id === id);
      if (!e) return Promise.reject(new Error('Enquiry not found'));
      return mockDelay(e);
    }
    const res = await api.get<ApiEnvelope<EnquiryDto>>(
      `/schools/${schoolId}/enquiries/${id}`,
    );
    return toEnquiry(res.data);
  },

  /** POST /schools/:schoolId/enquiries — requires MANAGE_ENQUIRIES */
  create: async (schoolId: string, body: CreateEnquiryDto): Promise<Enquiry> => {
    if (USE_MOCK_API) {
      const enquiry: Enquiry = {
        id: crypto.randomUUID(),
        studentName: body.studentName,
        parentName: body.parentName,
        parentPhone: body.parentPhone,
        parentEmail: body.parentEmail || '',
        classInterest: body.classInterest,
        source: body.source || '',
        status: 'new',
        date: new Date().toISOString().split('T')[0],
        notes: body.notes || '',
      };
      mockEnquiriesDb = [enquiry, ...mockEnquiriesDb];
      return mockDelay(enquiry);
    }
    const res = await api.post<ApiEnvelope<EnquiryDto>>(
      `/schools/${schoolId}/enquiries`,
      toApiBody(body, 'new'),
    );
    return toEnquiry(res.data);
  },

  /** PUT /schools/:schoolId/enquiries/:id — requires MANAGE_ENQUIRIES */
  update: async (
    schoolId: string,
    id: string,
    body: UpdateEnquiryDto,
  ): Promise<Enquiry> => {
    if (USE_MOCK_API) {
      const idx = mockEnquiriesDb.findIndex((e) => e.id === id);
      if (idx === -1) return Promise.reject(new Error('Enquiry not found'));
      const updated: Enquiry = {
        ...mockEnquiriesDb[idx],
        studentName: body.studentName,
        parentName: body.parentName,
        parentPhone: body.parentPhone,
        parentEmail: body.parentEmail || '',
        classInterest: body.classInterest,
        source: body.source || '',
        status: body.status,
        notes: body.notes || '',
      };
      mockEnquiriesDb = mockEnquiriesDb.map((e) => (e.id === id ? updated : e));
      return mockDelay(updated);
    }
    const res = await api.put<ApiEnvelope<EnquiryDto>>(
      `/schools/${schoolId}/enquiries/${id}`,
      toApiBody(body, body.status),
    );
    return toEnquiry(res.data);
  },

  /** DELETE /schools/:schoolId/enquiries/:id — requires MANAGE_ENQUIRIES */
  remove: async (schoolId: string, id: string): Promise<void> => {
    if (USE_MOCK_API) {
      mockEnquiriesDb = mockEnquiriesDb.filter((e) => e.id !== id);
      await mockDelay(undefined);
      return;
    }
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/enquiries/${id}`);
  },
};
