/**
 * Admissions API Layer
 *
 * ═══════════════════════════════════════════════════════════════
 * BACKEND MIGRATION GUIDE
 * ═══════════════════════════════════════════════════════════════
 * This file is the ONLY place that touches "data". When the real
 * backend is ready, replace each function body with a fetch() call.
 *
 * Example:
 *   Before: return delay([...mockEnquiries]);
 *   After:  return api.get<Enquiry[]>('/admissions/enquiries');
 *
 * Components, stores, and pages do NOT need to change.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
  Enquiry,
  Application,
  CreateEnquiryDto,
  ApproveApplicationDto,
  ApplicationDocument,
  NewAdmissionDto,
} from '@/types/admissions.types';
import { studentsApi } from './students.api';
import { feeApi } from './fee.api';
import { ledgerApi } from './ledger.api';

// ─── Simulated network delay ────────────────────────────────────
const NETWORK_DELAY_MS = 200;
const delay = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY_MS));

// ─── Mock data (in-memory "database") ───────────────────────────

const seedDocs = (): ApplicationDocument[] => [
  { id: 'd1', name: 'Birth Certificate', status: 'pending', uploadedAt: '' },
  { id: 'd2', name: 'Aadhaar Card', status: 'pending', uploadedAt: '' },
  { id: 'd3', name: 'Passport Photo', status: 'pending', uploadedAt: '' },
  { id: 'd4', name: 'Previous School TC', status: 'pending', uploadedAt: '' },
  { id: 'd5', name: 'Address Proof', status: 'pending', uploadedAt: '' },
  { id: 'd6', name: 'Medical Certificate', status: 'pending', uploadedAt: '' },
];

const verifyDocs = (count: number): ApplicationDocument[] =>
  seedDocs().map((d, i) => ({
    ...d,
    status: i < count ? 'verified' : 'pending',
    uploadedAt: i < count ? '2026-04-05' : '',
  }));

let enquiriesDb: Enquiry[] = [
  { id: '1', studentName: 'Aarav Mehta', parentName: 'Deepak Mehta', parentPhone: '9812345001', parentEmail: 'deepak.m@email.com', classInterest: 'V', source: 'online', status: 'new', date: '2026-04-08', notes: 'Interested in CBSE curriculum' },
  { id: '2', studentName: 'Diya Kapoor', parentName: 'Neha Kapoor', parentPhone: '9812345002', parentEmail: 'neha.k@email.com', classInterest: 'I', source: 'walk_in', status: 'contacted', date: '2026-04-06', notes: 'Campus tour done' },
  { id: '3', studentName: 'Vihaan Rao', parentName: 'Sanjay Rao', parentPhone: '9812345003', parentEmail: 'sanjay.r@email.com', classInterest: 'VIII', source: 'referral', status: 'converted', date: '2026-03-28', notes: 'Referred by Mr. Patel' },
  { id: '4', studentName: 'Saanvi Das', parentName: 'Amit Das', parentPhone: '9812345004', parentEmail: 'amit.d@email.com', classInterest: 'III', source: 'advertisement', status: 'new', date: '2026-04-09', notes: 'Saw newspaper ad' },
  { id: '5', studentName: 'Reyansh Jain', parentName: 'Priya Jain', parentPhone: '9812345005', parentEmail: 'priya.j@email.com', classInterest: 'X', source: 'online', status: 'closed', date: '2026-03-15', notes: 'Chose different school' },
  { id: '6', studentName: 'Anika Bose', parentName: 'Rahul Bose', parentPhone: '9812345006', parentEmail: 'rahul.b@email.com', classInterest: 'VI', source: 'walk_in', status: 'contacted', date: '2026-04-05', notes: 'Follow up next week' },
  { id: '7', studentName: 'Aryan Tiwari', parentName: 'Pooja Tiwari', parentPhone: '9812345007', parentEmail: 'pooja.t@email.com', classInterest: 'II', source: 'referral', status: 'new', date: '2026-04-10', notes: 'Sibling already enrolled' },
  { id: '8', studentName: 'Zara Sheikh', parentName: 'Imran Sheikh', parentPhone: '9812345008', parentEmail: 'imran.s@email.com', classInterest: 'IV', source: 'online', status: 'new', date: '2026-04-11', notes: 'Relocating from Pune' },
];

let applicationsDb: Application[] = [
  { id: 'a1', applicationNo: 'APP-2026-001', studentName: 'Aarav Mehta', parentName: 'Deepak Mehta', parentPhone: '9812345001', parentEmail: 'deepak.m@email.com', classApplied: 'V', appliedDate: '2026-04-08', status: 'submitted', documents: verifyDocs(0), documentsCount: 6, documentsVerified: 0 },
  { id: 'a2', applicationNo: 'APP-2026-002', studentName: 'Diya Kapoor', parentName: 'Neha Kapoor', parentPhone: '9812345002', parentEmail: 'neha.k@email.com', classApplied: 'I', appliedDate: '2026-04-06', status: 'under_review', documents: verifyDocs(4), documentsCount: 6, documentsVerified: 4 },
  { id: 'a3', applicationNo: 'APP-2026-003', studentName: 'Aryan Tiwari', parentName: 'Pooja Tiwari', parentPhone: '9812345007', parentEmail: 'pooja.t@email.com', classApplied: 'II', appliedDate: '2026-04-05', status: 'verified', documents: verifyDocs(6), documentsCount: 6, documentsVerified: 6, verifiedDate: '2026-04-09', previousSchool: 'DPS Noida', remarks: 'All documents verified. Sibling in Class V.' },
  { id: 'a4', applicationNo: 'APP-2026-009', studentName: 'Myra Chopra', parentName: 'Akash Chopra', parentPhone: '9876500001', parentEmail: 'akash.c@email.com', classApplied: 'IV', appliedDate: '2026-04-02', status: 'verified', documents: verifyDocs(6), documentsCount: 6, documentsVerified: 6, verifiedDate: '2026-04-08', previousSchool: 'Ryan International', remarks: 'Strong academic record. Transfer certificate received.' },
  { id: 'a5', applicationNo: 'APP-2026-010', studentName: 'Vivaan Saxena', parentName: 'Nidhi Saxena', parentPhone: '9876500002', parentEmail: 'nidhi.s@email.com', classApplied: 'VII', appliedDate: '2026-03-30', status: 'verified', documents: verifyDocs(5), documentsCount: 6, documentsVerified: 5, verifiedDate: '2026-04-07', remarks: 'Medical certificate pending. Parent informed.' },
  { id: 'a6', applicationNo: 'APP-2026-004', studentName: 'Saanvi Das', parentName: 'Amit Das', parentPhone: '9812345004', parentEmail: 'amit.d@email.com', classApplied: 'III', appliedDate: '2026-04-03', status: 'approved', documents: verifyDocs(6), documentsCount: 6, documentsVerified: 6, admissionNo: 'ADM-2026-042', assignedClass: 'III', assignedSection: 'A' },
  { id: 'a7', applicationNo: 'APP-2026-005', studentName: 'Vihaan Rao', parentName: 'Sanjay Rao', parentPhone: '9812345003', parentEmail: 'sanjay.r@email.com', classApplied: 'VIII', appliedDate: '2026-03-28', status: 'approved', documents: verifyDocs(6), documentsCount: 6, documentsVerified: 6, admissionNo: 'ADM-2026-041', assignedClass: 'VIII', assignedSection: 'B' },
  { id: 'a8', applicationNo: 'APP-2026-006', studentName: 'Riya Sethi', parentName: 'Manish Sethi', parentPhone: '9876500003', parentEmail: 'manish.s@email.com', classApplied: 'VI', appliedDate: '2026-04-01', status: 'rejected', documents: verifyDocs(2), documentsCount: 4, documentsVerified: 2, rejectionReason: 'Incomplete documents after follow-up' },
  { id: 'a9', applicationNo: 'APP-2026-007', studentName: 'Kabir Malhotra', parentName: 'Ritu Malhotra', parentPhone: '9876500004', parentEmail: 'ritu.m@email.com', classApplied: 'IX', appliedDate: '2026-04-09', status: 'submitted', documents: verifyDocs(0), documentsCount: 6, documentsVerified: 0 },
  { id: 'a10', applicationNo: 'APP-2026-008', studentName: 'Anika Bose', parentName: 'Rahul Bose', parentPhone: '9812345006', parentEmail: 'rahul.b@email.com', classApplied: 'VI', appliedDate: '2026-04-07', status: 'under_review', documents: verifyDocs(3), documentsCount: 6, documentsVerified: 3 },
];

// ─── Helpers ────────────────────────────────────────────────────
const nextApplicationNo = () => {
  const maxNum = applicationsDb.reduce((max, a) => {
    const n = parseInt(a.applicationNo.split('-').pop() || '0', 10);
    return n > max ? n : max;
  }, 0);
  return `APP-2026-${String(maxNum + 1).padStart(3, '0')}`;
};

const nextAdmissionNo = () => {
  const maxNum = applicationsDb
    .filter((a) => a.admissionNo)
    .reduce((max, a) => {
      const n = parseInt(a.admissionNo!.split('-').pop() || '0', 10);
      return n > max ? n : max;
    }, 0);
  return `ADM-2026-${String(maxNum + 1).padStart(3, '0')}`;
};

// ═════════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════════

export const admissionsApi = {
  // ─── Enquiries ──────────────────────────────────────────────────
  getEnquiries: (): Promise<Enquiry[]> => delay([...enquiriesDb]),

  createEnquiry: (dto: CreateEnquiryDto): Promise<Enquiry> => {
    const enquiry: Enquiry = {
      id: crypto.randomUUID(),
      studentName: dto.studentName,
      parentName: dto.parentName,
      parentPhone: dto.parentPhone,
      parentEmail: dto.parentEmail || '',
      classInterest: dto.classInterest,
      source: dto.source || 'walk_in',
      status: 'new',
      date: new Date().toISOString().split('T')[0],
      notes: dto.notes || '',
    };
    enquiriesDb = [enquiry, ...enquiriesDb];
    return delay(enquiry);
  },

  updateEnquiryStatus: (id: string, status: Enquiry['status']): Promise<Enquiry> => {
    const idx = enquiriesDb.findIndex((e) => e.id === id);
    if (idx === -1) return Promise.reject(new Error('Enquiry not found'));
    enquiriesDb[idx] = { ...enquiriesDb[idx], status };
    return delay(enquiriesDb[idx]);
  },

  deleteEnquiry: (id: string): Promise<void> => {
    enquiriesDb = enquiriesDb.filter((e) => e.id !== id);
    return delay(undefined);
  },

  /** Convert an enquiry into a submitted application. */
  convertEnquiryToApplication: (enquiryId: string): Promise<Application> => {
    const enquiry = enquiriesDb.find((e) => e.id === enquiryId);
    if (!enquiry) return Promise.reject(new Error('Enquiry not found'));

    const application: Application = {
      id: crypto.randomUUID(),
      applicationNo: nextApplicationNo(),
      enquiryId: enquiry.id,
      studentName: enquiry.studentName,
      parentName: enquiry.parentName,
      parentPhone: enquiry.parentPhone,
      parentEmail: enquiry.parentEmail,
      classApplied: enquiry.classInterest,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'submitted',
      documents: seedDocs(),
      documentsCount: 6,
      documentsVerified: 0,
    };
    applicationsDb = [application, ...applicationsDb];

    // Mark enquiry as converted
    const idx = enquiriesDb.findIndex((e) => e.id === enquiryId);
    if (idx !== -1) enquiriesDb[idx] = { ...enquiriesDb[idx], status: 'converted' };

    return delay(application);
  },

  // ─── Applications ───────────────────────────────────────────────
  getApplications: (): Promise<Application[]> => delay([...applicationsDb]),

  getApplication: (id: string): Promise<Application> => {
    const app = applicationsDb.find((a) => a.id === id);
    if (!app) return Promise.reject(new Error('Application not found'));
    return delay(app);
  },

  /**
   * Create a full admission application directly (primary SOW flow).
   * Admin captures student details, uploads documents, assigns class.
   */
  createApplication: (dto: NewAdmissionDto): Promise<Application> => {
    const primaryParent = dto.parents[0];
    const fullName = `${dto.applicant.firstName} ${dto.applicant.lastName}`.trim();

    const application: Application = {
      id: crypto.randomUUID(),
      applicationNo: nextApplicationNo(),
      studentName: fullName,
      parentName: primaryParent?.name || '',
      parentPhone: primaryParent?.phone || '',
      parentEmail: primaryParent?.email || '',
      classApplied: dto.classApplied,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'submitted',
      applicant: dto.applicant,
      parents: dto.parents,
      address: dto.address,
      siblingIds: dto.siblingIds,
      previousSchool: dto.previousSchool,
      remarks: dto.remarks,
      documents: seedDocs(),
      documentsCount: 6,
      documentsVerified: 0,
    };

    applicationsDb = [application, ...applicationsDb];
    return delay(application);
  },

  /** Move an application to the next stage: submitted → under_review → verified. */
  advanceApplicationStatus: (id: string): Promise<Application> => {
    const idx = applicationsDb.findIndex((a) => a.id === id);
    if (idx === -1) return Promise.reject(new Error('Application not found'));

    const nextMap: Record<string, Application['status']> = {
      submitted: 'under_review',
      under_review: 'verified',
    };
    const current = applicationsDb[idx].status;
    const next = nextMap[current];
    if (!next) return Promise.reject(new Error('Cannot advance from this status'));

    applicationsDb[idx] = {
      ...applicationsDb[idx],
      status: next,
      verifiedDate: next === 'verified' ? new Date().toISOString().split('T')[0] : applicationsDb[idx].verifiedDate,
      documentsVerified: next === 'verified' ? applicationsDb[idx].documentsCount : applicationsDb[idx].documentsVerified,
      documents: next === 'verified' ? verifyDocs(applicationsDb[idx].documentsCount) : applicationsDb[idx].documents,
    };
    return delay(applicationsDb[idx]);
  },

  // ─── Approvals ──────────────────────────────────────────────────

  /**
   * Approve an application — SOW workflow:
   *   "Student profile created, admission number generated,
   *    ledger initialized, fee plan assigned."
   *
   * On approval we:
   *   1. Generate unique admission number
   *   2. Assign class/section
   *   3. Create a Student record via studentsApi (full demographics)
   *   4. (Backend-only) initialize ledger with fee plan
   *
   * Returns the updated application with createdStudentId populated.
   */
  approveApplication: async (id: string, dto: ApproveApplicationDto): Promise<Application> => {
    const idx = applicationsDb.findIndex((a) => a.id === id);
    if (idx === -1) return Promise.reject(new Error('Application not found'));

    const app = applicationsDb[idx];
    const admissionNo = nextAdmissionNo();

    // 1. Create the student record from the application's captured details.
    // If the application was created via the full form, we have rich data.
    // If it came from an enquiry conversion, we fall back to splitting studentName.
    const [firstName, ...rest] = app.studentName.split(' ');
    const lastName = rest.join(' ');

    const student = await studentsApi.createFromApplication({
      admissionNo,
      firstName: app.applicant?.firstName || firstName || 'Unknown',
      lastName: app.applicant?.lastName || lastName || '',
      dateOfBirth: app.applicant?.dateOfBirth || '',
      gender: app.applicant?.gender || 'male',
      class: dto.assignedClass,
      section: dto.assignedSection,
      bloodGroup: app.applicant?.bloodGroup,
      religion: app.applicant?.religion,
      category: app.applicant?.category,
      nationality: app.applicant?.nationality || 'Indian',
      motherTongue: app.applicant?.motherTongue,
      parents: app.parents || [
        { id: 'p1', name: app.parentName, relation: 'father', phone: app.parentPhone, email: app.parentEmail },
      ],
      address: app.address?.line1 || '',
      city: app.address?.city || '',
      state: app.address?.state || '',
      pincode: app.address?.pincode || '',
      previousSchool: app.previousSchool,
      siblingIds: app.siblingIds,
    });

    // 2. Update the application with the new admission number, assignment, and student link.
    applicationsDb[idx] = {
      ...app,
      status: 'approved',
      admissionNo,
      assignedClass: dto.assignedClass,
      assignedSection: dto.assignedSection,
      createdStudentId: student.id,
    };

    // 3. Look up the fee structure for this class (auto-assign fee plan)
    const feeStructure = await feeApi.getStructureForClass(dto.assignedClass);
    // Initialize the student's ledger with debit entries from the fee structure
    if (feeStructure) {
      ledgerApi.registerStudentInfo(student.id, `${student.firstName} ${student.lastName}`, admissionNo, dto.assignedClass, dto.assignedSection);
      await ledgerApi.initializeLedger({ studentId: student.id, feeStructureId: feeStructure.id });
    }

    return delay(applicationsDb[idx]);
  },

  rejectApplication: (id: string, reason: string): Promise<Application> => {
    const idx = applicationsDb.findIndex((a) => a.id === id);
    if (idx === -1) return Promise.reject(new Error('Application not found'));
    applicationsDb[idx] = { ...applicationsDb[idx], status: 'rejected', rejectionReason: reason };
    return delay(applicationsDb[idx]);
  },

  // ─── Documents ──────────────────────────────────────────────────
  uploadDocument: (appId: string, docId: string, filename: string): Promise<Application> => {
    const idx = applicationsDb.findIndex((a) => a.id === appId);
    if (idx === -1) return Promise.reject(new Error('Application not found'));

    const app = applicationsDb[idx];
    const docs = app.documents.map((d) =>
      d.id === docId
        ? { ...d, status: 'verified' as const, uploadedAt: new Date().toISOString().split('T')[0], name: filename || d.name }
        : d,
    );
    const verified = docs.filter((d) => d.status === 'verified').length;

    applicationsDb[idx] = {
      ...app,
      documents: docs,
      documentsVerified: verified,
    };
    return delay(applicationsDb[idx]);
  },
};
