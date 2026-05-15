# Parents API Integration — Gap Analysis

Source spec: see [userDoc](userDoc) (parents endpoints, lines 357–499; users endpoints, lines 1–204).
Frontend module: [src/modules/parents/](src/modules/parents/) — list page, profile page, Add Parent modal.

The Parent CRUD layer is wired against the real backend through a two-step user→parent flow (the FK constraint at userDoc:423 forces this order). What's missing is **edit UI, child linking, server-side search, and orphan-user cleanup** — none of which block the current Add/View/Delete experience.

---

## What already exists (integrated)

| Layer | File | Status |
|---|---|---|
| Parent types | [src/types/parent.types.ts](src/types/parent.types.ts) | ✅ `Parent`, `ParentUser`, `CreateParentDto`, `UpdateParentDto` |
| Parents API | [src/services/modules/parents.api.ts](src/services/modules/parents.api.ts) | ✅ `list`, `getById`, `create`, `update`, `remove` — real backend |
| Users API (reused) | [src/services/modules/users.api.ts](src/services/modules/users.api.ts) | ✅ `list`, `getById`, `create`, `update`, `remove` — real backend |
| Parents store | [src/stores/parent.store.ts](src/stores/parent.store.ts) | ✅ `fetchParents`, `getParent`, `createParent`, `updateParent`, `deleteParent`; `createParent` orchestrates user→parent |
| Parent list + Add modal | [src/modules/parents/pages/ParentListPage.tsx](src/modules/parents/pages/ParentListPage.tsx) | ✅ List, search, delete, Add Parent (User Account + Annual Income) |
| Parent profile | [src/modules/parents/pages/ParentProfilePage.tsx](src/modules/parents/pages/ParentProfilePage.tsx) | ✅ Account + Parent Details cards |
| Router / sidebar / mock perms | [router.tsx:96-98](src/app/router.tsx#L96-L98), [Sidebar.tsx:28](src/components/layout/Sidebar/Sidebar.tsx#L28), [mock-users.ts:19-20](src/mocks/mock-users.ts#L19-L20) | ✅ |

### Available backend endpoints (5 parent + 5 user reused)

| Method | Path | Purpose |
|---|---|---|
| `GET`    | `/schools/:schoolId/parents`              | List (paginated) |
| `GET`    | `/schools/:schoolId/parents/:id`          | Get one |
| `POST`   | `/schools/:schoolId/parents`              | Create (requires existing `userId`) |
| `PUT`    | `/schools/:schoolId/parents/:id`          | Update (`annualIncome`) |
| `DELETE` | `/schools/:schoolId/parents/:id`          | Delete |
| `POST`   | `/schools/:schoolId/users`                | **Prerequisite** for create-parent |
| `PUT`    | `/schools/:schoolId/users/:id`            | **Prerequisite** for full edit-parent |
| `DELETE` | `/schools/:schoolId/users/:id`            | Needed if we ever cascade on parent delete |

---

## What is missing

### 1. Edit Parent flow (frontend only — backend already supports)

The store exposes `updateParent`, but no UI surfaces it. A full edit needs to update **both** the user (name, email, phone, whatsapp, address) and the parent (`annualIncome`) — two PUT calls, mirroring the create orchestration.

| Layer | Status |
|---|---|
| `parentsApi.update` | ✅ wired |
| `usersApi.update` | ✅ wired |
| `useParentStore.updateParent` | ✅ exposed, unused |
| Edit Parent modal | ❌ missing |
| "Edit" entry point on profile / list row | ❌ missing |

UI reference: [ParentProfilePage.tsx](src/modules/parents/pages/ParentProfilePage.tsx) currently has no edit affordance.

This is **pure frontend work** — ~60 lines, mirrors `AddParentModal` in [ParentListPage.tsx:223-318](src/modules/parents/pages/ParentListPage.tsx#L223-L318).

---

### 2. Parent ↔ Student (children) linking — backend gap

A parent's most useful page-level info is "which kids do they have at this school," and it cannot be built today.

- userDoc exposes no endpoint for `parent → students` or `student → parents`.
- Today, students carry stringly-typed `parentName` / `parentPhone` ([src/types/student.types.ts:33](src/types/student.types.ts#L33)), not parent IDs — so we cannot resolve the relation client-side either.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/schools/:schoolId/parents/:id/children` | List students linked to this parent |
| `POST` | `/schools/:schoolId/parents/:id/children` | Link a student (`{ studentId, relation }`) |
| `DELETE` | `/schools/:schoolId/parents/:id/children/:studentId` | Unlink |

Or: add `parentIds: string[]` to the Student schema and resolve from there.

**Biggest functional gap.** Until this lands, the profile page has no "Children" card and the admissions flow can't promote captured guardians into real Parent rows.

---

### 3. Cascading user cleanup on delete (backend or frontend orchestration)

`useParentStore.deleteParent` removes only the parent row. The backing user is left orphaned (active login, role, permissions intact).

Two ways to fix:

| Option | Where | Trade-off |
|---|---|---|
| Backend cascades user delete | `DELETE /parents/:id` removes user too | Atomic, single round-trip; matches FK semantics |
| Frontend chains `usersApi.remove` | `parentsApi.remove` → `usersApi.remove` | No backend change needed; partial failure leaves user dangling |

Symmetric to the **no-rollback decision on create** (a failed `parentsApi.create` after a successful `usersApi.create` already leaves an orphan). Worth fixing both ends together rather than piecemeal.

---

### 4. Server-side search & filter on parents list

`GET /schools/:schoolId/parents` currently only accepts `page` + `limit`. List page filters client-side over the loaded page ([ParentListPage.tsx:46-54](src/modules/parents/pages/ParentListPage.tsx#L46-L54)) — fine for a few dozen rows, breaks at scale.

| Method | Path | Missing param | Purpose |
|---|---|---|---|
| `GET` | `/schools/:schoolId/parents` | `q` / `search` | Match name, email, phone |
| `GET` | `/schools/:schoolId/parents` | `incomeMin`, `incomeMax` | Optional, for income-banded reports |

---

### 5. Reuse existing user when adding a sibling's parent — backend gap

If a parent already has one child at the school and is registered as a Parent row, adding a second child today re-runs `usersApi.create` with the **same email** — which the backend will reject as duplicate. There's no "find user by email" endpoint visible in userDoc.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/schools/:schoolId/users?email=...` | Lookup before insert |
| `POST` | `/schools/:schoolId/parents` (existing) | Pass `userId` of looked-up user |

Without this, we either accept "one parent row per email" (current behavior) or build the lookup-before-create UX once the endpoint lands.

---

### 6. Parent portal lifecycle endpoints (future, not blocking)

When a parent portal goes live, we'll need:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/schools/:schoolId/users/:id/resend-invite` | Email login credentials |
| `POST` | `/schools/:schoolId/users/:id/reset-password` | Force-reset for a parent |

Not in userDoc. Not blocking. Flagged here so the API surface evolves in one place.

---

## Summary

| Area | Available | Missing |
|---|---|---|
| Parent CRUD | 5 | 0 |
| User CRUD (prerequisite) | 5 | 0 |
| Edit UI (frontend) | 0 | 1 modal |
| Children linking | 0 | 3 endpoints |
| Cascading delete | 0 | 1 (decision + impl) |
| Server-side search | 0 | 1 schema expansion |
| User-by-email lookup | 0 | 1 endpoint (or query param) |
| Portal lifecycle | 0 | 2 endpoints |
| **Total endpoints** | **10** | **6** |

---

## Frontend behavior today

| Action | Calls real API? | Notes |
|---|---|---|
| List parents | ✅ | `GET /schools/:id/parents` |
| Get parent profile | ✅ | `GET /schools/:id/parents/:id` |
| Add parent | ✅ | `POST /users` then `POST /parents`; no rollback if step 2 fails |
| Edit parent | ❌ Not built | Store method exists; no UI |
| Delete parent | ⚠️ Partial | Removes parent row; **user row is orphaned** |
| Search parents | ⚠️ Client-only | Filters loaded page; no `q` param |
| View parent's children | ❌ Not possible | No backend relation |
| Add second child for same parent | ⚠️ Fails | Duplicate-email error from `usersApi.create` |

---

## Open questions for backend team

1. Should `DELETE /parents/:id` cascade the user delete, or do we orchestrate that on the frontend? (Same question pending for teachers.)
2. What's the canonical model for parent↔student relations — a join endpoint, a `parentIds[]` on Student, or a `studentIds[]` on Parent? Each affects the admissions flow's guardian capture differently.
3. Will `GET /parents` gain server-side search, or do we expect to keep filtering client-side? At what row count should we revisit?
4. For sibling onboarding: do you plan a user-lookup endpoint, or should the parent flow accept a pre-existing `userId` chosen via a different surface?
