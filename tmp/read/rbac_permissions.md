# RBAC / Permissions

## The vocabulary mismatch (root cause of "Parent only sees Dashboard")
- Backend is the source of truth. Permission strings are UPPER_SNAKE, defined in
  `school-management-backend/src/constants/permissions.ts` (`PERMISSIONS` enum) and
  embedded in the JWT at login (`auth.service.ts` -> `generateTokens`, fields
  `roleName` + `permissions[]`). Middleware `requirePermissions([...])` checks ALL listed.
- Frontend USED to check dotted-lowercase (`students.read`, `homework.read`, ...) — matched
  nothing the real API returns, so real Parent/Teacher logins showed only Dashboard.
  Mock admin accounts also used dotted strings, which hid the bug in mock mode.

## Frontend fix (done — feat/api-curl-new-integration)
- `src/constants/permissions.ts` — mirrors backend enum (single source of truth on FE).
- `usePermission(string | string[])` — array means "any of".
- Sidebar.tsx / BottomNav.tsx nav items re-keyed to backend names.
- `src/guards/RequirePermission.tsx` + router.tsx wraps each route group — blocks URL access,
  not just hides the tab. Super Admin bypasses (holds all perms). Dashboard always open.
- mock-users.ts now uses `Object.values(PERMISSIONS)`.
- Settings gated on `READ_ROLE` (only Admin/SuperAdmin; Accountant/Manager also lose it — acceptable).
- Reports left open (no backend permission exists for it).

## Key model facts
- One user = one role. `User.roleId` is a single FK (`@BelongsTo Role`), no join table.
  email + phoneNumber are unique. Dual teacher+parent on one account would need a schema change.
- Permission semantics are SCOPED by role: a Parent's READ_STUDENT = "my children only",
  READ_TEACHER = "my children's teachers". Admin's same perm = school-wide.

## Backend Parent scoping (DONE)
- Linkage: User(login, req.user.id) -> Parent.userId -> Parent.id == Student.parentId.
- Routes DO apply requirePermissions (school.scoped.routes.ts:324 READ_STUDENT etc.). The gap
  was only data filtering, not route access.
- Fix in `student.service.ts`: added `resolveParentScope(schoolId, authUser)` helper.
  - getAllStudents/getStudentById now take optional `authUser` (AuthenticatedUser).
  - role===ROLES.PARENT -> force where.parentId = their Parent.id (ignores client parentId);
    no Parent record -> empty list / "Student not found".
  - non-parent roles -> undefined scope -> unchanged school-wide behaviour.
- `student.controller.ts` passes `(req as AuthRequest).user` into both reads.
- updateStudent/deleteStudent left unscoped (need UPDATE/DELETE perms a Parent lacks).

## Parent: hide Guardians + scope Teachers (DONE)
- Hide Guardians: removed READ_PARENT from DEFAULT_ROLE_PERMISSIONS[PARENT]
  (backend constants/permissions.ts) AND from frontend ensureParentRole (settings.store.ts).
  Tab is permission-gated (Sidebar READ_PARENT) so it auto-hides; route guard + API 403 too.
- Scope Teachers: teacher.service.ts `resolveParentTeacherIds(schoolId, authUser)` walks
  Parent → Student(parentId) → StudentEnrollment(classSectionId) → ClassTeacher(teacherId).
  getAll/getById take optional authUser; Parent sees only their child's CLASS teachers
  (ClassTeacher only — not TeacherSubject/subject teachers, by decision). teacher.controller
  passes (req as AuthRequest).user.
- Parent role kept READ_TEACHER (needed for the scoped view).

## IMPORTANT: existing DB roles not auto-updated
- DEFAULT_ROLE_PERMISSIONS is the seed/definition. Changing it does NOT rewrite Parent/Teacher
  role rows already in the DB. Existing roles must be re-created or edited (Settings → Roles)
  to pick up the READ_PARENT removal. Also note: backend only seeds Super Admin + Admin;
  Parent/Teacher roles are created at runtime (frontend ensureParentRole/ensureTeacherRole).

## Parent scoping: attendance / homework / marks + Results view (DONE)
- Shared helper backend/src/utils/parentScope.ts `getParentChildEnrollmentScope(schoolId, authUser)`
  → { enrollmentIds, classSectionIds } (undefined = not a parent; empty = no children).
  Walk: Parent(userId) → Student(parentId) → StudentEnrollment(id, classSectionId).
- attendance.service: getAll/getById scope studentEnrollmentId IN enrollmentIds.
- homework.service: getAll/getById scope classSectionId IN classSectionIds.
- student-mark.service: getAll/getById scope studentEnrollmentId IN enrollmentIds.
- All three controllers pass (req as AuthRequest).user. (student/teacher services keep their
  own inline resolvers from earlier — not refactored onto the shared helper, to limit churn.)
- Exams problem: GET /assessments requires MANAGE_ASSESSMENTS (parent lacks) → the old
  any-of [MANAGE_ASSESSMENTS, READ_MARKS] Exams tab 403'd for parents.
  Fix = chose option (b): Exams tab now gates MANAGE_ASSESSMENTS only (staff); NEW Results
  view added.
- Results (frontend): src/modules/results/pages/ResultsPage.tsx — read-only marks table using
  existing useMarksStore/marksApi (GET /student-marks). Backend scoping → parent sees only
  their child's marks.
- Results is now PARENT-ONLY (role-gated, not permission-gated). Reason: no permission is
  unique to Parent, and staff have Exams→Enter Marks already.
  - Added frontend ROLES mirror in src/constants/permissions.ts.
  - Sidebar + BottomNav NavItem gained optional `roles?: string[]`; gating checks
    user.roleName ∈ item.roles (handled BEFORE the super-admin branch). Results item uses
    roles:[ROLES.PARENT]. Shown in BOTH desktop Sidebar and mobile BottomNav.
  - Route /results uses <RoleGuard roles={[ROLES.PARENT]} /> (was RequirePermission READ_MARKS).
- Results page enriched: grouped by exam (assessment). Backend student-mark.service getAll/getById
  now include [Subject, Assessment] (no new perm — still READ_MARKS), so the GET embeds the
  assessment. Added FE type MarkAssessment + StudentMark.assessment. Parents can't hit /assessments
  (MANAGE_ASSESSMENTS), so embedding via the marks endpoint is the only way to get exam name/date/maxMarks.
  ResultsPage renders one card per exam (name + date range + Max) with per-subject rows (marks/max, grade, remarks).

## Parent fees view (read-only child fees) — DONE (Parent Tests #5)
- Problem: child fees live in the LEDGER (LedgerEntry: studentEnrollmentId, entryType Debit/Credit,
  amount, runningBalance, category). GET /ledgers required MANAGE_LEDGER (write perm) — no read-only
  ledger perm existed, so parents had zero fee access.
- Backend: added PERMISSIONS.READ_LEDGER. Granted to Parent + all staff who had MANAGE_LEDGER
  (SuperAdmin/Admin/Accountant/Manager). GET /ledgers + GET /ledger/:id guards changed
  MANAGE_LEDGER → READ_LEDGER; writes stay MANAGE_LEDGER. (No any-of middleware needed — read is
  its own perm now.) ledger-entry.service getAll/getById scope to parent's enrollmentIds via
  getParentChildEnrollmentScope; ledger.controller passes req.user. ensureParentRole +READ_LEDGER.
- Frontend: new PARENT-ONLY page src/modules/my-fees/pages/MyFeesPage.tsx at /my-fees
  (RoleGuard + nav roles:[ROLES.PARENT], desktop + mobile). Calls ledgerApi.list DIRECTLY (not
  ledger.store — that store enriches via enrollment/academic stores a parent can't fetch).
  Shows Billed/Paid/Balance summary + statement (date, category·remarks, type, amount, runningBalance).
  Read-only, no pay action. Admin Ledger tab (/ledger, MANAGE_LEDGER) untouched.

## STILL DEFERRED
- Teacher-role scoping ("teacher sees only their assigned students"): separate from parent work.
- assessment.service itself is NOT parent-scoped (parents can't reach it anyway: MANAGE_ASSESSMENTS).
## Parent dashboard (Parent Tests #13) — DONE
- DashboardPage is now a role dispatcher (someone also added a TeacherDashboard branch):
  Parent → <ParentDashboard/>, Teacher → <TeacherDashboard/>, else <AdminDashboard/> (renamed
  from the old DashboardPage body). Dispatcher calls one hook then branches — rules-of-hooks safe.
- src/modules/dashboard/components/ParentDashboard.tsx: fetches ledger + attendance + homework
  via Promise.allSettled (all parent-scoped on backend), shows 4 summary cards
  (Fees balance, Attendance %, Homework count, Results link → navigate) + a Recent Homework list.
  Calls the *apis directly* (not stores) to avoid parent-forbidden enrollment/academic fetches.
  Why AdminDashboard isn't rendered for parents: it fetches students/payments/applications/enquiries,
  most of which 403 for a parent.

## STILL DEFERRED
- Teacher-role DATA scoping ("teacher sees only their assigned students"): the TeacherDashboard UI
  exists, but verify the underlying student/attendance reads are actually teacher-scoped on backend.

## Mobile logout (done — feat/api-curl-new-integration, 2026-06-24)
- Bug "Teacher Tests" line 16 "No sign out option" was a MOBILE discoverability issue,
  not a true absence. TopBar.tsx:112 logout button renders on mobile too, but it's an
  unlabeled corner icon next to avatar/theme toggle — QA missed it.
- Fix: BottomNav.tsx now appends an always-visible labeled "Logout" <button> (LogOut icon
  + 0.625rem label, aria-label="Sign out") calling auth store `logout`. Rendered as a
  <button>, NOT a NavItem/NavLink — it's an action, not a route, and has no permission gate
  (every authenticated user can sign out). No active-state styling since it doesn't navigate.
- Tradeoff noted: bar uses justify-around + flex-1; super-admin-in-school can reach ~6 nav
  items + Logout = 7, tight on ~360px but fits. Didn't build a "More" overflow sheet.

## Teacher Tests bug file — status map (as of working-tree RBAC refactor)
- Lines 6-12 (FAIL RBAC, admin pages accessible): FIXED by RequirePermission on every route
  group + permission-driven Sidebar/BottomNav. Correctness now depends on the REAL teacher
  account's backend permissions — re-test against live API, old report ran on broken `*.read` code.
- Line 3 (sidebar nearly empty): same root cause as the vocabulary mismatch above; fixed.
- Line 13 (no Assign-homework button): NOT done — needs MANAGE_HOMEWORK-gated action on homework page.
- Line 14 (no Mark-attendance button): likely BY DESIGN — AdminDesk attendance is a viewer;
  teachers mark via the normal product flow. Confirm before "fixing".
- Line 15 (generic dashboard for teacher): NOT done — product decision, DashboardPage is shared.
- No teacher/parent MOCK account: mocks trimmed to super@admin.com + admin@school.com only;
  teacher testing relies on real backend account (see bugs/Test Accounts).

## Action-level gating — homework write actions (done — 2026-06-24, line 13)
- Discovery: the homework "Add Homework" button ALREADY existed (HomeworkListPage.tsx),
  plus per-row Edit/Delete. The Teacher Tests "no assign button" was the OLD broken-RBAC
  state where teacher got bounced off /homework (dotted `homework.read` gate). Route refactor
  already restored reachability; the button was never truly missing.
- Real gap: actions were UNGATED relative to MANAGE_HOMEWORK — any READ_HOMEWORK user saw
  Add/Edit/Delete. Fix gates them on `usePermission(PERMISSIONS.MANAGE_HOMEWORK)` → `canManage`.
- FIRST action-level gating in a module page. Before this, usePermission lived only in
  Sidebar/BottomNav; module pages relied on the route guard alone. Pattern to reuse elsewhere:
  page reachable via READ_*, write buttons wrapped in `{canManage && ...}` via MANAGE_*.
- Homework DETAIL page has no edit/delete (only back-nav), so list page was the whole scope.
- Caveat: visible only if backend issues MANAGE_HOMEWORK to the teacher role (token-dependent).

## Teacher dashboard — Phase 1 (done — 2026-06-24, frontend-only, line 15)
- DashboardPage.tsx split into a role switch: roleName === 'Teacher' (and not super admin)
  → <TeacherDashboard/>, else <AdminDashboard/> (the old content, renamed, unchanged).
  Bonus: teachers no longer fire the 5 admin/finance API calls (students/payment/ledger/
  applications/enquiries) they're not authorized for.
- New TeacherDashboard.tsx: "Welcome, {firstName}" + "My Homework" card.
- SELF-SCOPING (no backend change): homework list isn't teacher-filtered server-side, so
  the component resolves the logged-in user's Teacher record via teacherApi.list (default
  Teacher role has READ_TEACHER), matches by userId, then filters homework by teacherId
  client-side. Pulls limit 500 teachers / 100 homework. When backend teacher-scoping lands,
  the client filter becomes a harmless no-op.
- noTeacherRecord state shows a hint when the user has no linked Teacher row.
- tsc --noEmit: clean (exit 0).

### Backend findings that unblock the proper fix (Phase 2 later)
- JWT/login payload has NO teacherId (auth.service.ts generateTokens: id, roleName,
  permissions, schoolId, roleId only). No /teachers/me endpoint.
- Homework getAll DOES scope for PARENT (getParentChildEnrollmentScope) but NOT teacher —
  teacher currently gets whole-school homework. Homework model has teacherId column, so the
  proper backend fix is a getTeacherOwnScope util (Teacher.findOne({userId}) → where.teacherId),
  mirroring parentScope.ts, applied in homework.service getAll/getById.
- DEFAULT_ROLE_PERMISSIONS[ROLES.TEACHER] (backend constants/permissions.ts) includes
  READ_TEACHER, READ/MARK_ATTENDANCE, READ/MANAGE_HOMEWORK, MANAGE_ASSESSMENTS, READ/MANAGE_MARKS.
  So Phase 2 (attendance/exams widgets) is viable. BUT these are seeder DEFAULTS; Teacher/Parent
  roles are created at runtime, so live DB perms may differ — confirm with a real token.

## Backend teacher-scoping + Phase 2 widgets (done — 2026-06-24)
- NEW backend src/utils/teacherScope.ts: getTeacherScope(schoolId, authUser) mirrors
  parentScope. undefined for non-Teacher; else Teacher.findOne({userId}) → ClassTeacher.findAll
  ({teacherId}) → { teacherId, classSectionIds }. teacherId:null + empty = unlinked → see nothing.
- Applied scoping (each after the existing parent-scope block):
  - homework.service getAll + getById → where.teacherId = scope.teacherId.
  - attendance.service getAll → where.markedById = scope.teacherId ("attendance I marked").
  - assessment.service getAll → where.classSectionId IN scope.classSectionIds. Service had NO
    authUser param before → added it + assessment.controller getAll now passes (req as AuthRequest).user.
- SIDE EFFECT (intended): teachers viewing /homework, /attendance, /assessments LIST pages now
  see only their own slice. Admins/parents unchanged.
- Edge notes: attendance scoped by markedById (who recorded it; marking happens in the other app).
  Assessments with null classSectionId (school-wide) won't show for teachers.
- Both repos: tsc --noEmit clean (exit 0).

### Frontend TeacherDashboard rebuilt (Phase 2)
- Dropped Phase 1 client-side teacherId filtering (backend scopes now). Kept ONE teacherApi.list
  lookup purely to detect noTeacherRecord (unlinked → hint, since all scoped lists would be empty).
- 3 widgets, all backend-scoped via Promise.allSettled: My Homework (list), Attendance
  (present % + records-marked count), Upcoming Exams (assessments sorted by startDate asc).
- DashboardPage role switch now: Parent→ParentDashboard, Teacher→TeacherDashboard, else AdminDashboard.

### STILL OPEN / verify
- Not run in browser. Needs a real/mock teacher login; local mocks still only super@/admin@.
- Live Teacher role perms are DB config (defaults strongly suggest READ_TEACHER/READ_HOMEWORK/
  READ_ATTENDANCE/MANAGE_ASSESSMENTS present) — confirm with a real token.

## Parent "My Child" hub (option (a) — purpose-built screens) — DONE
- Gap fixed: parents were landing on the shared ADMIN list pages (Students/Teachers/Attendance/
  Homework) which fire admin-only fetches (academic/enrollment → 403) and show admin buttons
  (e.g. TeacherListPage "Add Teacher" was ungated). Route guards let parents in (they hold the
  read perms); we never gated in-page actions.
- Nav: added `hideForRoles?: string[]` to NavItem in BOTH Sidebar + BottomNav (checked FIRST in
  gating). Set hideForRoles:[ROLES.PARENT] on Students/Teachers/Student Attendance/Homework.
  Added "My Child" item roles:[ROLES.PARENT] → /my-child (UserRound icon). Parent nav is now:
  Dashboard · My Child · Results · Fees.
- Backend enrichment: student.service.getAllStudents adds PARENT_CHILD_INCLUDE
  (StudentEnrollment → ClassSection → ClassMaster) ONLY on the parent path (parentScope !==
  undefined), + distinct:true. Lets the hub get each child's enrollmentId/classSectionId/class label
  without hitting the admin enrollment endpoint. FE Student type gained optional enrollments?: ChildEnrollment[].
- Frontend: src/modules/my-child/pages/MyChildPage.tsx, route /my-child (RoleGuard Parent).
  Fetches students(enriched)+attendance+homework via Promise.allSettled (all parent-scoped),
  child selector when >1 child, per-child filtering CLIENT-SIDE (attendance by enrollmentId,
  homework by classSectionId). Sections: overview card, stat tiles (Attendance%/Homework/Results/Fees),
  recent attendance + recent homework. No admin chrome, no 403 fetches.
- Fixed ParentDashboard cards/links that pointed at admin /attendance & /homework → now /my-child.

## Parent URL access to admin pages — CLOSED
- RequirePermission gained optional `blockRoles?: string[]` → redirects those roles to /dashboard
  even if they hold the permission. Applied blockRoles:[ROLES.PARENT] to /students,/teachers,
  /attendance,/homework route groups. Parent typing those URLs now redirects.
- IMPORTANT: this guards only the PAGE ROUTES, not the APIs. The My Child hub still calls
  studentsApi/attendanceApi/homeworkApi directly (backend-scoped) — unaffected.

## STILL OPEN (parent) — minor
- Multi-child: hub supports it (selector + per-child filter). Results & Fees pages still show ALL
  children merged (not yet child-filtered) — acceptable for now.

## Teacher route-blocking decision (done — 2026-06-24)
- Root cause of "/students,/teachers,/parents still accessible": the live Teacher role HOLDS
  READ_STUDENT/READ_TEACHER/READ_PARENT (DB row, not code — DEFAULT_ROLE_PERMISSIONS is only
  wired to seed SuperAdmin+Admin; Teacher/Parent roles are created at runtime via role.service).
  So permission-driven guards correctly let teachers in.
- Product decision (user): teachers KEEP Students (can read their students), BLOCK Parents + Teachers.
- Implemented in CODE (no DB change), reusing existing role block-list props:
  - router.tsx: RequirePermission blockRoles — /parents → [ROLES.TEACHER]; /teachers → [ROLES.PARENT, ROLES.TEACHER].
  - Sidebar.tsx hideForRoles — Guardians → [ROLES.TEACHER]; Teachers → [ROLES.PARENT, ROLES.TEACHER].
  - (Guardians/Teachers not in BottomNav, so no BottomNav change.)
- NOTE prop-name inconsistency (both pre-existing): RequirePermission uses `blockRoles`, Sidebar nav uses `hideForRoles`. Same concept.
- Students page still shows ALL students (not scoped to "own") — left as-is per user; would need
  backend student-scoping (like teacherScope) to make it "own students only".
- tsc clean (exit 0). Still not browser-verified.

## Student scoping for teachers (done — 2026-06-24)
- Decision: teachers KEEP the /students page but see ONLY their own students (those enrolled
  in the class sections they teach), not the whole school.
- student.service.ts (backend), mirrors parent scoping, after the parent-scope block:
  - getAllStudents: getTeacherScope → if classSectionIds empty → empty; else StudentEnrollment
    .findAll({ classSectionId IN classSectionIds }) → studentIds → where.id IN studentIds.
  - getStudentById: teacher can only open a student with an enrollment in their classSectionIds,
    else "Student not found".
- Students have NO direct classSectionId — linked via StudentEnrollment(studentId, classSectionId).
- Controller already threads (req as AuthRequest).user to both methods.
- tsc clean (exit 0). Not browser-verified.
- Caveat: teacher with no ClassTeacher rows → empty student list.

## Mark-attendance correction (done — 2026-06-24)
- CORRECTION to earlier notes: AttendanceListPage is NOT a viewer. It's a full marking tool
  (date + section → roster from enrollment store → P/A/L/Lv pills + remarks → "Save attendance"
  → markAttendance POST / updateAttendance PUT). Teachers have MARK_ATTENDANCE + READ_STUDENT
  (roster loads via /student-enrollments which needs READ_STUDENT). So marking already works for
  teachers once RBAC let them reach the page. The "no mark button" bug was old-RBAC / the fact
  that marking UI only appears after a section is picked.
- BUG I had introduced: earlier attendance teacher-scoping used where.markedById = teacherScope.teacherId
  (Teacher.id). But the frontend writes markedById = user.id (the LOGIN/User id, via
  useAuthStore user.id), NOT the Teacher id. Mismatch → a teacher would see ZERO attendance
  (empty marking pre-fill + empty dashboard box). Also scoping by marker breaks the marking page
  (won't show admin/co-teacher marks → duplicate-marked errors on save).
- FIX: attendance.service.getAll teacher scope now filters by the teacher's CLASS SECTIONS:
  StudentEnrollment.findAll({classSectionId IN teacherScope.classSectionIds}) → enrollmentIds →
  where.studentEnrollmentId IN enrollmentIds. (Same shape as parent enrollment scoping.)
- TeacherDashboard attendance box label changed "Records you marked" → "Class records".
- NOT fixed (left as-is, pre-existing): markedById stores user.id though the model is @BelongsTo
  Teacher; attendance create doesn't resolve/validate the marker or that the section is the teacher's.
  attendance.getById has no teacher scope (parity gap, page doesn't use it). Flag if hardening needed.
- Both repos tsc clean (exit 0). Not browser-verified.
