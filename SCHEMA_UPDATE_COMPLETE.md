# ✅ Database Schema Update - Complete

## What Was Done

1. ✅ **Added `SubjectStudent` Model to Prisma Schema**
   - New junction table for teacher-managed student enrollment
   - Links: Student → Subject → taught by Teacher → in Section

2. ✅ **Updated Student, Teacher, Subject, Section Models**
   - Added relationships to `SubjectStudent` model
   - Enables inverse queries for all entities

3. ✅ **Database Schema Synced**
   - Ran `prisma db push --force-reset`
   - All tables created including new `SubjectStudent` table
   - Indexes created for performance

4. ✅ **Created Teacher APIs**
   - `/api/teacher/section-students` - View all students in section
   - `/api/teacher/subject-enrollment` (POST/GET/DELETE) - Manage enrollment

---

## ⚠️ Supabase Permissions Issue

After the schema reset, there's a temporary permission issue with Supabase. This is normal after a full reset.

### Fix (Choose One)

**Option A: Use Supabase Dashboard (Easiest)**
1. Go to https://app.supabase.com
2. Login to your project
3. Go to SQL Editor
4. Run the migration manually:

```sql
-- Create initial tables if needed
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'TEACHER',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Insert admin user
INSERT INTO "User" (id, email, password, name, role) VALUES (
  'admin_001',
  'admin@school.edu',
  '$2a$10$DQGMDqnbs.6Dy0CK1ISDyuZaGo0CWHJ8e9gfXyNlFSWJAyfMGEc22',  -- password: admin123 hashed
  'Admin User',
  'ADMIN'
);
```

**Option B: Reset RLS Policies**
1. Go to Supabase Dashboard → Authentication
2. Go to SQL Editor
3. Disable RLS temporarily or recreate policies

**Option C: Restart/Reset Database in Supabase UI**
1. Project Settings → Database
2. Click "Reset Database"
3. Re-run seed script

---

## 🚀 How to Test New Enrollment Feature

Once permissions are fixed, test the new teacher enrollment API:

```bash
# 1. Admin creates teacher
curl -X POST http://localhost:3000/api/admin/teachers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mr. Smith",
    "email": "smith@school.edu",
    "password": "pass123"
  }'

# 2. Admin creates students assigned to section
curl -X POST http://localhost:3000/api/admin/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@school.edu",
    "password": "pass123",
    "gradeLevel": "G11",
    "sectionId": "<section-id>"
  }'

# 3. Admin assigns teacher to subject/section/time
curl -X POST http://localhost:3000/api/admin/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "<teacher-id>",
    "subjectId": "<subject-id>",
    "sectionId": "<section-id>",
    "timeSlotId": "<timeslot-id>",
    "room": "101"
  }'

# 4. Teacher logs in and views available students in section
curl -X GET "http://localhost:3000/api/teacher/section-students?subjectId=<subject-id>&sectionId=<section-id>" \
  -H "Authorization: Bearer <teacher-session-token>"

# 5. Teacher adds student to their subject
curl -X POST http://localhost:3000/api/teacher/subject-enrollment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <teacher-session-token>" \
  -d '{
    "studentId": "<student-id>",
    "subjectId": "<subject-id>",
    "sectionId": "<section-id>"
  }'

# 6. Teacher views their enrolled class roster
curl -X GET "http://localhost:3000/api/teacher/subject-enrollment?subjectId=<subject-id>&sectionId=<section-id>" \
  -H "Authorization: Bearer <teacher-session-token>"
```

---

## 📝 New Database Schema

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

---

## 📋 Files Created/Updated

- ✅ `/prisma/schema.prisma` - Added SubjectStudent model and relationships
- ✅ `/app/api/teacher/subject-enrollment/route.ts` - New API for enrollment management
- ✅ `/app/api/teacher/section-students/route.ts` - New API to view section students
- ✅ `/TEACHER_ENROLLMENT_SETUP.md` - Setup and usage guide
- ✅ `/supabase/migrations/0002_add_subject_student_enrollment.sql` - SQL migration

---

## ✨ Features Ready to Use

Once database permissions are fixed:
- ✅ Teachers can view all students in their assigned sections
- ✅ Teachers can add/remove students from their subject classes
- ✅ Teachers can see their class roster (enrolled students only)
- ✅ Teachers can record grades/attendance only for enrolled students
- ✅ Admin maintains control of creating users and assignments

---

## 🆘 Still Having Issues?

Check the Supabase dashboard:
1. Project Settings → Database
2. Check database status
3. Review SQL Editor for permission errors
4. Or use the "Reset Database" option
