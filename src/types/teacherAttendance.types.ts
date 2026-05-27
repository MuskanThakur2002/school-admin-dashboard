export type TeacherAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused' | 'HalfDay';

// The set this UI knows how to render and edit. Anything outside it is
// treated as "unsupported" so we don't silently clobber it on save.
export const KNOWN_TEACHER_ATTENDANCE_STATUSES: readonly TeacherAttendanceStatus[] = [
  'Present', 'Absent', 'Late', 'Excused', 'HalfDay',
];

export const isKnownTeacherAttendanceStatus = (
  s: string | null | undefined,
): s is TeacherAttendanceStatus =>
  !!s && (KNOWN_TEACHER_ATTENDANCE_STATUSES as readonly string[]).includes(s);

// `status` is intentionally a raw string here: the backend is the source of
// truth and may store values this UI doesn't yet recognise. Consumers should
// narrow via `isKnownTeacherAttendanceStatus` before treating it as known.
export interface TeacherAttendanceRecord {
  id: string;
  teacherId: string;
  date: string;
  status: string;
  remarks: string | null;
  markedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherAttendanceDto {
  teacherId: string;
  date: string;
  status: TeacherAttendanceStatus;
  remarks?: string;
  markedById?: string;
}

// PUT resends the identifying fields alongside the edited ones; markedById
// preserves the original marker so the audit trail shows who marked it, not
// who corrected it.
export interface UpdateTeacherAttendanceDto {
  teacherId?: string;
  date?: string;
  status?: TeacherAttendanceStatus;
  remarks?: string;
  markedById?: string;
}

export interface TeacherAttendanceListParams {
  page?: number;
  limit?: number;
  date?: string;
  teacherId?: string;
}

export interface TeacherAttendanceListResponse {
  data: TeacherAttendanceRecord[];
  total: number;
  page: number;
  limit: number;
}
