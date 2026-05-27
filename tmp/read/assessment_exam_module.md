# Assessment / Exam module — learnings

Two repos involved:
- Frontend: `/Users/muskan/Documents/internal/AdminDesk` (AdminDesk)
- Backend: `/Users/muskan/Documents/internal/school-management-backend` (nodemon `src/index.ts`, port 3000)

In this codebase **"Assessments" ARE "Exams"**. URL path stays `/assessments`. Bucket is **private** — image/file reads need a signed URL.

## Frontend crash + empty-field fixes (AssessmentListPage.tsx)
- Crash `Cannot read properties of undefined (reading 'trim')` was in the edit modal's `canSubmit` (`form.type.trim()`). Root cause: clicking a row → `setEditing(a)` → effect maps `initial.type` into form; backend has no `type` so it was `undefined`.
- **Backend has NO `type` field** — absent from POST body in API_CURL.md AND the live GET response. The frontend had invented `type` as a required field; whatever the user typed was silently dropped. → Removed `type` everywhere (FormState, emptyForm, search filter, list Type column, create/edit payloads, canSubmit, form input, marks dropdown label, `Assessment`/`CreateAssessmentDto` types).
- **Dates came back as full ISO datetime** (`2026-03-22T00:00:00.000Z`) but `<input type="date">` only renders `YYYY-MM-DD` → fields showed blank. Fix: `initial.startDate?.slice(0, 10) ?? ''` when loading the edit form.

## Backend exam image upload (added)
- Model `Assessment` already had `imageUrl` column; validator `assessmentSchema` already allowed `imageUrl: Joi.string().optional()`. What was missing was a file-upload endpoint.
- Pattern to mirror for "single image on a record": **student avatar** (`StudentController.uploadAvatarOnly` / `uploadAvatar`). Homework attachments are the multi-file pattern.
- `validate` middleware uses `stripUnknown: true` on body — unknown keys are dropped, so only schema-listed fields persist.
- Added to `assessment.controller.ts`:
  - `uploadImageOnly` → S3 folder `assessment-images`, returns `{ fileUrl, validUrl, fileName }` (create-before-save flow).
  - `uploadImage` → fetch by id+schoolId, upload, `item.update({ imageUrl: key })`, returns `{ assessment, imageUrl, validUrl }`.
  - `withSignedImage` private helper → on getAll/getById, keeps `imageUrl` (S3 key) and adds signed `validImageUrl` (try/catch so a bad key never breaks the response). Mirrors homework's `fileUrl`+`validUrl` convention.
- Routes in `school.scoped.routes.ts` (after `/assessments/:id` block, guarded by `MANAGE_ASSESSMENTS`, `upload.single('file')`):
  - `POST /assessments/upload`
  - `POST /assessments/:id/image/upload`
- `upload` multer instance is defined at top of the routes file (memory storage, 20MB, allows images/pdf/doc). Reused, not redefined.

## Verify recipe (backend on :3000)
- Login: `POST /api/auth/login` `{"email":"superadmin@qbitlog.com","password":"Superadmin@123"}` → `.data.token`.
- School id: `GET /api/schools` → `.data[0].id`.
- Upload without file returns 400 "No file uploaded" before touching S3 — quick route/auth check.
- Full upload verified e2e: key persists, signed `validImageUrl` regenerated on re-GET. AWS creds ARE configured (bucket `qbitlog-school-management-app`, us-east-1).

## NOTE / cleanup
- Verification wrote a 1×1 test PNG onto the only seed exam record ("3rd Class MATH"). Not reset because PUT/`assessmentSchema` `imageUrl: Joi.string()` rejects null/empty, so can't easily clear via API. Harmless dev data.

## Frontend image upload — WIRED (done)
- `assessment.types.ts`: `Assessment` gained `imageUrl?: string|null` + `validImageUrl?: string|null`; `CreateAssessmentDto` gained `imageUrl?: string`.
- `assessments.api.ts`: added `uploadImage(schoolId, file)` → `POST /assessments/upload` (FormData, `api.upload` helper). Mirrors `studentsApi.uploadAvatar`.
- `assessment.store.ts`: added `uploadImage(file)` action (resolveSchoolId + api call), returns `{ fileUrl, validUrl }`.
- `AssessmentListPage.tsx`:
  - FormState/emptyForm gained `imageUrl`.
  - Edit mapping sets `imageUrl: initial.imageUrl ?? ''` and seeds preview from `initial.validImageUrl`.
  - Picker block in modal (hidden file input in a `<label>`, 16x16 preview thumb, Replace/Upload + Remove). `handleImageChange` uploads via store → stores S3 key in `form.imageUrl`, preview = signed validUrl.
  - Both create & update payloads send `imageUrl: form.imageUrl || undefined` (ride-along; no need for the `/:id/image/upload` endpoint from the form).
  - List row: thumbnail inside the Name cell (flex row, `a.validImageUrl` or `ImageIcon` placeholder) — grid columns unchanged.
- Chosen approach: single upload path = upload-only endpoint + key rides along in normal create/update body. Works for both Add and Edit. Orphaned S3 object if you upload then cancel (harmless, same as student create flow).
- Verified: frontend `tsc --noEmit` EXIT=0; vite transforms module OK. Backend endpoints verified e2e earlier.
- Frontend api-client has `api.upload(url, FormData)` that omits Content-Type (browser sets multipart boundary) — use it for all multipart.
