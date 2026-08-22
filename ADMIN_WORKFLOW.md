# Teacher Scheduling System - Complete Workflow

## ✅ Supabase Status
- **Connected**: Yes ✅
- **Admin User Created**: Yes ✅
  - Email: `admin@school.edu`
  - Password: `admin123`

---

## 📋 Role-Based Access & Workflows

### 🔐 ADMIN - Full System Control

#### 1. Create Teacher Accounts
**Endpoint**: `POST /api/admin/teachers`
```json
{
  "name": "John Doe",
  "email": "john.doe@school.edu",
  "password": "securePassword123",
  "dateOfBirth": "1990-05-15",
  "gender": "Male",
  "phone": "555-0101",
  "address": "123 Main St"
}
```

#### 2. Create Student Accounts  
**Endpoint**: `POST /api/admin/students`
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@school.edu",
  "password": "studentPass123",
  "gradeLevel": "G11",
  "sectionId": "<section-id>",
  "dateOfBirth": "2008-03-22",
  "gender": "Female",
  "guardianName": "Parent Name",
  "guardianPhone": "555-0202"
}
```

#### 3. Assign Teachers to Teach Sections & Subjects
**Endpoint**: `POST /api/admin/schedules`
```json
{
  "teacherId": "<teacher-id>",
  "subjectId": "<subject-id>",
  "sectionId": "<section-id>",
  "timeSlotId": "<timeslot-id>",
  "room": "101",
  "overrideRules": false
}
```
This creates a **ScheduleBlock** linking:
- Teacher → teaches
- Subject → (e.g., Mathematics, English)
- Section → (e.g., G11-STEM-A)
- TimeSlot → (e.g., Monday 9:00-10:00)

#### 4. View All Teachers
**Endpoint**: `GET /api/admin/teachers`

#### 5. View All Students
**Endpoint**: `GET /api/admin/students`

#### 6. View All Schedule Assignments
**Endpoint**: `GET /api/admin/schedules`

---

### 👨‍🏫 TEACHER - Manage Classes & Records

#### 1. View Assigned Sections & Students
**Endpoint**: `GET /api/teacher/grades`

Returns all sections and students the teacher is assigned to teach (via ScheduleBlocks), grouped by section and subject.

#### 2. Record Student Grades
**Endpoint**: `POST /api/teacher/grades`
```json
{
  "studentId": "<student-id>",
  "subjectId": "<subject-id>",
  "sectionId": "<section-id>",
  "gradingPeriod": "Quarter 1",
  "academicYear": "2026-2027",
  "score": 92.5,
  "remarks": "Excellent work"
}
```

#### 3. Record Student Attendance
**Endpoint**: `GET/POST /api/teacher/attendance`
```json
{
  "studentId": "<student-id>",
  "subjectId": "<subject-id>",
  "sectionId": "<section-id>",
  "status": "PRESENT",
  "gradingPeriod": "Quarter 1",
  "academicYear": "2026-2027"
}
```
Status options: `PRESENT`, `ABSENT`, `LATE`

#### 4. View Schedule
**Endpoint**: `GET /api/teacher/schedule`

Shows the teacher's full weekly schedule with assigned sections, subjects, and times.

---

### 👤 STUDENT - View Grades & Attendance
- **View own grades**: Through student dashboard
- **View own attendance**: Through student dashboard
- **View schedule**: Can see their section's schedule

---

## 🔄 Complete Flow Example

### Step 1: Admin Creates Teacher
```
POST /api/admin/teachers
← Teacher created with ID: teacher_123
```

### Step 2: Admin Creates Students
```
POST /api/admin/students
← Student created with ID: student_001, assigned to section: G11-STEM-A

POST /api/admin/students
← Student created with ID: student_002, assigned to section: G11-STEM-A
```

### Step 3: Admin Assigns Teacher to Section & Subject
```
POST /api/admin/schedules
{
  "teacherId": "teacher_123",
  "subjectId": "math_101",
  "sectionId": "g11_stem_a",
  "timeSlotId": "mon_0900",
  "room": "201"
}
← ScheduleBlock created, teacher now teaches Math to G11-STEM-A on Monday 9:00 AM
```

### Step 4: Teacher Views Their Students
```
GET /api/teacher/grades
← Response shows:
{
  "sections": [
    {
      "id": "g11_stem_a",
      "name": "G11-STEM-A",
      "students": [
        { "id": "student_001", "name": "Student 1" },
        { "id": "student_002", "name": "Student 2" }
      ],
      "subjects": [
        { "id": "math_101", "name": "Mathematics" }
      ]
    }
  ]
}
```

### Step 5: Teacher Records Grades
```
POST /api/teacher/grades
{
  "studentId": "student_001",
  "subjectId": "math_101",
  "sectionId": "g11_stem_a",
  "score": 95,
  "gradingPeriod": "Quarter 1",
  "academicYear": "2026-2027"
}
← Grade recorded
```

### Step 6: Teacher Records Attendance
```
POST /api/teacher/attendance
{
  "studentId": "student_001",
  "subjectId": "math_101",
  "status": "PRESENT",
  "gradingPeriod": "Quarter 1"
}
← Attendance recorded
```

---

## 🔑 Key Features

✅ **Different Teacher Types**: Each teacher can teach multiple subjects in multiple sections
✅ **Student Assignment**: Admin assigns students to sections; teachers see them automatically
✅ **Subject-Based Teaching**: Teachers are assigned by subject, not just by section
✅ **Time Slot Management**: Prevents scheduling conflicts (no teacher/section double-booking)
✅ **Grade & Attendance Tracking**: Teachers record both for their assigned students
✅ **Academic Year Support**: All records tracked by grading period and academic year

---

## 📝 Admin Credentials
- **Email**: `admin@school.edu`
- **Password**: `admin123`
- **URL**: http://localhost:3000/login/admin

---

## 🚀 Running the System

```bash
cd Schedule

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

Login as admin and use the API endpoints or UI to:
1. Create teachers
2. Create students (assigned to sections)
3. Create schedule blocks (assign teachers to subjects in sections)
4. Teachers log in and manage grades & attendance
