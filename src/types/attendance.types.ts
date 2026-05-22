export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

// The set this UI knows how to render and edit. Anything outside it is
// treated as "unsupported" so we don't silently clobber it on save.
export const KNOWN_ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'Present', 'Absent', 'Late', 'Leave',
];

export const isKnownAttendanceStatus = (s: string | null | undefined): s is AttendanceStatus =>
  !!s && (KNOWN_ATTENDANCE_STATUSES as readonly string[]).includes(s);

// `status` is intentionally a raw string here: the backend is the source of
// truth and may store values this UI doesn't yet recognise (e.g. "Excused",
// "Holiday"). Consumers should narrow via `isKnownAttendanceStatus` before
// treating it as a known value.
export interface AttendanceRecord {
  id: string;
  studentEnrollmentId: string;
  date: string;
  status: string;
  remarks: string | null;
  markedById: string;
  createdAt: string;
  updatedAt: string;
}

// PUT requires the full record body — we resend studentEnrollmentId, date,
// and markedById from the existing record alongside the edited fields.
// markedById intentionally preserves the original teacher's id so audit
// trail shows who marked the attendance, not who corrected it.
export interface UpdateAttendanceDto {
  studentEnrollmentId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  markedById: string;
}

export interface CreateAttendanceDto {
  studentEnrollmentId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  markedById: string;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  date?: string;
  studentEnrollmentId?: string;
  classSectionId?: string;
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
}
