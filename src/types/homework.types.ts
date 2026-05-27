export interface HomeworkSubject {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  createdAt?: string;
  updatedAt?: string;
}

// One entry in a homework's `attachments.files[]`. `fileUrl` is the stored S3
// key; `validUrl` (when present) is a temporary signed URL for display.
export interface HomeworkAttachmentFile {
  fileUrl: string;
  fileName?: string;
  validUrl?: string;
}

export interface Homework {
  id: string;
  schoolId: string;
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  title: string;
  description: string;
  dueDate: string;
  // Loosely typed because the backend stores an arbitrary JSON blob; the
  // upload endpoints append to `attachments.files[]`. Use `getAttachmentFiles`
  // to read it safely.
  attachments: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  subject?: HomeworkSubject;
}

/** Safely extract the `files[]` array from a homework's loosely-typed `attachments`. */
export function getAttachmentFiles(
  attachments: Record<string, unknown> | null | undefined,
): HomeworkAttachmentFile[] {
  const files = (attachments as { files?: unknown } | null | undefined)?.files;
  if (!Array.isArray(files)) return [];
  return files.filter(
    (f): f is HomeworkAttachmentFile =>
      !!f && typeof f === 'object' && typeof (f as { fileUrl?: unknown }).fileUrl === 'string',
  );
}

export interface CreateHomeworkDto {
  schoolId: string;
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  title: string;
  description: string;
  dueDate: string;
  attachments?: Record<string, unknown>;
}

export type UpdateHomeworkDto = Partial<CreateHomeworkDto>;

export interface HomeworkListParams {
  page?: number;
  limit?: number;
  classSectionId?: string;
  subjectId?: string;
}

export interface HomeworkListResponse {
  data: Homework[];
  total: number;
  page: number;
  limit: number;
}
