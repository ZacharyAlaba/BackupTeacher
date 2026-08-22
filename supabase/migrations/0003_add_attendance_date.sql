ALTER TABLE "AttendanceRecord"
  ADD COLUMN IF NOT EXISTS "date" TEXT;

UPDATE "AttendanceRecord"
SET "date" = COALESCE("date", to_char("createdAt", 'YYYY-MM-DD'))
WHERE "date" IS NULL;

DROP INDEX IF EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_key";

ALTER TABLE "AttendanceRecord"
  ALTER COLUMN "date" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key"
  ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date");
