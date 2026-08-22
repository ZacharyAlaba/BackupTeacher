# Teacher-Managed Student Enrollment - Updated Workflow

## What Changed

**Before**: Admin assigned students to sections only. Teachers saw all students in their section automatically.

**Now**: 
- Admin assigns students to sections (same as before)
- Admin assigns teachers to teach subjects in sections (same as before)
- **NEW**: Teachers now manage their own class rosters - deciding which students actually take their subject

This allows for:
- ✅ Different class sizes (not all students in a section may take all subjects)
- ✅ Teachers controlling who gets graded in their subject
- ✅ Flexible enrollment (e.g., some G11 students take math, others don't)
- ✅ Per-subject attendance & grades tracking

---

## 📊 Database Changes

Added new `SubjectStudent` model in Prisma schema:

```prisma
model SubjectStudent {
  id             String   @id @default(cuid())
  studentId      String
  student        Student  @relation(fields: [studentId], references: [id])
  subjectId      String
  subject        Subject  @relation(fields: [subjectId], references: [id])
  sectionId      String
  section        Section  @relation(fields: [sectionId], references: [id])
  teacherId      String
  teacher        Teacher  @relation(fields: [teacherId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([studentId, subjectId, sectionId, teacherId])
}
```

This tracks: **Student → takes Subject → taught by Teacher → in Section**

---

## 🔧 Setup Instructions

```bash
cd c:\Users\User\Teacher Scheduling\Schedule

# 1. Generate Prisma client with new model
npx prisma generate

# 2. Create migration for SubjectStudent table
npx prisma migrate dev --name add_subject_student_enrollment

# 3. Restart dev server
npm run dev
```

---

## 👨‍🏫 Teacher APIs

### 1. Get All Students in Your Section (for a subject)
```
GET /api/teacher/section-students?subjectId=SUBJECT_ID&sectionId=SECTION_ID
```
Shows all 35 students in a section with their enrollment status in your subject.

**Response:**
```json
{
  "subjectId": "math_101",
  "sectionId": "g11_stem_a",
  "students": [
    {
      "studentId": "st_001",
      "studentNumber": "2024-0001",
      "name": "John Smith",
      "email": "john@school.edu",
      "isEnrolled": false,
      "enrollmentId": null
    }
  ],
  "total": 35,
  "enrolled": 12
}
```

### 2. Add a Student to Your Subject
```
POST /api/teacher/subject-enrollment

{
  "studentId": "st_001",
  "subjectId": "math_101",
  "sectionId": "g11_stem_a"
}
```

### 3. Remove a Student from Your Subject
```
DELETE /api/teacher/subject-enrollment?enrollmentId=ENROLLMENT_ID
```

### 4. Get Your Class Roster (enrolled students only)
```
GET /api/teacher/subject-enrollment?subjectId=SUBJECT_ID&sectionId=SECTION_ID
```

**Response:**
```json
{
  "subjectId": "math_101",
  "sectionId": "g11_stem_a",
  "students": [
    {
      "enrollmentId": "enr_abc123",
      "studentId": "st_001",
      "studentNumber": "2024-0001",
      "name": "John Smith",
      "email": "john@school.edu",
      "enrolledAt": "2026-07-19T10:30:00Z"
    },
    {
      "enrollmentId": "enr_xyz789",
      "studentId": "st_002",
      "studentNumber": "2024-0002",
      "name": "Jane Doe",
      "email": "jane@school.edu",
      "enrolledAt": "2026-07-19T10:35:00Z"
    }
  ]
}
```

---

## 🔄 Workflow Example

### Setup (Admin)
1. Create Teacher (John)
2. Create Students (35 students assigned to G11-STEM-A section)
3. Assign Teacher to subject/section:
   - POST /api/admin/schedules
   - John teaches Math in G11-STEM-A, Monday 9:00 AM

### Enrollment (Teacher John)
1. Teacher logs in as `john@school.edu`
2. Teacher views section students:
   - GET /api/teacher/section-students?subjectId=math_101&sectionId=g11_stem_a
   - Sees all 35 students
3. Teacher adds students to their Math class:
   - POST /api/teacher/subject-enrollment (for student 1)
   - POST /api/teacher/subject-enrollment (for student 2)
   - ... (add as many as needed)
4. Teacher views their roster:
   - GET /api/teacher/subject-enrollment?subjectId=math_101&sectionId=g11_stem_a
   - Sees only their enrolled students (e.g., 12 out of 35)

### Grading & Attendance (Teacher John)
1. Teacher records grades only for enrolled students
2. Teacher records attendance only for enrolled students
3. Admin/reports see only the students teacher enrolled

---

## 📝 Key Points

- **Authorization**: Teachers can only add/remove/grade students in their own taught subjects/sections
- **Flexibility**: No limit on how many students per subject (0 to all 35)
- **Academic Tracking**: Grades and attendance linked to SubjectStudent enrollment
- **Non-invasive**: Existing APIs still work; this is an additional layer

---

## 🚀 Next Steps

```bash
# Run the migration
npx prisma migrate dev

# Test the teacher enrollment API
# POST /api/teacher/subject-enrollment with teacher credentials
```
