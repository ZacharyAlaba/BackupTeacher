-- Create ENUM types
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE');

-- Create tables
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role "Role" DEFAULT 'TEACHER',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Teacher" (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "dateOfBirth" TIMESTAMP,
  gender TEXT,
  phone TEXT,
  address TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Student" (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "studentId" TEXT UNIQUE NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  "sectionId" TEXT,
  "dateOfBirth" TIMESTAMP,
  gender TEXT,
  phone TEXT,
  address TEXT,
  "guardianName" TEXT,
  "guardianPhone" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Subject" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  track TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TimeSlot" (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Section" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  track TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for Student.sectionId after Section is created
ALTER TABLE "Student" ADD CONSTRAINT "Student_sectionId_fkey" 
  FOREIGN KEY ("sectionId") REFERENCES "Section"(id) ON DELETE CASCADE;

CREATE TABLE "GradeRecord" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  "teacherId" TEXT NOT NULL REFERENCES "Teacher"(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES "Subject"(id) ON DELETE CASCADE,
  "sectionId" TEXT NOT NULL REFERENCES "Section"(id) ON DELETE CASCADE,
  "gradingPeriod" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  score FLOAT NOT NULL,
  remarks TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("studentId", "subjectId", "gradingPeriod", "academicYear")
);

CREATE TABLE "AttendanceRecord" (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES "Student"(id) ON DELETE CASCADE,
  "teacherId" TEXT NOT NULL REFERENCES "Teacher"(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES "Subject"(id) ON DELETE CASCADE,
  "sectionId" TEXT NOT NULL REFERENCES "Section"(id) ON DELETE CASCADE,
  "gradingPeriod" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  status "AttendanceStatus" NOT NULL,
  remarks TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("studentId", "subjectId", "gradingPeriod", "academicYear")
);

CREATE TABLE "ScheduleBlock" (
  id TEXT PRIMARY KEY,
  "teacherId" TEXT NOT NULL REFERENCES "Teacher"(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES "Subject"(id) ON DELETE CASCADE,
  "timeSlotId" TEXT NOT NULL REFERENCES "TimeSlot"(id) ON DELETE CASCADE,
  "sectionId" TEXT NOT NULL REFERENCES "Section"(id) ON DELETE CASCADE,
  room TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("teacherId", "timeSlotId"),
  UNIQUE("sectionId", "timeSlotId")
);

CREATE TABLE "TeacherQualification" (
  id TEXT PRIMARY KEY,
  "teacherId" TEXT NOT NULL REFERENCES "Teacher"(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES "Subject"(id) ON DELETE CASCADE,
  position TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("teacherId", "subjectId")
);

-- Create indexes for better performance
CREATE INDEX "GradeRecord_sectionId_subjectId_idx" ON "GradeRecord"("sectionId", "subjectId");
CREATE INDEX "AttendanceRecord_sectionId_subjectId_idx" ON "AttendanceRecord"("sectionId", "subjectId");
