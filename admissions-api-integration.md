# Admissions API Integration — Gap Analysis

Source spec: see [userDoc](userDoc) (applications endpoints).
Frontend module: [src/modules/admissions/](src/modules/admissions/) — covers Enquiries, Applications, Approvals, and the New Admission flow.

The Enquiries side is fully wired to the real backend. Applications now have basic CRUD wired but the **status workflow, approve/reject, and document handling are still on mock** because the backend does not yet expose those endpoints.

---

## What already exists (integrated)

| Layer | File | Status |
|---|---|---|
| Enquiries API | [src/services/modules/enquiries.api.ts](src/services/modules/enquiries.api.ts) | ✅ `list`, `getById`, `create`, `update`, `remove` — real backend |
| Applications API | [src/services/modules/applications.api.ts](src/services/modules/applications.api.ts) | ✅ `list`, `getById`, `create`, `update`, `remove` — real backend |
| Admissions store | [src/stores/admissions.store.ts](src/stores/admissions.store.ts) | ✅ `fetchApplications`, `createApplication`, `convertEnquiryToApplication` real; approve/reject/advance/upload still mock |
| Convert-to-Application modal | [src/modules/admissions/pages/EnquiryListPage.tsx](src/modules/admissions/pages/EnquiryListPage.tsx) | ✅ Collects DOB, gender, academic year before POST |
| New Admission page | [src/modules/admissions/pages/NewAdmissionPage.tsx](src/modules/admissions/pages/NewAdmissionPage.tsx) | ✅ Sends active academic year id with create |

### Available backend endpoints (5)

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/schools/:schoolId/applications`              | List (paginated) |
| `GET`    | `/schools/:schoolId/applications/:id`          | Get one |
| `POST`   | `/schools/:schoolId/applications`              | Create |
| `PUT`    | `/schools/:schoolId/applications/:id`          | Update |
| `DELETE` | `/schools/:schoolId/applications/:id`          | Delete |

---

## What is missing

The frontend's admission flow expects more than basic CRUD. Below is everything the backend still needs for the page to be fully real.

### 1. Application status workflow (3 endpoints)

The frontend has a 4-step pipeline: `submitted → under_review → verified → approved/rejected`.
Backend currently only persists `"Pending"` on the status field.

| Method | Path | Purpose |
|---|---|---|
| `PATCH` | `/schools/:schoolId/applications/:id/start-review` | Move `Submitted` → `UnderReview` |
| `PATCH` | `/schools/:schoolId/applications/:id/verify`       | Move `UnderReview` → `Verified` |
| —       | (or expand `PUT` `status` enum)                    | Accept `Submitted \| UnderReview \| Verified \| Approved \| Rejected` |

UI references: [ApplicationListPage.tsx:113-121](src/modules/admissions/pages/ApplicationListPage.tsx#L113-L121), `advanceApplicationStatus` in [admissions.store.ts](src/stores/admissions.store.ts).

---

### 2. Approve / Reject (2 endpoints)

| Method | Path | Body | Purpose |
|---|---|---|---|
| `POST` | `/schools/:schoolId/applications/:id/approve` | `{ assignedClass, assignedSection }` | **Multi-step:** generate admission number, create Student record, assign class/section, initialize ledger with class fee structure. Returns updated application + new student id. |
| `POST` | `/schools/:schoolId/applications/:id/reject`  | `{ reason: string }`                  | Set status to `Rejected` and persist reason. |

This is the **most important gap** — the entire approval workflow ([ApprovalWorkflowPage.tsx](src/modules/admissions/pages/ApprovalWorkflowPage.tsx) and the approve action in [ApplicationListPage.tsx:148-170](src/modules/admissions/pages/ApplicationListPage.tsx#L148-L170)) currently runs against the mock store.

---

### 3. Documents (3 endpoints)

Backend `Application.documents` field is currently always `null`. The frontend expects an upload-and-verify workflow per document.

| Method | Path | Purpose |
|---|---|---|
| `GET`   | `/schools/:schoolId/applications/:id/documents`                     | List checklist + per-doc status |
| `POST`  | `/schools/:schoolId/applications/:id/documents` (multipart)         | Upload a file for a document slot |
| `PATCH` | `/schools/:schoolId/applications/:id/documents/:docId/verify`       | Mark a document as verified |

UI reference: document list inside the drawer at [ApplicationListPage.tsx:548-581](src/modules/admissions/pages/ApplicationListPage.tsx#L548-L581).

**Business rule:** documents should be verified before approval is allowed. Approve button is currently soft-disabled (warns but allows) — should become a hard block once these endpoints exist.

---

### 4. Auto-generated identifiers (2 backend behaviors)

| Field | Current backend | Expected |
|---|---|---|
| `applicationNumber` | Always returns `null` | Auto-generate sequential id on POST, e.g. `APP-2026-001` |
| `admissionNumber`   | Not stored at all     | Returned by the approve endpoint (above), e.g. `ADM-2026-042` |

Frontend currently falls back to `APP-XXXXXXXX` (first 8 chars of UUID) when `applicationNumber` is null — see [applications.api.ts:74-78](src/services/modules/applications.api.ts#L74-L78).

---

### 5. Richer create/update body (1 schema expansion)

The full New Admission form ([NewAdmissionPage.tsx](src/modules/admissions/pages/NewAdmissionPage.tsx)) captures more than the backend persists. These fields are dropped today:

| Frontend field | Where captured | Backend support |
|---|---|---|
| `applicant.bloodGroup`, `religion`, `category`, `nationality`, `motherTongue` | Step 1 | ❌ |
| `parents[]` (multiple guardians with relation, occupation, income) | Step 2 | ❌ Only `parentName` + `phoneNumber` accepted |
| `address` as structured object (line1, line2, city, state, pincode) | Step 3 | ❌ Backend accepts a single nullable string |
| `siblingIds[]` | Step 4 | ❌ |
| `previousSchool`, `remarks` | Step 5 | ❌ |

POST body should be expanded to accept these as optional fields.

---

## Summary

| Area | Available | Missing |
|---|---|---|
| Basic CRUD | 5 | 0 |
| Status workflow | 0 | 3 |
| Approve / Reject | 0 | 2 |
| Documents | 0 | 3 |
| Auto-generated ids | 0 | 2 |
| Richer payload | 0 | 1 |
| **Total** | **5** | **11** |

---

## Frontend behavior today

| Action | Calls real API? | Notes |
|---|---|---|
| List applications | ✅ | `GET /schools/:id/applications` |
| Create from new admission form | ✅ | Sends only backend-supported fields |
| Convert enquiry → application | ✅ | Modal first collects DOB, gender, academic year |
| Update application | ✅ | `PUT /schools/:id/applications/:id` |
| Delete application | ✅ | `DELETE /schools/:id/applications/:id` |
| Start Review (advance status) | ❌ Mock | No backend endpoint |
| Mark Verified (advance status) | ❌ Mock | No backend endpoint |
| Approve application | ❌ Mock | No backend endpoint; mock also creates student + ledger client-side |
| Reject application | ❌ Mock | No backend endpoint |
| Upload document | ❌ Mock | No backend endpoint |

Toggle: `VITE_USE_MOCK_API=false` in [.env.local](.env.local) routes the wired calls to the real backend; the mock branches in `applications.api.ts` are dead code in this environment and exist only as a fallback when the flag is true.

---

## Open questions for backend team

1. Will status transitions be exposed as dedicated endpoints (`/start-review`, `/verify`) or as an expanded enum on `PUT /:id`?
2. Should the approve endpoint create the Student + initialize the ledger atomically, or return only the application and let the frontend orchestrate? (Atomic is strongly preferred.)
3. What's the storage strategy for uploaded documents — direct multipart to the API, or pre-signed S3 URLs?
4. Is `applicationNumber` generated on POST (preferred) or via a separate `submit` step?
