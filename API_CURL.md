# School Management API — curl Reference

Complete curl examples for every endpoint exposed by this backend, with a one-line description of what each endpoint does.

> **Terminology note** — In this codebase, **Assessments are Exams**. The URL path stays `/assessments` (don't rename it in your requests), but in this doc the resource is described as "Exam" wherever the user-facing concept appears.

---

## Conventions

- **Base URL**: `http://localhost:3000/api`
- **Auth**: All endpoints except `POST /auth/login` and `POST /auth/refresh` require a JWT in `Authorization: Bearer <token>`.
- **Content type**: JSON requests use `Content-Type: application/json`. File uploads use `multipart/form-data`.
- **School-scoped routes** (`/schools/:schoolId/...`): the server automatically injects `schoolId` from the URL into the request body, so you don't have to repeat it in the JSON payload.
- **Placeholders** used below:
  - `$TOKEN` — JWT access token
  - `$SCHOOL_ID` — UUID of the school
  - `$ID` — UUID of the resource being addressed
- All IDs are UUID v4 unless otherwise noted.

### Setup: get a token

Login as super admin (created by the seeder) and export a token for use in the rest of the examples:

```bash
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@qbitlog.com","password":"Superadmin@123"}' \
  | jq -r '.data.token')

export SCHOOL_ID=<paste-a-school-uuid-here>
```

The login response shape is:
```json
{ "success": true, "data": { "token": "...", "refreshToken": "...", "user": { ... } } }
```

---

## Health Check — `/health`

Top-level liveness probe. Public (no auth required) and not under `/api`.

### GET `/health`
Returns a small JSON object confirming the server is up.
```bash
curl -X GET http://localhost:3000/health
```

---

## Auth — `/api/auth`

### POST `/api/auth/login`
Authenticate a user and receive a JWT access token + refresh token.
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "superadmin@qbitlog.com",
    "password": "Superadmin@123"
  }'
```

### POST `/api/auth/refresh`
Exchange a refresh token for a new access token.
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{
    "refreshToken": "<refresh-token-from-login>"
  }'
```

### POST `/api/auth/register`
Create a new user account (requires `CREATE_USER` permission).
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "secret123",
    "role": "<role-uuid>",
    "schoolId": "<school-uuid>",
    "phoneNumber": "+910000000000"
  }'
```

---

## Schools — `/api/schools`

Manage school tenants (typically used by super admin).

### GET `/api/schools`
List all schools.
```bash
curl -X GET http://localhost:3000/api/schools \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools`
Create a new school (tenant).
```bash
curl -X POST http://localhost:3000/api/schools \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Sunrise Public School",
    "domain": "sunrise",
    "address": "123 Park Road",
    "phoneNumber": "+911234567890",
    "location": { "lat": 28.6139, "lng": 77.2090 },
    "isActive": true,
    "initialPayment": 50000,
    "monthlyPayment": 5000
  }'
```

### GET `/api/schools/$ID`
Fetch a single school by ID.
```bash
curl -X GET http://localhost:3000/api/schools/$ID \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$ID`
Update an existing school's details.
```bash
curl -X PUT http://localhost:3000/api/schools/$ID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "456 New Road",
    "phoneNumber": "+919876543210",
    "isActive": true
  }'
```

### DELETE `/api/schools/$ID`
Delete a school.
```bash
curl -X DELETE http://localhost:3000/api/schools/$ID \
  -H "Authorization: Bearer $TOKEN"
```

---

# School-Scoped Endpoints — `/api/schools/$SCHOOL_ID/...`

Everything below is nested under a specific school. The `schoolId` is taken from the URL and auto-injected into the request body.

---

## Academic Years

### GET `/api/schools/$SCHOOL_ID/academic-years`
List academic years for the school.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/academic-years`
Create an academic year (e.g. "2026-2027").
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "2026-2027",
    "startDate": "2026-04-01",
    "endDate": "2027-03-31",
    "isCurrent": true
  }'
```

### GET `/api/schools/$SCHOOL_ID/academic-years/$ID`
Fetch a single academic year by ID.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/academic-years/$ID`
Update an academic year.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "isCurrent": true
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/academic-years/$ID`
Delete an academic year.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/academic-years/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Roles

### GET `/api/schools/$SCHOOL_ID/roles`
List all roles defined for the school.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/roles" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/roles`
Create a new role with a set of permissions.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Teacher",
    "permissions": ["READ_STUDENT", "MARK_ATTENDANCE", "MANAGE_HOMEWORK"]
  }'
```

### GET `/api/schools/$SCHOOL_ID/roles/$ID`
Fetch a single role.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/roles/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/roles/$ID`
Update a role's name or permissions.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/roles/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "permissions": ["READ_STUDENT", "MARK_ATTENDANCE"]
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/roles/$ID`
Delete a role.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/roles/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Users

### GET `/api/schools/$SCHOOL_ID/users`
List users in the school.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/users" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/users`
Create a user under the school.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "secret123",
    "roleId": "<role-uuid>",
    "phoneNumber": "+910000000000"
  }'
```

### GET `/api/schools/$SCHOOL_ID/users/$ID`
Fetch a single user.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/users/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/users/$ID`
Update a user's profile or role.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/users/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane D.",
    "isActive": true
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/users/$ID`
Delete a user.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/users/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Enquiries

Pre-admission enquiries captured from prospective parents.

### GET `/api/schools/$SCHOOL_ID/enquiries`
List all enquiries.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/enquiries" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/enquiries`
Create a new enquiry (e.g. from a walk-in or web form).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/enquiries" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Rakesh Kumar",
    "phoneNumber": "+919876543210",
    "email": "rakesh@example.com",
    "studentName": "Aarav Kumar",
    "classInterested": "Grade 3",
    "source": "Walk-in",
    "status": "New"
  }'
```

### GET `/api/schools/$SCHOOL_ID/enquiries/$ID`
Fetch a single enquiry.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/enquiries/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/enquiries/$ID`
Update an enquiry's status or notes.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/enquiries/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Contacted",
    "remarks": "Parent will visit on Friday"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/enquiries/$ID`
Delete an enquiry.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/enquiries/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Applications

Admission applications, typically promoted from an enquiry. Includes lifecycle actions and document attachments.

### GET `/api/schools/$SCHOOL_ID/applications`
List all admission applications.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/applications" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/applications`
Submit a new admission application.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/applications" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentName": "Aarav Kumar",
    "dateOfBirth": "2018-06-12",
    "gender": "Male",
    "parentName": "Rakesh Kumar",
    "phoneNumber": "+919876543210",
    "email": "rakesh@example.com",
    "classApplied": "Grade 3",
    "academicYearId": "<academic-year-uuid>",
    "status": "Submitted"
  }'
```

### GET `/api/schools/$SCHOOL_ID/applications/$ID`
Fetch a single application.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/applications/$ID`
Update an application's fields.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "classApplied": "Grade 4",
    "status": "UnderReview"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/applications/$ID`
Delete an application.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PATCH `/api/schools/$SCHOOL_ID/applications/$ID/start-review`
Move the application into the review stage.
```bash
curl -X PATCH "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/start-review" \
  -H "Authorization: Bearer $TOKEN"
```

### PATCH `/api/schools/$SCHOOL_ID/applications/$ID/verify`
Mark the application's documents/details as verified.
```bash
curl -X PATCH "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/verify" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/applications/$ID/approve`
Approve the application. **Requires** `assignedClass` and `assignedSection` in the body — the controller returns 400 without them.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "assignedClass": "<class-master-uuid>",
    "assignedSection": "<class-section-uuid>"
  }'
```

### POST `/api/schools/$SCHOOL_ID/applications/$ID/reject`
Reject the application. **Requires** `reason` in the body — the controller returns 400 without it.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "Class is full"
  }'
```

### GET `/api/schools/$SCHOOL_ID/applications/$ID/documents`
List documents attached to this application.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/documents" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/applications/$ID/documents`
Attach a document record (by metadata) to an application.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "BirthCertificate",
    "fileName": "birth_cert.pdf",
    "fileUrl": "https://s3.example.com/birth_cert.pdf"
  }'
```

### POST `/api/schools/$SCHOOL_ID/applications/$ID/documents/upload`
Upload a file (multipart) and attach it to the application.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/birth_cert.pdf"
```

### PATCH `/api/schools/$SCHOOL_ID/applications/$ID/documents/$DOC_ID/verify`
Mark a specific attached document as verified.
```bash
curl -X PATCH "http://localhost:3000/api/schools/$SCHOOL_ID/applications/$ID/documents/$DOC_ID/verify" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Teachers

### GET `/api/schools/$SCHOOL_ID/teachers`
List teachers.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/teachers" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/teachers`
Create a teacher profile (links to an existing user).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/teachers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "<user-uuid>",
    "employeeId": "EMP001",
    "hireDate": "2024-06-01",
    "qualification": "M.Sc. Mathematics",
    "experienceYears": 5,
    "department": "Mathematics",
    "designation": "Senior Teacher"
  }'
```

### GET `/api/schools/$SCHOOL_ID/teachers/$ID`
Fetch a single teacher.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/teachers/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/teachers/$ID`
Update a teacher's profile.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/teachers/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "designation": "Head of Department",
    "department": "Mathematics"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/teachers/$ID`
Delete a teacher record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/teachers/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Teacher Subjects

Links between teachers and the subjects they're qualified to teach.

### GET `/api/schools/$SCHOOL_ID/teacher-subjects`
List teacher-subject assignments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-subjects" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/teacher-subjects`
Assign a subject to a teacher.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-subjects" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherId": "<teacher-uuid>",
    "subjectId": "<subject-uuid>"
  }'
```

### GET `/api/schools/$SCHOOL_ID/teacher-subjects/$ID`
Fetch a single teacher-subject mapping.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-subjects/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/teacher-subjects/$ID`
Update a teacher-subject mapping.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-subjects/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "subjectId": "<new-subject-uuid>"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/teacher-subjects/$ID`
Remove a teacher-subject mapping.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/teacher-subjects/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Parents

### GET `/api/schools/$SCHOOL_ID/parents/search`
Search parents by name, phone, or email — used in admissions/enrollment flows.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/parents/search?q=rakesh" \
  -H "Authorization: Bearer $TOKEN"
```

### GET `/api/schools/$SCHOOL_ID/parents`
List all parents.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/parents" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/parents`
Create a parent profile (links to an existing user).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/parents" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "<user-uuid>",
    "fatherName": "Rakesh Kumar",
    "motherName": "Sita Kumar",
    "fatherPhone": "+919876543210",
    "motherPhone": "+919876500000",
    "fatherOccupation": "Engineer",
    "annualIncome": 1200000
  }'
```

### GET `/api/schools/$SCHOOL_ID/parents/$ID`
Fetch a single parent.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/parents/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/parents/$ID`
Update a parent's profile.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/parents/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "annualIncome": 1500000,
    "fatherOccupation": "Senior Engineer"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/parents/$ID`
Delete a parent record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/parents/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Students

### GET `/api/schools/$SCHOOL_ID/students`
List students.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/students" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/students`
Create a student record.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/students" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Aarav Kumar",
    "admissionNumber": "ADM2026-001",
    "dateOfBirth": "2018-06-12",
    "gender": "Male",
    "parentId": "<parent-uuid>",
    "enrollmentDate": "2026-04-10",
    "status": "Active"
  }'
```

### GET `/api/schools/$SCHOOL_ID/students/$ID`
Fetch a single student.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/students/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/students/$ID`
Update a student's record.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/students/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "medicalNotes": "Mild peanut allergy",
    "transportRoute": "Route 7"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/students/$ID`
Delete a student.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/students/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### GET `/api/schools/$SCHOOL_ID/students/$ID/documents`
List documents attached to this student.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/students/$ID/documents" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Student Enrollments

Links a student to a specific class-section for a given academic year.

### GET `/api/schools/$SCHOOL_ID/student-enrollments`
List all enrollments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/student-enrollments" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/student-enrollments`
Enroll a student into a class-section for an academic year.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/student-enrollments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentId": "<student-uuid>",
    "classSectionId": "<class-section-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "rollNumber": 17,
    "status": "Active",
    "joinedAt": "2026-04-10"
  }'
```

### GET `/api/schools/$SCHOOL_ID/student-enrollments/$ID`
Fetch a single enrollment.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/student-enrollments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/student-enrollments/$ID`
Update an enrollment (e.g. change roll number or status).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/student-enrollments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "rollNumber": 18,
    "status": "Active"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/student-enrollments/$ID`
Remove an enrollment.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/student-enrollments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Class Masters

Master list of class/grade definitions (e.g. "Grade 1", "Grade 2"), independent of section/year.

### GET `/api/schools/$SCHOOL_ID/class-masters`
List class masters.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-masters" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/class-masters`
Create a class master.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/class-masters" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Grade 3",
    "gradeLevel": 3
  }'
```

### GET `/api/schools/$SCHOOL_ID/class-masters/$ID`
Fetch a single class master.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-masters/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/class-masters/$ID`
Update a class master.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/class-masters/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Grade III"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/class-masters/$ID`
Delete a class master.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/class-masters/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Class Sections

Concrete sections within a class for a given academic year (e.g. "Grade 3 - A" for 2026-27).

### GET `/api/schools/$SCHOOL_ID/class-sections`
List class sections.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-sections" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/class-sections`
Create a class section.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/class-sections" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "classMasterId": "<class-master-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "section": "A",
    "status": "Active"
  }'
```

### GET `/api/schools/$SCHOOL_ID/class-sections/$ID`
Fetch a single class section.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-sections/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/class-sections/$ID`
Update a class section.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/class-sections/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "section": "B"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/class-sections/$ID`
Delete a class section.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/class-sections/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Class Teachers

Assigns a teacher as the class teacher (homeroom) of a section for an academic year.

### GET `/api/schools/$SCHOOL_ID/class-teachers`
List class-teacher assignments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-teachers" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/class-teachers`
Assign a teacher as class teacher of a section.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/class-teachers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherId": "<teacher-uuid>",
    "classSectionId": "<class-section-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "role": "Primary"
  }'
```

### GET `/api/schools/$SCHOOL_ID/class-teachers/$ID`
Fetch a single class-teacher assignment.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-teachers/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/class-teachers/$ID`
Update a class-teacher assignment.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/class-teachers/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "role": "Secondary"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/class-teachers/$ID`
Remove a class-teacher assignment.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/class-teachers/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Subjects

### GET `/api/schools/$SCHOOL_ID/subjects`
List subjects.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/subjects" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/subjects`
Create a subject.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/subjects" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Mathematics",
    "code": "MATH"
  }'
```

### GET `/api/schools/$SCHOOL_ID/subjects/$ID`
Fetch a single subject.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/subjects/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/subjects/$ID`
Update a subject.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/subjects/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "MTH"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/subjects/$ID`
Delete a subject.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/subjects/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Class Subjects

Links subjects (and optionally a teacher) to a specific class section.

### GET `/api/schools/$SCHOOL_ID/class-subjects`
List class-subject assignments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-subjects" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/class-subjects`
Assign a subject to a class section (optionally with a teacher).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/class-subjects" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "classSectionId": "<class-section-uuid>",
    "subjectId": "<subject-uuid>",
    "teacherId": "<teacher-uuid>",
    "academicYearId": "<academic-year-uuid>"
  }'
```

### GET `/api/schools/$SCHOOL_ID/class-subjects/$ID`
Fetch a single class-subject mapping.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/class-subjects/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/class-subjects/$ID`
Update a class-subject mapping.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/class-subjects/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherId": "<new-teacher-uuid>"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/class-subjects/$ID`
Remove a class-subject mapping.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/class-subjects/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Timetable Slots

Individual periods in the weekly timetable for a class section.

### GET `/api/schools/$SCHOOL_ID/timetable-slots`
List timetable slots.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/timetable-slots" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/timetable-slots`
Create a timetable slot. `dayOfWeek` is `0` (Sunday) to `6` (Saturday).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/timetable-slots" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "classSectionId": "<class-section-uuid>",
    "subjectId": "<subject-uuid>",
    "teacherId": "<teacher-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "09:45"
  }'
```

### GET `/api/schools/$SCHOOL_ID/timetable-slots/$ID`
Fetch a single timetable slot.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/timetable-slots/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/timetable-slots/$ID`
Update a timetable slot.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/timetable-slots/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "startTime": "09:15",
    "endTime": "10:00"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/timetable-slots/$ID`
Delete a timetable slot.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/timetable-slots/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Attendance

Per-day attendance entries against a student's enrollment.

### GET `/api/schools/$SCHOOL_ID/attendance`
List attendance records (filter via query params if the controller supports them).
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/attendance" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/attendance`
Mark attendance for a student on a given date.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentEnrollmentId": "<enrollment-uuid>",
    "date": "2026-05-22",
    "status": "Present",
    "remarks": "On time"
  }'
```

### GET `/api/schools/$SCHOOL_ID/attendance/$ID`
Fetch a single attendance record.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/attendance/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/attendance/$ID`
Update an attendance record (e.g. correct a mistake).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/attendance/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Excused",
    "remarks": "Doctor visit"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/attendance/$ID`
Delete an attendance record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/attendance/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Homework

Homework assignments posted to a class section by a teacher for a subject.

### GET `/api/schools/$SCHOOL_ID/homework`
List homework entries.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/homework" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/homework`
Post a new homework assignment.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/homework" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "classSectionId": "<class-section-uuid>",
    "subjectId": "<subject-uuid>",
    "teacherId": "<teacher-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "title": "Chapter 4 — Worksheet",
    "description": "Solve problems 1-10 from page 42",
    "dueDate": "2026-05-29"
  }'
```

### GET `/api/schools/$SCHOOL_ID/homework/$ID`
Fetch a single homework entry.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/homework/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/homework/$ID`
Update a homework assignment.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/homework/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "dueDate": "2026-06-01",
    "description": "Solve problems 1-15 from page 42"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/homework/$ID`
Delete a homework assignment.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/homework/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Exams (Assessments)

> **Note**: in the codebase these are called *Assessments* and the URL path uses `/assessments`. Functionally they represent **exams** (unit tests, mid-terms, finals, etc.).

### GET `/api/schools/$SCHOOL_ID/assessments`
List exams.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/assessments" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/assessments`
Create an exam for a class (and optionally a specific section).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/assessments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Mid-Term Exam — Term 1",
    "classMasterId": "<class-master-uuid>",
    "classSectionId": "<class-section-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "startDate": "2026-09-15",
    "endDate": "2026-09-25",
    "maxMarks": 100,
    "description": "Mid-term examination covering chapters 1-5"
  }'
```

### GET `/api/schools/$SCHOOL_ID/assessments/$ID`
Fetch a single exam.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/assessments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/assessments/$ID`
Update an exam.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/assessments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "endDate": "2026-09-27",
    "maxMarks": 80
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/assessments/$ID`
Delete an exam.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/assessments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Student Marks

Per-student, per-subject marks for an exam (assessment).

### GET `/api/schools/$SCHOOL_ID/student-marks`
List student-mark entries.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/student-marks" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/student-marks`
Enter marks for a student against an exam and subject.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/student-marks" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentEnrollmentId": "<enrollment-uuid>",
    "assessmentId": "<exam-uuid>",
    "subjectId": "<subject-uuid>",
    "marksObtained": 78,
    "grade": "B+",
    "remarks": "Good improvement from last term"
  }'
```

### GET `/api/schools/$SCHOOL_ID/student-marks/$ID`
Fetch a single mark entry.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/student-marks/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/student-marks/$ID`
Update a mark entry (corrections, re-evaluation).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/student-marks/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "marksObtained": 82,
    "grade": "A-"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/student-marks/$ID`
Delete a mark entry.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/student-marks/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Fee Structures

A named fee structure for an academic year (e.g. "Standard Day Scholar 2026-27").

### GET `/api/schools/$SCHOOL_ID/fee-structures`
List fee structures.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structures" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/fee-structures`
Create a fee structure.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structures" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Day Scholar — 2026-27",
    "academicYearId": "<academic-year-uuid>"
  }'
```

### GET `/api/schools/$SCHOOL_ID/fee-structures/$ID`
Fetch a single fee structure.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structures/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/fee-structures/$ID`
Update a fee structure.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structures/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Day Scholar — Updated"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/fee-structures/$ID`
Delete a fee structure.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structures/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Fee Heads

Categories of fees (e.g. "Tuition", "Transport", "Lab"). Reusable across structures.

### GET `/api/schools/$SCHOOL_ID/fee-heads`
List fee heads.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-heads" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/fee-heads`
Create a fee head.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/fee-heads" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Tuition Fee"
  }'
```

### GET `/api/schools/$SCHOOL_ID/fee-heads/$ID`
Fetch a single fee head.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-heads/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/fee-heads/$ID`
Update a fee head.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/fee-heads/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Tuition (Annual)"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/fee-heads/$ID`
Delete a fee head.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/fee-heads/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Fee Structure Items

Line items inside a fee structure — pairs a fee head with an amount.

### GET `/api/schools/$SCHOOL_ID/fee-structure-items`
List fee-structure items.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structure-items" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/fee-structure-items`
Add a line item (head + amount) to a fee structure.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structure-items" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "feeStructureId": "<fee-structure-uuid>",
    "feeHeadId": "<fee-head-uuid>",
    "amount": 25000
  }'
```

### GET `/api/schools/$SCHOOL_ID/fee-structure-items/$ID`
Fetch a single fee-structure item.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structure-items/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/fee-structure-items/$ID`
Update a fee-structure item.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structure-items/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 27000
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/fee-structure-items/$ID`
Delete a fee-structure item.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/fee-structure-items/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Fee Installments

Installment schedule (due dates + amounts) for a fee structure.

### GET `/api/schools/$SCHOOL_ID/fee-installments`
List installments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-installments" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/fee-installments`
Create an installment.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/fee-installments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "feeStructureId": "<fee-structure-uuid>",
    "dueDate": "2026-07-15",
    "amount": 10000
  }'
```

### GET `/api/schools/$SCHOOL_ID/fee-installments/$ID`
Fetch a single installment.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-installments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/fee-installments/$ID`
Update an installment.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/fee-installments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "dueDate": "2026-07-20",
    "amount": 9500
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/fee-installments/$ID`
Delete an installment.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/fee-installments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Fee Assignments

Assigns a fee structure to a student enrollment (with optional concession/scholarship).

### POST `/api/schools/$SCHOOL_ID/fee-assignments/bulk-class`
Bulk-assign a fee structure to every enrollment in a class section or class master for an academic year. Must provide either `classSectionId` or `classMasterId`.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/fee-assignments/bulk-class" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "classSectionId": "<class-section-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "feeStructureId": "<fee-structure-uuid>"
  }'
```

### GET `/api/schools/$SCHOOL_ID/fee-assignments`
List fee assignments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-assignments" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/fee-assignments`
Assign a fee structure to a single student enrollment.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/fee-assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentEnrollmentId": "<enrollment-uuid>",
    "feeStructureId": "<fee-structure-uuid>",
    "concessionPercent": 10,
    "scholarshipAmount": 0
  }'
```

### GET `/api/schools/$SCHOOL_ID/fee-assignments/$ID`
Fetch a single fee assignment.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/fee-assignments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/fee-assignments/$ID`
Update a fee assignment (e.g. change concession).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/fee-assignments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "concessionPercent": 15
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/fee-assignments/$ID`
Remove a fee assignment.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/fee-assignments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Ledger

Per-enrollment ledger of debits (fees charged) and credits (payments / adjustments).

> **Note**: list and create use `/ledgers`, while get-by-id / update / delete use `/ledger/:id` (singular). Both paths are kept as-is below.

### GET `/api/schools/$SCHOOL_ID/ledgers`
List ledger entries.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/ledgers" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/ledgers`
Create a ledger entry (debit or credit).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/ledgers" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentEnrollmentId": "<enrollment-uuid>",
    "academicYearId": "<academic-year-uuid>",
    "entryType": "Debit",
    "category": "Tuition",
    "amount": 10000,
    "reference": "INV-2026-0001",
    "remarks": "Term 1 tuition charge"
  }'
```

### GET `/api/schools/$SCHOOL_ID/ledger/$ID`
Fetch a single ledger entry (singular `ledger`).
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/ledger/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/ledger/$ID`
Update a ledger entry (singular `ledger`).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/ledger/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "remarks": "Corrected: term 1 tuition charge"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/ledger/$ID`
Delete a ledger entry (singular `ledger`).
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/ledger/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Payments

Records of money actually collected against a ledger entry.

### GET `/api/schools/$SCHOOL_ID/payments`
List payments.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/payments" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/payments`
Record a fee payment against a ledger entry.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "studentEnrollmentId": "<enrollment-uuid>",
    "ledgerEntryId": "<ledger-uuid>",
    "amount": 10000,
    "paymentMode": "UPI",
    "transactionRef": "UPI-TXN-12345",
    "status": "Success",
    "receiptNumber": "RCPT-2026-0001",
    "paidAt": "2026-05-22T10:30:00Z"
  }'
```

### GET `/api/schools/$SCHOOL_ID/payments/$ID`
Fetch a single payment.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/payments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/payments/$ID`
Update a payment record (e.g. add receipt number, mark refunded).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/payments/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Refunded",
    "receiptNumber": "RCPT-2026-0001-R"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/payments/$ID`
Delete a payment record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/payments/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notification Templates

Reusable message templates for SMS / Email / WhatsApp notifications.

### GET `/api/schools/$SCHOOL_ID/notification-templates`
List notification templates.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/notification-templates" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/notification-templates`
Create a notification template.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/notification-templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Fee Reminder",
    "channel": "SMS",
    "subject": "Fee due reminder",
    "body": "Dear parent, the fee for {{studentName}} is due on {{dueDate}}.",
    "triggerEvent": "FEE_DUE"
  }'
```

### GET `/api/schools/$SCHOOL_ID/notification-templates/$ID`
Fetch a single notification template.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/notification-templates/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/notification-templates/$ID`
Update a notification template.
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/notification-templates/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "body": "Dear parent, the fee for {{studentName}} is due on {{dueDate}}. Please pay promptly."
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/notification-templates/$ID`
Delete a notification template.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/notification-templates/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Notifications

Individual notifications sent (or queued) to recipients via a chosen channel.

### GET `/api/schools/$SCHOOL_ID/notifications`
List notifications (queued / sent / failed).
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/notifications" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/notifications`
Send a notification (or bulk: pass an array of notification objects).
```bash
# Single recipient
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "templateId": "<template-uuid>",
    "recipientId": "<user-uuid>",
    "channel": "SMS"
  }'

# Bulk
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '[
    { "templateId": "<template-uuid>", "recipientId": "<user-uuid-1>", "channel": "SMS" },
    { "templateId": "<template-uuid>", "recipientId": "<user-uuid-2>", "channel": "Email" }
  ]'
```

### GET `/api/schools/$SCHOOL_ID/notifications/$ID`
Fetch a single notification.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/notifications/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/notifications/$ID`
Update a notification (e.g. mark delivered, set failure reason).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/notifications/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "Delivered",
    "deliveredAt": "2026-05-22T10:35:00Z"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/notifications/$ID`
Delete a notification record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/notifications/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Documents

Generic document records (file uploads) attachable to students/applications. There are also targeted endpoints under `/applications/:id/documents` and `/students/:id/documents` documented above.

### GET `/api/schools/$SCHOOL_ID/documents`
List documents.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/documents" \
  -H "Authorization: Bearer $TOKEN"
```

### POST `/api/schools/$SCHOOL_ID/documents`
Create a document record (by metadata; for actual file upload use `/documents/upload`).
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "AadhaarCard",
    "fileName": "aadhaar.pdf",
    "fileUrl": "https://s3.example.com/aadhaar.pdf",
    "studentId": "<student-uuid>"
  }'
```

### POST `/api/schools/$SCHOOL_ID/documents/upload`
Upload a file (multipart) and create a document record from it. Allowed types: images (jpeg/png/gif/webp), PDFs, Word/Excel docs, plain text. Max size 20 MB.
```bash
curl -X POST "http://localhost:3000/api/schools/$SCHOOL_ID/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/report-card.pdf"
```

### GET `/api/schools/$SCHOOL_ID/documents/$ID`
Fetch a single document.
```bash
curl -X GET "http://localhost:3000/api/schools/$SCHOOL_ID/documents/$ID" \
  -H "Authorization: Bearer $TOKEN"
```

### PUT `/api/schools/$SCHOOL_ID/documents/$ID`
Update a document record (rename, swap URL).
```bash
curl -X PUT "http://localhost:3000/api/schools/$SCHOOL_ID/documents/$ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "fileName": "aadhaar-front.pdf"
  }'
```

### DELETE `/api/schools/$SCHOOL_ID/documents/$ID`
Delete a document record.
```bash
curl -X DELETE "http://localhost:3000/api/schools/$SCHOOL_ID/documents/$ID" \
  -H "Authorization: Bearer $TOKEN"
```
