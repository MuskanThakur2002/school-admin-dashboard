/**
 * Students API Layer
 * Same pattern as admissions — swap function bodies when backend lands.
 */
import type { Student, ParentGuardian } from '@/types/student.types';

const NETWORK_DELAY_MS = 150;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

// ─── Mock DB ───────────────────────────────────────────────────
let studentsDb: Student[] = [
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

// ─── Helpers ────────────────────────────────────────────────────
const nextRollNo = (cls: string, section: string): number => {
  const rolls = studentsDb
    .filter((s) => s.class === cls && s.section === section)
    .map((s) => s.rollNo);
  return rolls.length === 0 ? 1 : Math.max(...rolls) + 1;
};

// ─── Public API ─────────────────────────────────────────────────

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

export const studentsApi = {
  getStudents: (): Promise<Student[]> => delay([...studentsDb]),

  getStudent: (id: string): Promise<Student> => {
    const s = studentsDb.find((x) => x.id === id);
    if (!s) return Promise.reject(new Error('Student not found'));
    return delay(s);
  },

  /**
   * Search students — used for sibling lookup.
   * Matches against firstName, lastName, or admissionNo.
   */
  searchStudents: (query: string): Promise<Student[]> => {
    if (!query.trim()) return delay([]);
    const q = query.toLowerCase();
    const matches = studentsDb.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q),
    );
    return delay(matches.slice(0, 8));
  },

  /**
   * Create a new student from an approved application.
   * This is called as part of the approval flow — when backend
   * exists, this POST would cascade: create student, init ledger,
   * assign fee plan, in a single transaction.
   */
  createFromApplication: (dto: CreateStudentFromApplicationDto): Promise<Student> => {
    const primaryParent = dto.parents[0];
    const student: Student = {
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
    studentsDb = [student, ...studentsDb];
    return delay(student);
  },

  // ─── Promotion ──────────────────────────────────────────
  /**
   * Apply a promotion action to a single student.
   *  - promote  → move to target class + section, new roll number
   *  - retain   → no change (stays in same class/section)
   *  - graduate → mark status = 'alumni' (for final class pass-outs)
   *  - withdraw → mark status = 'tc_issued' (transfer certificate issued)
   */
  promoteStudent: (dto: PromoteStudentDto): Promise<Student> => {
    const idx = studentsDb.findIndex((s) => s.id === dto.studentId);
    if (idx === -1) return Promise.reject(new Error('Student not found'));

    const current = studentsDb[idx];

    switch (dto.action) {
      case 'promote': {
        if (!dto.targetClass || !dto.targetSection) {
          return Promise.reject(new Error('Target class and section required for promote'));
        }
        studentsDb[idx] = {
          ...current,
          class: dto.targetClass,
          section: dto.targetSection,
          rollNo: nextRollNo(dto.targetClass, dto.targetSection),
        };
        break;
      }
      case 'retain':
        // no change — student stays in the same class/section
        break;
      case 'graduate':
        studentsDb[idx] = { ...current, status: 'alumni' };
        break;
      case 'withdraw':
        studentsDb[idx] = { ...current, status: 'tc_issued' };
        break;
    }

    return delay(studentsDb[idx]);
  },

  /**
   * Bulk promotion — applies actions to multiple students in sequence.
   * Returns the updated students. When backend exists, this would be a
   * single atomic transaction.
   */
  bulkPromote: async (items: PromoteStudentDto[]): Promise<Student[]> => {
    const results: Student[] = [];
    for (const item of items) {
      const updated = await studentsApi.promoteStudent(item);
      results.push(updated);
    }
    return results;
  },
};

// ─── Types ──────────────────────────────────────────────────
export type PromotionAction = 'promote' | 'retain' | 'graduate' | 'withdraw';

export interface PromoteStudentDto {
  studentId: string;
  action: PromotionAction;
  targetClass?: string;
  targetSection?: string;
}
