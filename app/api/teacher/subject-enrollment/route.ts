import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List all students enrolled in a teacher's subject within a section
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

    // Verify teacher has access to this subject/section
    const teacherSchedule = await prisma.scheduleBlock.findFirst({
      where: {
        teacher: { userId: session.user.id },
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

    // Get all students in the section and mark whether they are enrolled in this subject.
    // This keeps section-assigned students visible in teacher attendance even before
    // a subject-specific enrollment record is manually created.
    const sectionStudents = await prisma.student.findMany({
      where: {
        sectionId,
      },
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
            teacherId: teacherSchedule.teacherId,
          },
          select: {
            id: true,
            createdAt: true,
          },
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
      students: sectionStudents.map((student) => ({
        id: student.id,
        studentId: student.studentId,
        studentNumber: student.studentId,
        enrollmentId: student.subjectEnrollments[0]?.id ?? null,
        name: student.user.name,
        email: student.user.email,
        enrolledAt: student.subjectEnrollments[0]?.createdAt ?? null,
        isEnrolled: student.subjectEnrollments.length > 0,
      })),
      total: sectionStudents.length,
      enrolled: sectionStudents.filter((student) => student.subjectEnrollments.length > 0).length,
    });
  } catch (error) {
    console.error("Failed to fetch enrolled students:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrolled students" },
      { status: 500 }
    );
  }
}

/**
 * POST: Add a student to teacher's subject
 * Body: { studentId, subjectId, sectionId }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, subjectId, sectionId } = await request.json();

    if (!studentId || !subjectId || !sectionId) {
      return NextResponse.json(
        { error: "studentId, subjectId, and sectionId required" },
        { status: 400 }
      );
    }

    // Get teacher record
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher record not found" },
        { status: 404 }
      );
    }

    // Verify teacher teaches this subject/section
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

    // Verify student exists and is in the section
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    if (student.sectionId !== sectionId) {
      return NextResponse.json(
        { error: "Student is not in this section" },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existing = await prisma.subjectStudent.findFirst({
      where: {
        studentId,
        subjectId,
        sectionId,
        teacherId: teacher.id,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Student is already enrolled in this subject" },
        { status: 400 }
      );
    }

    // Create enrollment
    const enrollment = await prisma.subjectStudent.create({
      data: {
        studentId,
        subjectId,
        sectionId,
        teacherId: teacher.id,
      },
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
      },
    });

    return NextResponse.json(
      {
        success: true,
        enrollment: {
          enrollmentId: enrollment.id,
          studentId: enrollment.student.id,
          studentNumber: enrollment.student.studentId,
          name: enrollment.student.user.name,
          email: enrollment.student.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to add student to subject:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Student is already enrolled in this subject" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add student to subject" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove student from teacher's subject
 * Query param: enrollmentId
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId query param required" },
        { status: 400 }
      );
    }

    // Get teacher record
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher record not found" },
        { status: 404 }
      );
    }

    // Verify the enrollment belongs to this teacher
    const enrollment = await prisma.subjectStudent.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (enrollment.teacherId !== teacher.id) {
      return NextResponse.json(
        { error: "This enrollment does not belong to you" },
        { status: 403 }
      );
    }

    // Delete enrollment
    await prisma.subjectStudent.delete({
      where: { id: enrollmentId },
    });

    return NextResponse.json({
      success: true,
      message: "Student removed from subject",
    });
  } catch (error) {
    console.error("Failed to remove student from subject:", error);
    return NextResponse.json(
      { error: "Failed to remove student from subject" },
      { status: 500 }
    );
  }
}
