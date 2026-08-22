import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List all students in a section with their enrollment status in a subject
 * Query params: subjectId, sectionId
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const sectionId = searchParams.get("sectionId");

    if (!subjectId || !sectionId) {
      return NextResponse.json(
        { error: "subjectId and sectionId query params required" },
        { status: 400 }
      );
    }

    // Verify teacher teaches this subject/section
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher record not found" },
        { status: 404 }
      );
    }

    const teacherSchedule = await prisma.scheduleBlock.findFirst({
      where: {
        teacherId: teacher.id,
        subjectId,
        sectionId,
      },
    });

    if (!teacherSchedule) {
      return NextResponse.json(
        { error: "You don't teach this subject in this section" },
        { status: 403 }
      );
    }

    // Get all students in section
    const allStudents = await prisma.student.findMany({
      where: { sectionId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        subjectEnrollments: {
          where: {
            subjectId,
            teacherId: teacher.id,
          },
          select: { id: true },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      subjectId,
      sectionId,
      students: allStudents.map((student) => ({
        studentId: student.id,
        studentNumber: student.studentId,
        name: student.user.name,
        email: student.user.email,
        isEnrolled: student.subjectEnrollments.length > 0,
        enrollmentId: student.subjectEnrollments[0]?.id || null,
      })),
      total: allStudents.length,
      enrolled: allStudents.filter((s) => s.subjectEnrollments.length > 0)
        .length,
    });
  } catch (error) {
    console.error("Failed to fetch section students:", error);
    return NextResponse.json(
      { error: "Failed to fetch section students" },
      { status: 500 }
    );
  }
}
