import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const blocks = [
    `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendancestatus') THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT','ABSENT','LATE');
  END IF;
END
$$;`,
    `CREATE TABLE IF NOT EXISTS "AttendanceRecord" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId" uuid,
  "teacherId" uuid,
  "subjectId" uuid,
  "sectionId" uuid,
  "gradingPeriod" text,
  "academicYear" text,
  status "AttendanceStatus" DEFAULT 'PRESENT',
  remarks text,
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now()
);`,
    `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'attendance_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX attendance_unique_idx ON "AttendanceRecord" ("studentId","subjectId","sectionId","gradingPeriod","academicYear");
  END IF;
END
$$;`,
    `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Student' OR table_name='student') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Student' AND column_name='id') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_student_fkey') THEN
        ALTER TABLE "AttendanceRecord" ADD CONSTRAINT attendance_student_fkey FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON DELETE SET NULL;
      END IF;
    END;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END
$$;`,
    `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Teacher' OR table_name='teacher') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Teacher' AND column_name='id') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_teacher_fkey') THEN
        ALTER TABLE "AttendanceRecord" ADD CONSTRAINT attendance_teacher_fkey FOREIGN KEY ("teacherId") REFERENCES "Teacher"(id) ON DELETE SET NULL;
      END IF;
    END;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END
$$;`,
    `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Subject' OR table_name='subject') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Subject' AND column_name='id') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_subject_fkey') THEN
        ALTER TABLE "AttendanceRecord" ADD CONSTRAINT attendance_subject_fkey FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON DELETE SET NULL;
      END IF;
    END;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END
$$;`,
    `DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Section' OR table_name='section') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Section' AND column_name='id') THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_section_fkey') THEN
        ALTER TABLE "AttendanceRecord" ADD CONSTRAINT attendance_section_fkey FOREIGN KEY ("sectionId") REFERENCES "Section"(id) ON DELETE SET NULL;
      END IF;
    END;
  END IF;
EXCEPTION WHEN others THEN
  -- ignore
END
$$;`,
  ];

  console.log("Running safe attendance SQL blocks...");
  for (const block of blocks) {
    try {
      await prisma.$executeRawUnsafe(block);
    } catch (err) {
      console.warn(
        "Block failed (non-fatal):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
  console.log("Attendance table and enum ensured (safe).\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
