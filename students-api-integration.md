# Students API Integration — Gap Analysis

Source spec: see [student](student) (5 student endpoints).
Frontend module: [src/modules/students/](src/modules/students/) — list page, profile page, Add Student modal.

The Student CRUD layer is now wired against the real backend. The mock data the rest of the app was built on (rich `firstName`/`lastName`/`class`/`section`/`rollNo` shape) has been kept alive under a parallel **`DemoStudent` / `demoStudentsApi` / `useDemoStudentsStore`** so the 6 dependent modules keep working unchanged. Once each of those modules' own backends lands, they'll cut over and the demo layer can be deleted.

---

## What already exists (integrated)

| Layer | File | Status |
|---|---|---|
| Student types | [src/types/student.types.ts](src/types/student.types.ts) | ✅ `Student`, `CreateStudentDto`, `UpdateStudentDto`, `StudentListParams`, `StudentListResponse` |
| Students API | [src/services/modules/students.api.ts](src/services/modules/students.api.ts) | ✅ `list`, `getById`, `create`, `update`, `remove` — real backend |
| Students store | [src/stores/students.store.ts](src/stores/students.store.ts) | ✅ `fetchStudents`, `getStudent`, `createStudent`, `updateStudent`, `deleteStudent` |
| Student list + Add modal | [src/modules/students/pages/StudentListPage.tsx](src/modules/students/pages/StudentListPage.tsx) | ✅ List, search, delete, Add Student (uses real `parentsApi.list` for parent picker) |
| Student profile | [src/modules/students/pages/StudentProfilePage.tsx](src/modules/students/pages/StudentProfilePage.tsx) | ✅ Personal + Enrolment + Parent + Other cards |

### Available backend endpoints (5)

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/schools/:schoolId/students`              | List (paginated) |
| `GET`    | `/schools/:schoolId/students/:id`          | Get one |
| `POST`   | `/schools/:schoolId/students`              | Create (requires existing `parentId`) |
| `PUT`    | `/schools/:schoolId/students/:id`          | Update |
| `DELETE` | `/schools/:schoolId/students/:id`          | Delete |

The FK constraint on `parentId` (mirrored at userDoc:423 for parents) means a parent must be created **before** a student can be created. The Add Student modal enforces this by requiring a parent picker populated from `parentsApi.list`.

---

## What is missing

### 1. Edit Student flow (frontend only — backend already supports)

The store exposes `updateStudent`, but no UI surfaces it.

| Layer | Status |
|---|---|
| `studentsApi.update` | ✅ wired |
| `useStudentsStore.updateStudent` | ✅ exposed, unused |
| Edit Student modal | ❌ missing |
| "Edit" entry point on profile / list row | ❌ missing |

This is **pure frontend work** — ~60 lines, mirrors `AddStudentModal` in [StudentListPage.tsx](src/modules/students/pages/StudentListPage.tsx).

---

### 2. The 6 downstream modules still on the demo shape

The following modules were built against a rich mock Student shape (`firstName`, `lastName`, `class`, `section`, `rollNo`, `parentName`, `parentPhone`, `address`, etc.). They're now backed by `DemoStudent` / `demoStudentsApi` / `useDemoStudentsStore` and untouched by the real backend integration. Each will need its own migration once its module-level backend lands.

| Module | Files using `demoStudentsApi` / `useDemoStudentsStore` | What it needs from a real Student |
|---|---|---|
| Admissions (approve flow) | [admissions.api.ts:25](src/services/modules/admissions.api.ts#L25), [NewAdmissionPage.tsx:13](src/modules/admissions/pages/NewAdmissionPage.tsx#L13) | Sibling search, `createFromApplication` cascade, full demographics on the Application |
| Promotion | [PromotionPage.tsx:12](src/modules/academic-setup/pages/PromotionPage.tsx#L12) | Class / section / rollNo on Student; `bulkPromote` endpoint |
| Receipts | [PaymentPostingPage.tsx:10](src/modules/receipts/pages/PaymentPostingPage.tsx#L10), [receipt.api.ts:16](src/services/modules/receipt.api.ts#L16) | `studentName`, `class`, `section`, `admissionNumber` fields on receipts |
| Expenses | [ExpensePostingPage.tsx:13](src/modules/expenses/pages/ExpensePostingPage.tsx#L13), [expense.api.ts:6](src/services/modules/expense.api.ts#L6) | Same denormalized snapshot fields |
| Ledger | [StudentLedgerPage.tsx:6](src/modules/ledger/pages/StudentLedgerPage.tsx#L6) | Display name, admission no., class for the journal header |
| Fee engine | [ManualAdjustmentPage.tsx:14](src/modules/fee-engine/pages/ManualAdjustmentPage.tsx#L14), [adjustment.api.ts:6](src/services/modules/adjustment.api.ts#L6) | Same denormalized snapshot fields |

These modules currently work against the in-memory `demoStudentsDb` seed in [students.api.ts](src/services/modules/students.api.ts) (10 fixture students). Until the backend Student gains `class` / `section` / `rollNo` (or those move to a dedicated enrolment table), or until each module re-models its own data without those joins, they stay on the demo shape.

---

### 3. Class / section / roll-number model — backend gap

The real Student schema today has no concept of class enrolment. This is a bigger schema decision than a single endpoint:

- Add `classId`, `sectionId`, `rollNumber` to Student (denormalized), or
- Create a separate `Enrolment` table joining Student ↔ Class for an academic year.

Either way, every dependent module (promotion, attendance, fee assignment, marks, timetable) is blocked until this lands.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/schools/:schoolId/classes/:classId/students` | Roster for a class |
| `POST` | `/schools/:schoolId/students/:id/enrol` | Enrol student in `{ classId, sectionId, year }` |
| `POST` | `/schools/:schoolId/promotions` | Bulk promotion of a roster between classes |

**Biggest functional gap.** Without it, the StudentList page can't show class/section, promotion can't run against the real DB, and fee assignment can't be auto-resolved by class.

---

### 4. Server-side search & filter on students list

`GET /schools/:schoolId/students` currently only accepts `page` + `limit`. The list page filters client-side over the loaded page — fine for a few dozen rows, breaks at scale.

| Method | Path | Missing param | Purpose |
|---|---|---|---|
| `GET` | `/schools/:schoolId/students` | `q` / `search` | Match name, admission no. |
| `GET` | `/schools/:schoolId/students` | `status` | Filter by status |
| `GET` | `/schools/:schoolId/students` | `parentId` | "All children of parent X" — symmetrical to the parents-side gap |

---

### 5. Parent ↔ Student relation queries

A parent profile page currently has no "Children" card because the back-link doesn't exist. Two reciprocal endpoints would unblock it:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/schools/:schoolId/parents/:id/children` | List students linked to this parent |
| `GET` | `/schools/:schoolId/students?parentId=...` | Same data, different shape |

Today the Student profile page surfaces only the `parentId` and a "View parent profile" link.

---

### 6. Application → Student materialisation

Per the SOW admissions flow: "Student profile created, admission number generated, ledger initialised, fee plan assigned." Today the `applicationId` field on Student is ungrounded — no endpoint creates a real Student from an approved Application. The demo path exists in [admissions.api.ts:206](src/services/modules/admissions.api.ts#L206) (`demoStudentsApi.createFromApplication`).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/schools/:schoolId/applications/:id/approve` | Atomic: create Student + initialise ledger + assign fee plan |

Without this, the admissions module cannot graduate to the real backend even if Students CRUD is live.

---

### 7. Sibling group population

Real Student exposes `siblingGroupId: string \| null` but no endpoint creates / inspects sibling groups.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/schools/:schoolId/sibling-groups` | Create a sibling group |
| `POST` | `/schools/:schoolId/sibling-groups/:id/members` | Add a student to a group |
| `GET` | `/schools/:schoolId/sibling-groups/:id` | List members |

The admissions sibling search uses `demoStudentsApi.searchStudents` for now ([NewAdmissionPage.tsx:55](src/modules/admissions/pages/NewAdmissionPage.tsx#L55)).

---

## Summary

| Area | Available | Missing |
|---|---|---|
| Student CRUD | 5 | 0 |
| Edit UI (frontend) | 0 | 1 modal |
| Class / section / roll model | 0 | schema decision + 3 endpoints |
| Server-side search / filter | 0 | 3 query params |
| Parent → children link | 0 | 1 endpoint (or query param) |
| Application → Student approve | 0 | 1 endpoint |
| Sibling groups | 0 | 3 endpoints |
| Demo modules to migrate | n/a | 6 modules |
| **Total endpoints** | **5** | **11+** |

---

## Frontend behavior today

| Action | Calls real API? | Notes |
|---|---|---|
| List students | ✅ | `GET /schools/:id/students` |
| Get student profile | ✅ | `GET /schools/:id/students/:id` |
| Add student | ✅ | `POST /schools/:id/students` (parent picker uses real `parentsApi.list`) |
| Edit student | ❌ Not built | Store method exists; no UI |
| Delete student | ✅ | `DELETE /schools/:id/students/:id` |
| Search students | ⚠️ Client-only | Filters loaded page; no `q` param |
| Sibling search (admissions) | ⚠️ Mock | Uses `demoStudentsApi.searchStudents` |
| Approve application → create student | ⚠️ Mock | Uses `demoStudentsApi.createFromApplication` |
| Promotion | ⚠️ Mock | Uses `demoStudentsApi.bulkPromote` |
| Receipts / expenses / adjustments / ledger | ⚠️ Mock | All look up demographics via `demoStudentsApi.getStudent` |

---

## Open questions for backend team

1. Where will class / section / roll number live — denormalized on Student, or in a separate Enrolment table per academic year? This blocks promotion, attendance, fee assignment.
2. Will `POST /students` ever cascade an Application → Student creation, or is that a separate `/applications/:id/approve` route?
3. Do siblings need to be modelled as a first-class group (`siblingGroupId`), or is bidirectional `siblingIds: string[]` cheaper?
4. Will `GET /students` gain server-side search (`q`) and filtering (`status`, `parentId`)?
5. Should `DELETE /students/:id` cascade ledger / receipts / fee assignments, or do we orchestrate that on the frontend?
