# School Management API — New Endpoints (curl Reference)

Newly introduced endpoints that are **not yet** in [API_CURL.md](API_CURL.md). Same conventions apply (base URL `http://localhost:3000/api`, JWT in `Authorization: Bearer $TOKEN`, `schoolId` auto-injected from the URL into the body, all IDs UUID v4).

These were added in the latest changes:
- **Teacher Attendance** module (full CRUD + bulk).
- **Student avatar** upload (and a new `avatarUrl` field on the student model).
- **Homework attachment** upload.
- **Academic Rollover** clone endpoints (copy sections / timetable from one academic year into another).

---

## Teacher Attendance

Per-day attendance entries for a teacher (the staff equivalent of student `/attendance`).

- **Status values**: `Present`, `Absent`, `Late`, `Excused`, `HalfDay`.
- **Bulk create**: `POST` accepts either a single object **or an array** of objects (one row per teacher/day).

### GET `/api/schools/$SCHOOL_ID/teacher-attendance`
List teacher-attendance records (supports query-param filters).
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-attendance" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/teacher-attendance`
Mark attendance for a teacher on a given date.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherId": "<teacher-uuid>",
    "date": "2026-05-22",
    "status": "Present",
    "remarks": "On time",
    "markedById": "<user-uuid>"
  }'
```

#### Bulk variant (array body)
Mark attendance for many teachers in one request.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '[
    { "teacherId": "<teacher-uuid-1>", "date": "2026-05-22", "status": "Present" },
    { "teacherId": "<teacher-uuid-2>", "date": "2026-05-22", "status": "HalfDay", "remarks": "Left early" }
  ]'
```

### GET `/api/schools/$SCHOOL_ID/teacher-attendance/$ID`
Fetch a single teacher-attendance record.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-attendance/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/teacher-attendance/$ID`
Update a teacher-attendance record (e.g. correct a status).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-attendance/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Excused",
    "remarks": "Approved leave"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/teacher-attendance/$ID`
Delete a teacher-attendance record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-attendance/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Student Avatars

The student model now has an `avatarUrl` field. You can set it directly on create/update, or use the upload endpoints below (multipart `file`, stored under the S3 `avatars/` prefix). Both upload responses return the stored `fileUrl` (S3 key) and a temporary signed `validUrl`.

> The student create/update payloads now accept an optional `avatarUrl` string — useful when you already have a key from the standalone upload endpoint.

### POST `/api/schools/$SCHOOL_ID/students/avatar/upload`
Upload an avatar image **without** attaching it to a student. Returns the S3 key + signed URL so you can store it yourself (e.g. before the student exists).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/students/avatar/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/avatar.png"
```
Response shape:
```json
{ "success": true, "data": { "fileUrl": "avatars/...", "validUrl": "https://...", "fileName": "avatar.png" } }
```

### POST `/api/schools/$SCHOOL_ID/students/$ID/avatar/upload`
Upload an avatar **and** set it on the student (`avatarUrl` is updated to the new key).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/students/$ID/avatar/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/avatar.png"
```
Response shape:
```json
{ "success": true, "data": { "student": { ... }, "avatarUrl": "avatars/...", "validUrl": "https://..." } }
```

---

## Homework Attachments

Upload files (multipart `file`) for homework, stored under the S3 `homework-attachments/` prefix. Both responses return the S3 key + a signed `validUrl`.

### POST `/api/schools/$SCHOOL_ID/homework/upload`
Upload a homework attachment **without** attaching it to a homework record. Useful when posting homework: upload first, then include the returned key in your `POST /homework` payload.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/homework/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/worksheet.pdf"
```
Response shape:
```json
{ "success": true, "data": { "fileUrl": "homework-attachments/...", "validUrl": "https://...", "fileName": "worksheet.pdf" } }
```

### POST `/api/schools/$SCHOOL_ID/homework/$ID/attachments/upload`
Upload a file and **append** it to the homework's `attachments.files[]` array.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/homework/$ID/attachments/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/worksheet.pdf"
```
Response shape:
```json
{ "success": true, "data": { "homework": { ... }, "fileUrl": "homework-attachments/...", "validUrl": "https://...", "fileName": "worksheet.pdf" } }
```

---

## Academic Rollover

Copy a year's structure into another academic year. The `:id` in the URL is the **target** year; the **source** year goes in the body as `sourceYearId`. Sections and timetable slots are year-scoped, so these are the only things that need cloning (classes and subjects are school-level and shared across years).

- Both endpoints are **idempotent** — re-running skips anything already present in the target (reported as `skipped*`), so it's safe to retry.
- **Order matters**: clone sections **before** timetable. Timetable slots are re-pointed onto the target year's section that matches the same `(classMaster, section name)`, so those sections must exist first. Slots whose section has no match in the target are counted as `skippedMissingSection`.
- Subjects/teachers are school-level, so their references carry over unchanged.
- Permissions: clone-sections needs `MANAGE_CLASSES`, clone-timetable needs `MANAGE_TIMETABLE`.

### POST `/api/schools/$SCHOOL_ID/academic-years/$TARGET_YEAR_ID/clone-sections`
Clone every section from the source year into the target year.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years/$TARGET_YEAR_ID/clone-sections" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{ "sourceYearId": "<source-year-uuid>" }'
```
Response shape:
```json
{ "success": true, "data": { "cloned": 2, "skippedDuplicate": 0, "sourceSectionCount": 2 } }
```

### POST `/api/schools/$SCHOOL_ID/academic-years/$TARGET_YEAR_ID/clone-timetable`
Clone every timetable slot from the source year into the target year, re-pointed onto the target year's matching sections. Run **after** clone-sections.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years/$TARGET_YEAR_ID/clone-timetable" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{ "sourceYearId": "<source-year-uuid>" }'
```
Response shape:
```json
{ "success": true, "data": { "cloned": 3, "skippedMissingSection": 0, "skippedDuplicate": 0, "sourceSlotCount": 3 } }
```
