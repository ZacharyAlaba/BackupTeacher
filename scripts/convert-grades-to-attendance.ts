import { prisma } from "../lib/prisma";

async function main() {
  console.log("Starting conversion of GradeRecord -> AttendanceRecord");

  const gradeRecords = await prisma.gradeRecord.findMany({
    include: { student: true, subject: true, section: true },
  });

  console.log(`Found ${gradeRecords.length} grade records`);

  let created = 0;

  for (const g of gradeRecords) {
    // Map numeric score to attendance status: score > 0 => PRESENT, score === 0 => ABSENT
    const status = g.score > 0 ? "PRESENT" : "ABSENT";
    const attendanceDate = g.createdAt
      ? g.createdAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    try {
      await prisma.attendanceRecord.upsert({
        where: {
          studentId_subjectId_gradingPeriod_academicYear_date: {
            studentId: g.studentId,
            subjectId: g.subjectId,
            gradingPeriod: g.gradingPeriod,
            academicYear: g.academicYear,
            date: attendanceDate,
          },
        },
        create: {
          studentId: g.studentId,
          subjectId: g.subjectId,
          sectionId: g.sectionId,
          teacherId: g.teacherId,
          gradingPeriod: g.gradingPeriod,
          academicYear: g.academicYear,
          date: attendanceDate,
          status: status as any,
          remarks: g.remarks || null,
        },
        update: {
          sectionId: g.sectionId,
          teacherId: g.teacherId,
          status: status as any,
          date: attendanceDate,
          remarks: g.remarks || null,
        },
      });
      created++;
    } catch (err) {
      console.error("Failed to upsert attendance for grade id", g.id, err);
    }
  }

  console.log(`Converted ${created} records`);
}

main()
  .then(() => {
    console.log("Conversion finished");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
