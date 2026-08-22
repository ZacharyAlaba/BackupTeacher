import prisma from "../lib/prisma";
import supabaseAdmin from "../lib/supabaseAdmin";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Checking existing attendance records...");
  let existing = -1;
  try {
    const { count } = await supabaseAdmin.from("AttendanceRecord").select("id", { count: "exact" });
    existing = typeof count === "number" ? count : -1;
  } catch (e) {
    console.warn("Attendance table may not exist yet or is inaccessible:", e instanceof Error ? e.message : e);
    existing = -1;
  }

  let students = await prisma.student.findMany();
  if (students.length === 0) {
    console.log("No students found — cannot seed attendance demo.");
    return;
  }

  const existingStudentIds: Set<string> = new Set();
  if (existing > 0) {
    const { data: existingRows } = await supabaseAdmin.from("AttendanceRecord").select("studentId");
    for (const row of existingRows || []) existingStudentIds.add(row.studentId);
  }

  const subjects = await prisma.subject.findMany({ take: 5 });
  if (subjects.length === 0) {
    console.log("No subjects found — cannot seed attendance demo.");
    return;
  }

  const teachers = await prisma.teacher.findMany({ take: 5 });
  const sections = await prisma.section.findMany({ take: 5 });

  if (sections.length === 0) {
    console.log("No sections found — cannot seed attendance demo.");
    return;
  }

  const gradingPeriod = "Midterm";
  const academicYear = "2025-2026";

  const demoUserId = "demo-student";
  const demoStudentId = "STU001";
  const demoPassword = "student123";
  const demoEmail = "student@school.edu";

  const demoUser = await prisma.user.findUnique({ where: { id: demoUserId } });
  if (!demoUser) {
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    await prisma.user.create({
      data: {
        id: demoUserId,
        email: demoEmail,
        password: hashedPassword,
        name: "Student User",
        role: "STUDENT",
      },
    });
    console.log("Created demo student user.");
  }

  const demoStudent = await prisma.student.findUnique({ where: { studentId: demoStudentId } });
  if (!demoStudent) {
    await prisma.student.create({
      data: {
        userId: demoUserId,
        studentId: demoStudentId,
        gradeLevel: "G11",
        sectionId: sections[0].id,
      },
    });
    console.log("Created demo student record.");
  }

  students = await prisma.student.findMany();
  console.log(`Seeding attendance for ${students.length} students`);

  let inserted = 0;
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    if (existingStudentIds.has(student.id)) {
      continue;
    }

    const subject = subjects[i % subjects.length];
    const teacher = teachers[i % Math.max(1, teachers.length)];
    const section = sections[i % Math.max(1, sections.length)];
    const status = i % 5 === 0 ? "ABSENT" : "PRESENT";

    try {
      await supabaseAdmin.from("AttendanceRecord").upsert(
        [
          {
            studentId: student.id,
            teacherId: teacher?.id ?? null,
            subjectId: subject.id,
            sectionId: section?.id ?? null,
            gradingPeriod,
            academicYear,
            status,
            remarks: "Demo seed",
          },
        ],
        { onConflict: "studentId,subjectId,sectionId,gradingPeriod,academicYear" }
      );
      inserted++;
    } catch (err) {
      console.warn("Insert failed for", student.id, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Inserted ${inserted} demo attendance records (or skipped duplicates).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
