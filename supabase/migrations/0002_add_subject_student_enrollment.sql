-- Create SubjectStudent enrollment table
-- Tracks which students are enrolled in which subjects, taught by which teachers

CREATE TABLE IF NOT EXISTS "SubjectStudent" (
  id TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "SubjectStudent_studentId_fkey" FOREIGN KEY ("studentId")
    REFERENCES "Student"(id) ON DELETE CASCADE,
  CONSTRAINT "SubjectStudent_subjectId_fkey" FOREIGN KEY ("subjectId")
    REFERENCES "Subject"(id) ON DELETE CASCADE,
  CONSTRAINT "SubjectStudent_sectionId_fkey" FOREIGN KEY ("sectionId")
    REFERENCES "Section"(id) ON DELETE CASCADE,
  CONSTRAINT "SubjectStudent_teacherId_fkey" FOREIGN KEY ("teacherId")
    REFERENCES "Teacher"(id) ON DELETE CASCADE,
  
  UNIQUE("studentId", "subjectId", "sectionId", "teacherId")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "SubjectStudent_teacherId_subjectId_idx" 
  ON "SubjectStudent"("teacherId", "subjectId");
  
CREATE INDEX IF NOT EXISTS "SubjectStudent_studentId_subjectId_idx" 
  ON "SubjectStudent"("studentId", "subjectId");

-- Update Student table to reference SubjectStudent (relationship only in Prisma, no FK needed)
-- Already handled by SubjectStudent foreign keys

-- Update Subject table to reference SubjectStudent
-- Already handled by SubjectStudent foreign keys

-- Update Teacher table to reference SubjectStudent
-- Already handled by SubjectStudent foreign keys
