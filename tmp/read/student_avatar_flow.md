# Student Avatar / Image Flow

## Architecture (how avatars work end-to-end)
- S3 bucket is **private** (no public-read ACL — see `s3.util.ts:26`). The DB stores only the S3 **key** (e.g. `avatars/uuid.jpg`) in `Student.avatarUrl`.
- A raw key is NOT renderable in `<img src>`. You need a **signed URL** via `getSignedFileUrl(key)` (valid 1h). `getSignedFileUrl` is idempotent — passes through values that are already `http(s)://`.
- Two upload endpoints exist:
  - `POST /students/avatar/upload` (student-less) → returns `{ fileUrl (key), validUrl (signed), fileName }`. Used by the **create** flow: upload first, pass `fileUrl` as `avatarUrl` on create.
  - `POST /students/:id/avatar/upload` → uploads + sets `avatarUrl` on the student, returns `{ student, avatarUrl (key), validUrl }`. Used by the **profile page** camera button.

## The bug we fixed (2026-05-27)
"Image disappears after upload / never shows in list" — root cause was **backend GET endpoints returned the raw key**. The image only showed right after upload because the upload response carries a temporary `validUrl`; on refresh the GET returned the bare key → broken `<img>` → fell back to initials.

### Backend fix (`student.controller.ts`)
- Added module-level helper `signStudentAvatar(student)` — `toJSON()` the model, replace `avatarUrl` key with `getSignedFileUrl(key)`.
- Applied in `getAllStudents` (Promise.all over `result.data`), `getStudentById`, `createStudent`, `updateStudent`. Signing create/update responses means a newly created student's photo renders in the list immediately, no refetch.
- Contract: `avatarUrl` stays the **key** in the DB and in create/update **request** bodies; only **responses** carry the signed URL. Safe because `UpdateStudentDto` doesn't round-trip `avatarUrl` (avatars only change via the dedicated upload endpoints).

### Frontend fixes (AdminDesk)
- `students.store.ts`: added `uploadAvatarFile(file)` (wraps student-less `studentsApi.uploadAvatar`). Also: existing `uploadAvatar` now merges `avatarUrl: validUrl` into the cached student so list/profile show the new photo immediately.
- `StudentListPage.tsx`: list rows previously showed **initials only** (never referenced `avatarUrl`). Added `RowAvatar` component (renders `<img>`, falls back to initials on missing/broken URL) + `initialsOf` helper.
- `AddStudentModal` (in StudentListPage.tsx): added optional avatar picker. File chosen locally (object URL preview), uploaded on **submit** (so cancel uploads nothing), then key passed as `avatarUrl` in `CreateStudentDto`. Upload failure aborts before creating the student.

## Deferred
- **Admission flow** (`NewAdmissionPage.tsx`) has no avatar field. It currently runs on the **mock/demo store** (`demoStudentsApi.createFromApplication`), NOT the real student backend — so wiring a real avatar there is a separate, larger task gated on admissions moving to the real backend.

## Gotchas
- `EditStudentModal` has NO avatar field (and `UpdateStudentDto` deliberately omits `avatarUrl`). Avatar editing happens via the profile-page camera button, not the edit modal.
- Backend `tsc --noEmit` reports many pre-existing errors in `src/tests/**` (missing `@types/jest`) — unrelated noise; filter for the file you touched.
