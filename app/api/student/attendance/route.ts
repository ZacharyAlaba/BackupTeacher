import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { name: true, email: true } },
        section: true,
      },
    });

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const attendance = await prisma.attendanceRecord.findMany({
      where: {
        studentId: student.id,
        sectionId: student.sectionId,
        subject: {
          scheduleBlocks: {
            some: { sectionId: student.sectionId },
          },
        },
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        section: true,
      },
      orderBy: [
        { gradingPeriod: "asc" },
        { updatedAt: "desc" },
      ],
    });

    return NextResponse.json({
      studentId: student.studentId,
      name: student.user.name,
      email: student.user.email,
      gradeLevel: student.gradeLevel,
      section: student.section,
      attendance,
    });
  } catch (error) {
    console.error("Student attendance fetch error:", error);
    return NextResponse.json({ message: "Failed to load attendance" }, { status: 500 });
  }
}
