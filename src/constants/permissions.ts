// Canonical permission vocabulary — mirrors the backend `PERMISSIONS` enum
// (school-management-backend/src/constants/permissions.ts). The login token
// embeds exactly these strings in `user.permissions`, so the UI must check
// against the same names. Keep in sync with the backend.
export const PERMISSIONS = {
  // Global & Tenant Management
  CREATE_SCHOOL: 'CREATE_SCHOOL',
  READ_SCHOOL: 'READ_SCHOOL',
  UPDATE_SCHOOL: 'UPDATE_SCHOOL',
  DELETE_SCHOOL: 'DELETE_SCHOOL',

  // Role & Permission Management
  CREATE_ROLE: 'CREATE_ROLE',
  READ_ROLE: 'READ_ROLE',
  UPDATE_ROLE: 'UPDATE_ROLE',
  DELETE_ROLE: 'DELETE_ROLE',

  // User Management
  CREATE_USER: 'CREATE_USER',
  READ_USER: 'READ_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',

  // Teacher Management
  CREATE_TEACHER: 'CREATE_TEACHER',
  READ_TEACHER: 'READ_TEACHER',
  UPDATE_TEACHER: 'UPDATE_TEACHER',
  DELETE_TEACHER: 'DELETE_TEACHER',

  // Parent Management
  CREATE_PARENT: 'CREATE_PARENT',
  READ_PARENT: 'READ_PARENT',
  UPDATE_PARENT: 'UPDATE_PARENT',
  DELETE_PARENT: 'DELETE_PARENT',

  // Student Management
  CREATE_STUDENT: 'CREATE_STUDENT',
  READ_STUDENT: 'READ_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  DELETE_STUDENT: 'DELETE_STUDENT',

  // Enquiries & Applications
  MANAGE_ENQUIRIES: 'MANAGE_ENQUIRIES',
  MANAGE_APPLICATIONS: 'MANAGE_APPLICATIONS',

  // Academics
  MANAGE_CLASSES: 'MANAGE_CLASSES',
  MANAGE_SUBJECTS: 'MANAGE_SUBJECTS',
  MANAGE_TIMETABLE: 'MANAGE_TIMETABLE',

  // Operations
  MARK_ATTENDANCE: 'MARK_ATTENDANCE',
  READ_ATTENDANCE: 'READ_ATTENDANCE',
  MARK_TEACHER_ATTENDANCE: 'MARK_TEACHER_ATTENDANCE',
  READ_TEACHER_ATTENDANCE: 'READ_TEACHER_ATTENDANCE',
  MANAGE_HOMEWORK: 'MANAGE_HOMEWORK',
  READ_HOMEWORK: 'READ_HOMEWORK',
  MANAGE_ASSESSMENTS: 'MANAGE_ASSESSMENTS',
  MANAGE_MARKS: 'MANAGE_MARKS',
  READ_MARKS: 'READ_MARKS',

  // Financials
  MANAGE_FEE_STRUCTURES: 'MANAGE_FEE_STRUCTURES',
  MANAGE_FEE_ASSIGNMENTS: 'MANAGE_FEE_ASSIGNMENTS',
  COLLECT_FEES: 'COLLECT_FEES',
  MANAGE_LEDGER: 'MANAGE_LEDGER',
  READ_LEDGER: 'READ_LEDGER',

  // Communications & Documents
  MANAGE_NOTIFICATIONS: 'MANAGE_NOTIFICATIONS',
  SEND_NOTIFICATIONS: 'SEND_NOTIFICATIONS',
  MANAGE_DOCUMENTS: 'MANAGE_DOCUMENTS',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role names — mirrors backend `ROLES` enum. Used for the few places gated by
// role rather than permission (e.g. the parent-only Results view).
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  ACCOUNTANT: 'Accountant',
  MANAGER: 'Manager',
} as const;
