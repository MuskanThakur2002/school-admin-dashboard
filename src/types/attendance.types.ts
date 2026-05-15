export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

export interface AttendanceRecord {
  id: string;
  studentEnrollmentId: string;
  date: string;
  status: AttendanceStatus | string;
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
  status: AttendanceStatus | string;
  remarks: string | null;
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
