-- Add a public identifier for teachers, matching the Student.studentId pattern.
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;

WITH numbered_teachers AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS sequence_number
  FROM "Teacher"
  WHERE "teacherId" IS NULL
)
UPDATE "Teacher" AS teacher
SET "teacherId" = '2026-T-' || LPAD(numbered_teachers.sequence_number::TEXT, 3, '0')
FROM numbered_teachers
WHERE teacher.id = numbered_teachers.id;

ALTER TABLE "Teacher" ALTER COLUMN "teacherId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_teacherId_key" ON "Teacher"("teacherId");
