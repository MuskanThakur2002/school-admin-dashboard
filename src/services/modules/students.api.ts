import { api } from '@/services/api-client';
import type {
  Student,
  CreateStudentDto,
  UpdateStudentDto,
  StudentListParams,
  StudentListResponse,
  DemoStudent,
  ParentGuardian,
} from '@/types/student.types';
// The student-scoped documents endpoint returns the same Document shape used
// by the application-scoped one. Reuse the type instead of defining a parallel.
import type { ApplicationDocument } from '@/types/admissions.types';

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

function buildQuery(params?: StudentListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const studentsApi = {
  /** GET /schools/:schoolId/students — requires READ_STUDENT */
  list: async (schoolId: string, params?: StudentListParams): Promise<StudentListResponse> => {
    const res = await api.get<PaginatedEnvelope<Student>>(
      `/schools/${schoolId}/students${buildQuery(params)}`,
    );
    return { data: res.data, total: res.total, page: res.page, limit: res.limit };
  },

  /** GET /schools/:schoolId/students/:id — requires READ_STUDENT */
  getById: async (schoolId: string, id: string): Promise<Student> => {
    const res = await api.get<ApiEnvelope<Student>>(`/schools/${schoolId}/students/${id}`);
    return res.data;
  },

  /** POST /schools/:schoolId/students — requires CREATE_STUDENT */
  create: async (schoolId: string, body: CreateStudentDto): Promise<Student> => {
    const res = await api.post<ApiEnvelope<Student>>(`/schools/${schoolId}/students`, body);
    return res.data;
  },

  /** PUT /schools/:schoolId/students/:id — requires UPDATE_STUDENT */
  update: async (schoolId: string, id: string, body: UpdateStudentDto): Promise<Student> => {
    const res = await api.put<ApiEnvelope<Student>>(
      `/schools/${schoolId}/students/${id}`,
      body,
    );
    return res.data;
  },

  /** DELETE /schools/:schoolId/students/:id — requires DELETE_STUDENT */
  remove: async (schoolId: string, id: string): Promise<void> => {
    await api.delete<ApiEnvelope<unknown>>(`/schools/${schoolId}/students/${id}`);
  },

  /** GET /schools/:schoolId/students/:id/documents */
  listDocuments: async (
    schoolId: string,
    studentId: string,
  ): Promise<ApplicationDocument[]> => {
    const res = await api.get<ApiEnvelope<ApplicationDocument[]>>(
      `/schools/${schoolId}/students/${studentId}/documents`,
    );
    return res.data;
  },

  /**
   * POST /schools/:schoolId/students/avatar/upload
   * Upload an avatar WITHOUT attaching it to a student. Returns the S3 key
   * (`fileUrl`) + a temporary signed `validUrl`; pass the key as `avatarUrl`
   * on a later create/update.
   */
  uploadAvatar: async (
    schoolId: string,
    file: File,
  ): Promise<{ fileUrl: string; validUrl: string; fileName: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.upload<ApiEnvelope<{ fileUrl: string; validUrl: string; fileName: string }>>(
      `/schools/${schoolId}/students/avatar/upload`,
      fd,
    );
    return res.data;
  },

  /**
   * POST /schools/:schoolId/students/:id/avatar/upload
   * Upload an avatar AND set it on the student. Returns the updated student,
   * the new `avatarUrl` key, and a temporary signed `validUrl`.
   */
  uploadStudentAvatar: async (
    schoolId: string,
    id: string,
    file: File,
  ): Promise<{ student: Student; avatarUrl: string; validUrl: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.upload<ApiEnvelope<{ student: Student; avatarUrl: string; validUrl: string }>>(
      `/schools/${schoolId}/students/${id}/avatar/upload`,
      fd,
    );
    return res.data;
  },
};

// ═════════════════════════════════════════════════════════════════
// DEMO / MOCK API
// ─────────────────────────────────────────────────────────────────
// Used by modules whose own backends haven't landed yet. Once each
// of those modules cuts over to the real Student shape, drop the
// caller and eventually delete this block.
// ═════════════════════════════════════════════════════════════════

const NETWORK_DELAY_MS = 150;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

let demoStudentsDb: DemoStudent[] = [
  { id: 'stu-1', admissionNo: 'ADM-2025-001', firstName: 'Arjun', lastName: 'Patel', dateOfBirth: '2012-05-14', gender: 'male', class: 'VIII', section: 'A', rollNo: 1, bloodGroup: 'O+', nationality: 'Indian', parentName: 'Rajesh Patel', parentPhone: '9876543210', parentEmail: 'rajesh@email.com', address: '42 Green Park', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', status: 'active', joinDate: '2020-04-01' },
  { id: 'stu-2', admissionNo: 'ADM-2025-002', firstName: 'Priya', lastName: 'Sharma', dateOfBirth: '2012-08-22', gender: 'female', class: 'VIII', section: 'A', rollNo: 2, bloodGroup: 'A+', nationality: 'Indian', parentName: 'Vikram Sharma', parentPhone: '9876543211', address: '15 Lotus Colony', city: 'Mumbai', state: 'Maharashtra', pincode: '400002', status: 'active', joinDate: '2020-04-01' },
  { id: 'stu-3', admissionNo: 'ADM-2025-003', firstName: 'Rohan', lastName: 'Gupta', dateOfBirth: '2011-11-03', gender: 'male', class: 'X', section: 'A', rollNo: 1, bloodGroup: 'B+', nationality: 'Indian', parentName: 'Sunil Gupta', parentPhone: '9876543212', address: '78 Shanti Nagar', city: 'Delhi', state: 'Delhi', pincode: '110001', status: 'active', joinDate: '2019-04-01' },
  { id: 'stu-4', admissionNo: 'ADM-2025-004', firstName: 'Ananya', lastName: 'Iyer', dateOfBirth: '2013-02-17', gender: 'female', class: 'V', section: 'B', rollNo: 5, bloodGroup: 'AB+', nationality: 'Indian', parentName: 'Suresh Iyer', parentPhone: '9876543213', address: '23 Lake View Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001', status: 'active', joinDate: '2021-04-01' },
  { id: 'stu-5', admissionNo: 'ADM-2025-005', firstName: 'Kabir', lastName: 'Singh', dateOfBirth: '2012-07-09', gender: 'male', class: 'VIII', section: 'B', rollNo: 3, nationality: 'Indian', parentName: 'Harpreet Singh', parentPhone: '9876543214', address: '56 Model Town', city: 'Chandigarh', state: 'Punjab', pincode: '160001', status: 'active', joinDate: '2020-04-01' },
  { id: 'stu-6', admissionNo: 'ADM-2025-006', firstName: 'Meera', lastName: 'Nair', dateOfBirth: '2010-12-30', gender: 'female', class: 'XII', section: 'A', rollNo: 8, bloodGroup: 'O-', nationality: 'Indian', parentName: 'Krishnan Nair', parentPhone: '9876543215', address: '11 Beach Road', city: 'Kochi', state: 'Kerala', pincode: '682001', status: 'active', joinDate: '2018-04-01' },
  { id: 'stu-7', admissionNo: 'ADM-2025-007', firstName: 'Dev', lastName: 'Reddy', dateOfBirth: '2014-03-25', gender: 'male', class: 'II', section: 'A', rollNo: 12, nationality: 'Indian', parentName: 'Srinivas Reddy', parentPhone: '9876543216', address: '34 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500001', status: 'active', joinDate: '2023-04-01' },
  { id: 'stu-8', admissionNo: 'ADM-2024-089', firstName: 'Sneha', lastName: 'Joshi', dateOfBirth: '2011-06-18', gender: 'female', class: 'X', section: 'B', rollNo: 15, bloodGroup: 'A-', nationality: 'Indian', parentName: 'Amit Joshi', parentPhone: '9876543217', address: '67 Aundh Road', city: 'Pune', state: 'Maharashtra', pincode: '411007', status: 'active', joinDate: '2019-04-01' },
  { id: 'stu-9', admissionNo: 'ADM-2023-045', firstName: 'Ravi', lastName: 'Kumar', dateOfBirth: '2010-09-11', gender: 'male', class: 'XII', section: 'B', rollNo: 4, nationality: 'Indian', parentName: 'Manoj Kumar', parentPhone: '9876543218', address: '89 Gandhi Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', status: 'active', joinDate: '2018-04-01' },
  { id: 'stu-10', admissionNo: 'ADM-2022-112', firstName: 'Ishita', lastName: 'Verma', dateOfBirth: '2013-01-07', gender: 'female', class: 'V', section: 'A', rollNo: 22, bloodGroup: 'B-', nationality: 'Indian', parentName: 'Amit Verma', parentPhone: '9876543219', address: '12 Civil Lines', city: 'Lucknow', state: 'UP', pincode: '226001', status: 'inactive', joinDate: '2021-04-01' },
];

const nextRollNo = (cls: string, section: string): number => {
  const rolls = demoStudentsDb
    .filter((s) => s.class === cls && s.section === section)
    .map((s) => s.rollNo);
  return rolls.length === 0 ? 1 : Math.max(...rolls) + 1;
};

export interface CreateStudentFromApplicationDto {
  admissionNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  class: string;
  section: string;
  bloodGroup?: string;
  religion?: string;
  category?: string;
  nationality: string;
  motherTongue?: string;
  parents: ParentGuardian[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  previousSchool?: string;
  siblingIds?: string[];
}

export type PromotionAction = 'promote' | 'retain' | 'graduate' | 'withdraw';

export interface PromoteStudentDto {
  studentId: string;
  action: PromotionAction;
  targetClass?: string;
  targetSection?: string;
}

export const demoStudentsApi = {
  getStudents: (): Promise<DemoStudent[]> => delay([...demoStudentsDb]),

  getStudent: (id: string): Promise<DemoStudent> => {
    const s = demoStudentsDb.find((x) => x.id === id);
    if (!s) return Promise.reject(new Error('Student not found'));
    return delay(s);
  },

  /**
   * Search students — used for sibling lookup.
   * Matches against firstName, lastName, or admissionNo.
   */
  searchStudents: (query: string): Promise<DemoStudent[]> => {
    if (!query.trim()) return delay([]);
    const q = query.toLowerCase();
    const matches = demoStudentsDb.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q),
    );
    return delay(matches.slice(0, 8));
  },

  createFromApplication: (dto: CreateStudentFromApplicationDto): Promise<DemoStudent> => {
    const primaryParent = dto.parents[0];
    const student: DemoStudent = {
      id: `stu-${crypto.randomUUID()}`,
      admissionNo: dto.admissionNo,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      class: dto.class,
      section: dto.section,
      rollNo: nextRollNo(dto.class, dto.section),
      bloodGroup: dto.bloodGroup,
      religion: dto.religion,
      category: dto.category,
      nationality: dto.nationality,
      motherTongue: dto.motherTongue,
      parentName: primaryParent?.name || '',
      parentPhone: primaryParent?.phone || '',
      parentEmail: primaryParent?.email,
      parents: dto.parents,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      previousSchool: dto.previousSchool,
      siblingIds: dto.siblingIds,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    };
    demoStudentsDb = [student, ...demoStudentsDb];
    return delay(student);
  },

  promoteStudent: (dto: PromoteStudentDto): Promise<DemoStudent> => {
    const idx = demoStudentsDb.findIndex((s) => s.id === dto.studentId);
    if (idx === -1) return Promise.reject(new Error('Student not found'));

    const current = demoStudentsDb[idx];

    switch (dto.action) {
      case 'promote': {
        if (!dto.targetClass || !dto.targetSection) {
          return Promise.reject(new Error('Target class and section required for promote'));
        }
        demoStudentsDb[idx] = {
          ...current,
          class: dto.targetClass,
          section: dto.targetSection,
          rollNo: nextRollNo(dto.targetClass, dto.targetSection),
        };
        break;
      }
      case 'retain':
        break;
      case 'graduate':
        demoStudentsDb[idx] = { ...current, status: 'alumni' };
        break;
      case 'withdraw':
        demoStudentsDb[idx] = { ...current, status: 'tc_issued' };
        break;
    }

    return delay(demoStudentsDb[idx]);
  },

  bulkPromote: async (items: PromoteStudentDto[]): Promise<DemoStudent[]> => {
    const results: DemoStudent[] = [];
    for (const item of items) {
      const updated = await demoStudentsApi.promoteStudent(item);
      results.push(updated);
    }
    return results;
  },
};
