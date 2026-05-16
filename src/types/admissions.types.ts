import type { ParentGuardian } from '@/types/student.types';

/** Free-form source label as captured by the school (e.g. "Walk-in", "Phone Call"). */
export type EnquirySource = string;
export type EnquiryStatus = 'new' | 'contacted' | 'converted' | 'lost';

export interface Enquiry {
  id: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  classInterest: string;
  source: EnquirySource;
  status: EnquiryStatus;
  date: string;
  notes: string;
}

export type ApplicationStatus = 'submitted' | 'under_review' | 'verified' | 'approved' | 'rejected';
export type DocumentStatus = 'pending' | 'verified' | 'rejected';

/**
 * Document record returned by the backend's per-application documents endpoint.
 * `fileUrl` is a pre-signed S3 URL valid for ~1 hour.
 */
export interface ApplicationDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  type: string;
  isVerified: boolean;
  uploadedAt: string;
}

/**
 * Full student demographics captured on an admission application.
 * This is what's missing from an Enquiry (which is minimal).
 */
export interface ApplicantDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  religion?: string;
  category?: string;
  nationality: string;
  motherTongue?: string;
}

export interface ApplicantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Application {
  id: string;
  enquiryId?: string; // link back to originating enquiry if converted
  /** Academic year — needed to create ledger entries / payments after approval. */
  academicYearId?: string;

  // Legacy flat fields (still populated for backwards compat / quick display)
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  classApplied: string;
  appliedDate: string;
  status: ApplicationStatus;

  // NEW: full demographic capture
  applicant?: ApplicantDetails;
  parents?: ParentGuardian[];
  address?: ApplicantAddress;

  documents: ApplicationDocument[];
  documentsVerified: number;
  documentsCount: number;
  previousSchool?: string;
  remarks?: string;
  verifiedDate?: string;

  // Populated on approval
  admissionNo?: string;
  assignedClass?: string;
  assignedSection?: string;
  createdStudentId?: string;
  /** Enrollment row created by the approve endpoint — needed for ledger/payment calls. */
  createdEnrollmentId?: string;
  rejectionReason?: string;
}

export interface CreateEnquiryDto {
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  classInterest: string;
  source?: EnquirySource;
  notes?: string;
}

export interface UpdateEnquiryDto extends CreateEnquiryDto {
  status: EnquiryStatus;
}

/**
 * Direct-admission form payload. Mirrors what the backend `POST /applications`
 * accepts today — no extra fields silently dropped on POST.
 */
export interface NewAdmissionDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  classApplied: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address?: string;
}

export interface ApproveApplicationDto {
  /** classMasterId UUID. */
  assignedClass: string;
  /** classSectionId UUID. */
  assignedSection: string;
  /** Optional — backend approve doesn't accept these; they're applied via a follow-up PUT /students/:id. */
  parentId?: string;
  transportRoute?: string;
  medicalNotes?: string;
}
