/**
 * Teacher API Layer
 * Same pattern as students — swap function bodies when backend lands.
 */
import type { Teacher } from '@/types/teacher.types';

const NETWORK_DELAY_MS = 150;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

// ─── Mock DB ───────────────────────────────────────────────────
let teachersDb: Teacher[] = [
  { id: 'tch-1', employeeId: 'EMP-2025-001', firstName: 'Amit', lastName: 'Verma', email: 'amit.verma@school.edu', phone: '9800100001', dateOfBirth: '1985-03-12', gender: 'male', qualification: 'M.Sc. Mathematics, B.Ed', specialization: 'Algebra & Calculus', joiningDate: '2015-06-01', subjects: ['Mathematics'], classAssignments: [{ classShortName: 'V', sections: ['A'] }, { classShortName: 'VIII', sections: ['A', 'B'] }], status: 'active', address: '12 Civil Lines', city: 'Lucknow', state: 'UP', pincode: '226001', bloodGroup: 'O+' },
  { id: 'tch-2', employeeId: 'EMP-2025-002', firstName: 'Sunita', lastName: 'Devi', email: 'sunita.devi@school.edu', phone: '9800100002', dateOfBirth: '1988-07-22', gender: 'female', qualification: 'M.A. English, B.Ed', joiningDate: '2017-04-01', subjects: ['English'], classAssignments: [{ classShortName: 'V', sections: ['B'] }, { classShortName: 'X', sections: ['A', 'B'] }], status: 'active', address: '45 MG Road', city: 'Delhi', state: 'Delhi', pincode: '110001', bloodGroup: 'A+' },
  { id: 'tch-3', employeeId: 'EMP-2025-003', firstName: 'Rajesh', lastName: 'Patel', email: 'rajesh.patel@school.edu', phone: '9800100003', dateOfBirth: '1982-11-05', gender: 'male', qualification: 'M.Sc. Physics, B.Ed', specialization: 'Mechanics & Optics', joiningDate: '2013-07-15', subjects: ['Science', 'Physics'], classAssignments: [{ classShortName: 'V', sections: ['C'] }, { classShortName: 'XII', sections: ['A'] }], status: 'active', address: '78 Shanti Nagar', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', bloodGroup: 'B+' },
  { id: 'tch-4', employeeId: 'EMP-2025-004', firstName: 'Pooja', lastName: 'Mishra', email: 'pooja.mishra@school.edu', phone: '9800100004', dateOfBirth: '1990-01-18', gender: 'female', qualification: 'M.A. Hindi, B.Ed', joiningDate: '2019-04-01', subjects: ['Hindi'], classAssignments: [{ classShortName: 'V', sections: ['A', 'B'] }, { classShortName: 'VIII', sections: ['A'] }], status: 'active', address: '23 Arera Colony', city: 'Bhopal', state: 'MP', pincode: '462001' },
  { id: 'tch-5', employeeId: 'EMP-2025-005', firstName: 'Kavita', lastName: 'Reddy', email: 'kavita.reddy@school.edu', phone: '9800100005', dateOfBirth: '1987-09-30', gender: 'female', qualification: 'M.A. History, B.Ed', specialization: 'Modern Indian History', joiningDate: '2016-06-01', subjects: ['Social Studies', 'History'], classAssignments: [{ classShortName: 'VIII', sections: ['B'] }, { classShortName: 'X', sections: ['A'] }], status: 'active', address: '56 Banjara Hills', city: 'Hyderabad', state: 'Telangana', pincode: '500034', bloodGroup: 'AB+' },
  { id: 'tch-6', employeeId: 'EMP-2025-006', firstName: 'Suresh', lastName: 'Singh', email: 'suresh.singh@school.edu', phone: '9800100006', dateOfBirth: '1980-04-25', gender: 'male', qualification: 'M.P.Ed', specialization: 'Athletics & Yoga', joiningDate: '2012-04-01', subjects: ['Physical Education'], classAssignments: [{ classShortName: 'V', sections: ['A', 'B', 'C'] }, { classShortName: 'VIII', sections: ['A', 'B'] }, { classShortName: 'X', sections: ['A', 'B'] }], status: 'active', address: '34 Model Town', city: 'Chandigarh', state: 'Punjab', pincode: '160001', bloodGroup: 'O-' },
  { id: 'tch-7', employeeId: 'EMP-2025-007', firstName: 'Suresh', lastName: 'Iyer', email: 'suresh.iyer@school.edu', phone: '9800100007', dateOfBirth: '1978-12-14', gender: 'male', qualification: 'Ph.D. Chemistry, B.Ed', specialization: 'Organic Chemistry', joiningDate: '2010-06-01', subjects: ['Chemistry', 'Science'], classAssignments: [{ classShortName: 'VIII', sections: ['A'] }, { classShortName: 'XII', sections: ['A', 'B'] }], status: 'active', address: '11 Beach Road', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', bloodGroup: 'A-' },
  { id: 'tch-8', employeeId: 'EMP-2025-008', firstName: 'Deepak', lastName: 'Joshi', email: 'deepak.joshi@school.edu', phone: '9800100008', dateOfBirth: '1986-06-08', gender: 'male', qualification: 'M.Sc. Computer Science, B.Ed', joiningDate: '2018-04-01', subjects: ['Computer Science', 'Mathematics'], classAssignments: [{ classShortName: 'X', sections: ['A'] }, { classShortName: 'XII', sections: ['B'] }], status: 'on_leave', address: '67 Aundh Road', city: 'Pune', state: 'Maharashtra', pincode: '411007', bloodGroup: 'B-', emergencyContact: '9800200008' },
  { id: 'tch-9', employeeId: 'EMP-2025-009', firstName: 'Meena', lastName: 'Nair', email: 'meena.nair@school.edu', phone: '9800100009', dateOfBirth: '1991-02-20', gender: 'female', qualification: 'M.Sc. Biology, B.Ed', joiningDate: '2020-04-01', subjects: ['Biology', 'Science'], classAssignments: [{ classShortName: 'X', sections: ['B'] }, { classShortName: 'XII', sections: ['A'] }], status: 'active', address: '22 Marine Drive', city: 'Kochi', state: 'Kerala', pincode: '682001' },
  { id: 'tch-10', employeeId: 'EMP-2025-010', firstName: 'Arun', lastName: 'Mehta', email: 'arun.mehta@school.edu', phone: '9800100010', dateOfBirth: '1975-08-15', gender: 'male', qualification: 'Ph.D. Mathematics', specialization: 'Number Theory', joiningDate: '2008-06-01', subjects: ['Mathematics'], classAssignments: [{ classShortName: 'XII', sections: ['A'] }], status: 'inactive', address: '89 Gandhi Nagar', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', bloodGroup: 'O+', emergencyContact: '9800200010' },
];

// ─── Helpers ────────────────────────────────────────────────────
let empSeq = 11;

// ─── Public API ─────────────────────────────────────────────────

export interface CreateTeacherDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  qualification: string;
  specialization?: string;
  joiningDate: string;
  subjects: string[];
  classAssignments: { classShortName: string; sections: string[] }[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export type UpdateTeacherDto = Partial<CreateTeacherDto> & { status?: 'active' | 'inactive' | 'on_leave' };

export const teacherApi = {
  /** Backend-swap: GET /api/teachers */
  getTeachers: (): Promise<Teacher[]> => delay([...teachersDb]),

  /** Backend-swap: GET /api/teachers/:id */
  getTeacher: (id: string): Promise<Teacher> => {
    const t = teachersDb.find((x) => x.id === id);
    if (!t) return Promise.reject(new Error('Teacher not found'));
    return delay(t);
  },

  /**
   * Search teachers — matches against firstName, lastName, employeeId, or email.
   * Backend-swap: GET /api/teachers/search?q=
   */
  searchTeachers: (query: string): Promise<Teacher[]> => {
    if (!query.trim()) return delay([]);
    const q = query.toLowerCase();
    const matches = teachersDb.filter(
      (t) =>
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        t.employeeId.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q),
    );
    return delay(matches.slice(0, 8));
  },

  /** Backend-swap: POST /api/teachers */
  createTeacher: (dto: CreateTeacherDto): Promise<Teacher> => {
    const teacher: Teacher = {
      id: `tch-${crypto.randomUUID()}`,
      employeeId: `EMP-${new Date().getFullYear()}-${String(empSeq++).padStart(3, '0')}`,
      ...dto,
      status: 'active',
    };
    teachersDb = [teacher, ...teachersDb];
    return delay(teacher);
  },

  /** Backend-swap: PUT /api/teachers/:id */
  updateTeacher: (id: string, dto: UpdateTeacherDto): Promise<Teacher> => {
    const idx = teachersDb.findIndex((t) => t.id === id);
    if (idx === -1) return Promise.reject(new Error('Teacher not found'));
    teachersDb[idx] = { ...teachersDb[idx], ...dto };
    return delay(teachersDb[idx]);
  },

  /** Backend-swap: DELETE /api/teachers/:id */
  deleteTeacher: (id: string): Promise<void> => {
    teachersDb = teachersDb.filter((t) => t.id !== id);
    return delay(undefined);
  },
};
