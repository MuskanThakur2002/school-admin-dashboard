# Teacher Flow — API Integration Status

Last updated: 2026-05-10

## Summary

Backend exposes 10 endpoints across two resources (users, teachers). All 10 are
wired in the API layer. The teacher flow is **mostly complete in the UI** —
only the Edit-Teacher surface is missing. A dedicated Users page is not built
(users are only created indirectly via the Add-Teacher modal).

## API endpoints (per [userDoc](../../userDoc))

### Users — `/schools/:schoolId/users`

| Method | Path | API layer | Store action | UI surface |
|---|---|---|---|---|
| GET | `/users?page=&limit=` | ✅ `usersApi.list` | — | ❌ no Users page |
| POST | `/users` | ✅ `usersApi.create` | ✅ used inside `createTeacher` | ✅ Add Teacher modal |
| GET | `/users/:id` | ✅ `usersApi.getById` | — | ❌ |
| PUT | `/users/:id` | ✅ `usersApi.update` | — | ❌ |
| DELETE | `/users/:id` | ✅ `usersApi.remove` | — | ❌ |

### Teachers — `/schools/:schoolId/teachers`

| Method | Path | API layer | Store action | UI surface |
|---|---|---|---|---|
| GET | `/teachers?page=&limit=` | ✅ `teacherApi.list` | ✅ `fetchTeachers` | ✅ TeacherListPage |
| POST | `/teachers` | ✅ `teacherApi.create` | ✅ `createTeacher` (composite: user → teacher) | ✅ Add Teacher modal |
| GET | `/teachers/:id` | ✅ `teacherApi.getById` | ✅ `getTeacher` | ✅ TeacherProfilePage |
| PUT | `/teachers/:id` | ✅ `teacherApi.update` | ✅ `updateTeacher` | ❌ no Edit modal |
| DELETE | `/teachers/:id` | ✅ `teacherApi.remove` | ✅ `deleteTeacher` | ✅ row trash button |

## What's missing from the Teacher page

### 1. Edit Teacher (PRIMARY GAP)
- **Status:** API + store ready, **no UI**.
- **Needed:** an Edit modal (or pencil icon on row) that opens with prefilled
  values and calls `updateTeacher(id, dto)` for `employeeId` / `hireDate`.
- **Open question:** the PUT teachers endpoint only updates teacher fields
  (employeeId, hireDate). To edit the user's name/email/phone, we'd also need
  to call `usersApi.update(schoolId, teacher.userId, ...)` — likely as a
  composite store action mirroring the create flow.

### 2. Pagination on the list
- **Status:** store tracks `page / limit / total`, but the UI fetches a hard
  `fetchTeachers(1, 50)` and never paginates.
- **Needed:** page controls in the table footer; wire to `fetchTeachers(page, limit)`.

### 3. Server-side search
- **Status:** search is currently client-side (filters the in-memory page of
  50). Backend doesn't appear to expose a `search` query param for teachers.
- **Decision needed:** confirm with backend whether to add `?search=` support,
  or accept client-side as the long-term answer.

### 4. Profile page is thin
- **Status:** GET `/teachers/:id` returns only `{ id, name, email, phoneNumber }`
  on the nested user — no `address`, `whatsapp`, `isActive`, `roleName`.
- **Option:** fetch `usersApi.getById(schoolId, teacher.userId)` from the
  profile page to enrich the Account card with address / whatsapp / role.

### 5. Confirm modal for delete
- **Status:** uses native `window.confirm()`.
- **Needed:** swap for a styled confirm dialog (no Confirm primitive exists
  yet — would need to build or extend `Modal`).

### 6. Export button is decorative
- **Status:** the "Export" button in the header has no `onClick`.
- **Decision needed:** scope (CSV of current page? all teachers? which fields?).

## What's missing from the broader Users surface (non-blocking for teachers)

If user management becomes its own feature:

- **Users list page** — `usersApi.list` exists but no page renders it.
- **Edit user modal** — `usersApi.update` exists but no UI.
- **Deactivate / re-activate** — could toggle `isActive` via PUT.
- **Reset password** — backend behavior unknown; needs a separate endpoint
  spec (not in current userDoc).

## Field-shape gaps (UI fields the backend doesn't carry)

The original mock-mode `Teacher` type had many fields the API omits. They were
removed in the rewrite, but if any of them matter for the product, the backend
schema needs to grow:

- `firstName / lastName` (backend uses single `name`)
- `qualification`, `specialization`, `subjects[]`
- `classAssignments[]` (drove the old Assignments / Timetable / Workload tabs)
- `status` with `on_leave` (backend has only `user.isActive` boolean)
- `dateOfBirth`, `gender`, `bloodGroup`, `emergencyContact`
- `address`, `city`, `state`, `pincode` (address exists on user, not teacher)

## Files touched in this integration

- New: [src/types/user.types.ts](../../src/types/user.types.ts)
- New: [src/services/modules/users.api.ts](../../src/services/modules/users.api.ts)
- Rewrote: [src/types/teacher.types.ts](../../src/types/teacher.types.ts)
- Rewrote: [src/services/modules/teacher.api.ts](../../src/services/modules/teacher.api.ts)
- Rewrote: [src/stores/teacher.store.ts](../../src/stores/teacher.store.ts)
- Rewrote: [src/modules/teachers/pages/TeacherListPage.tsx](../../src/modules/teachers/pages/TeacherListPage.tsx)
- Rewrote: [src/modules/teachers/pages/TeacherProfilePage.tsx](../../src/modules/teachers/pages/TeacherProfilePage.tsx)
