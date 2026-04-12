import type { ParentGuardian } from '@/types/student.types';

export type EnquirySource = 'walk_in' | 'online' | 'referral' | 'advertisement';
export type EnquiryStatus = 'new' | 'contacted' | 'converted' | 'closed';

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

export interface ApplicationDocument {
  id: string;
  name: string;
  status: DocumentStatus;
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
  applicationNo: string;
  enquiryId?: string; // link back to originating enquiry if converted

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
  siblingIds?: string[];

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

/**
 * Full admission form — used when admin directly starts an admission
 * (the SOW primary flow: "Admin captures student details...").
 */
export interface NewAdmissionDto {
  applicant: ApplicantDetails;
  classApplied: string;
  parents: ParentGuardian[];
  address: ApplicantAddress;
  previousSchool?: string;
  siblingIds?: string[];
  remarks?: string;
}

export interface ApproveApplicationDto {
  assignedClass: string;
  assignedSection: string;
}
