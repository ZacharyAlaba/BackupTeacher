import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

function isSchoolYearDate(dateValue: string, academicYear: string) {
  if (!dateValue || !academicYear) {
    return true;
  }

  const [startYear] = academicYear.split("-");
  const start = `${startYear}-08-01`;
  const end = `${Number(startYear) + 1}-07-31`;

  return dateValue >= start && dateValue <= end;
}

function getWeekday(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${dateValue}T00:00:00Z`)
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        scheduleBlocks: {
          include: {
            subject: true,
            timeSlot: true,
            section: {
              include: {
                students: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 });
    }

    const sectionMap = new Map<string, { id: string; name: string; gradeLevel: string; track: string; students: any[] }>();
    const subjectMap = new Map<string, { id: string; name: string; gradeLevel: string; track: string | null }>();
    const sectionSubjectAssignments: Array<{ sectionId: string; subjectId: string; subjectName: string; days: string[] }> = [];
    const assignmentSet = new Set<string>();

    for (const block of teacher.scheduleBlocks) {
      if (!sectionMap.has(block.sectionId)) {
        sectionMap.set(block.sectionId, {
          id: block.section.id,
          name: block.section.name,
          gradeLevel: block.section.gradeLevel,
          track: block.section.track,
          students: block.section.students.map((student) => ({
            id: student.id,
            studentId: student.studentId,
            name: student.user.name,
            email: student.user.email,
          })),
        });
      }

      if (!subjectMap.has(block.subjectId)) {
        subjectMap.set(block.subjectId, {
          id: block.subject.id,
          name: block.subject.name,
          gradeLevel: block.subject.gradeLevel,
          track: block.subject.track,
        });
      }

      const assignmentKey = `${block.sectionId}:${block.subjectId}`;
      const assignment = sectionSubjectAssignments.find((item) => item.sectionId === block.sectionId && item.subjectId === block.subjectId);
      if (assignment) {
        if (!assignment.days.includes(block.timeSlot.day)) {
          assignment.days.push(block.timeSlot.day);
        }
      } else if (!assignmentSet.has(assignmentKey)) {
        assignmentSet.add(assignmentKey);
        sectionSubjectAssignments.push({
          sectionId: block.sectionId,
          subjectId: block.subjectId,
          subjectName: block.subject.name,
          days: [block.timeSlot.day],
        });
      }
    }

    const academicYear = getAcademicYear();
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { teacherId: teacher.id },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        subject: true,
        section: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    const filteredAttendanceRecords = attendanceRecords.filter((record) =>
      isSchoolYearDate(record.date, academicYear)
    );

    return NextResponse.json({
      academicYear,
      sections: Array.from(sectionMap.values()),
      subjects: Array.from(subjectMap.values()),
      sectionSubjectAssignments,
      attendanceRecords: filteredAttendanceRecords,
    });
  } catch (error) {
    console.error("Teacher attendance fetch error:", error);
    return NextResponse.json({ message: "Failed to load attendance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) {
      console.log("Teacher not found for userId:", session.user.id);
      return NextResponse.json({ message: "Teacher not found" }, { status: 404 });
    }

    const body = await request.json();
    const { studentId, subjectId, sectionId, gradingPeriod, status, remarks, academicYear, date, records } = body;
    const attendanceRecords = Array.isArray(records)
      ? records
      : studentId && status
        ? [{ studentId, status, remarks, date }]
        : [];
    console.log("Save attendance request:", { studentId, subjectId, sectionId, gradingPeriod, status, date, recordCount: attendanceRecords.length });

    if (!subjectId || !sectionId || !gradingPeriod || attendanceRecords.length === 0) {
      console.log("Missing required fields");
      return NextResponse.json({ message: "subjectId, sectionId, gradingPeriod, and at least one attendance record are required" }, { status: 400 });
    }

    const sectionBlocks = await prisma.scheduleBlock.findMany({
      where: {
        teacherId: teacher.id,
        subjectId,
        sectionId,
      },
      include: { timeSlot: true },
    });

    if (sectionBlocks.length === 0) {
      console.log("Teacher not assigned to section/subject:", { teacherId: teacher.id, subjectId, sectionId });
      return NextResponse.json({ message: "You are not assigned to this section and subject" }, { status: 403 });
    }

    const scheduledDays = new Set(sectionBlocks.map((block) => block.timeSlot.day));
    const invalidDate = attendanceRecords.find((entry) => {
      const attendanceDate = entry.date || new Date().toISOString().slice(0, 10);
      return !scheduledDays.has(getWeekday(attendanceDate));
    });
    if (invalidDate) {
      return NextResponse.json({ message: "Attendance can only be recorded on the subject's scheduled days" }, { status: 400 });
    }

    const missingExcusedNote = attendanceRecords.find(
      (entry) => entry.status === "EXCUSED" && !String(entry.remarks || "").trim()
    );
    if (missingExcusedNote) {
      return NextResponse.json({ message: "An explanation is required for excused attendance" }, { status: 400 });
    }

    const studentIds = attendanceRecords.map((entry) => entry?.studentId).filter(Boolean);
    const students = await prisma.student.findMany({ where: { id: { in: studentIds }, sectionId }, select: { id: true } });
    if (students.length !== new Set(studentIds).size) {
      return NextResponse.json({ message: "One or more students were not found in this section" }, { status: 404 });
    }

    const savedRecords = await prisma.$transaction(
      attendanceRecords.map((entry) => {
        const attendanceDate = entry.date || new Date().toISOString().slice(0, 10);
        if (!entry.status) {
          return prisma.attendanceRecord.deleteMany({
            where: {
              studentId: entry.studentId,
              subjectId,
              gradingPeriod,
              academicYear: academicYear || getAcademicYear(),
              date: attendanceDate,
            },
          });
        }

        return prisma.attendanceRecord.upsert({
          where: {
            studentId_subjectId_gradingPeriod_academicYear_date: {
              studentId: entry.studentId,
              subjectId,
              gradingPeriod,
              academicYear: academicYear || getAcademicYear(),
              date: attendanceDate,
            },
          },
          create: {
            studentId: entry.studentId,
            subjectId,
            sectionId,
            teacherId: teacher.id,
            gradingPeriod,
            academicYear: academicYear || getAcademicYear(),
            date: attendanceDate,
            status: entry.status,
            remarks: entry.remarks || null,
          },
          update: {
            sectionId,
            teacherId: teacher.id,
            status: entry.status,
            date: attendanceDate,
            remarks: entry.remarks || null,
          },
        });
      })
    );

    console.log("Attendance records saved successfully:", savedRecords.length);
    return NextResponse.json({ records: savedRecords, count: savedRecords.length }, { status: 200 });
  } catch (error) {
    console.error("Teacher attendance save error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: "Failed to save attendance: " + errorMessage }, { status: 500 });
  }
}
