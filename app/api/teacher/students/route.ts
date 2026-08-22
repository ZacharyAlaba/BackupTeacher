import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/studentIdGenerator";

// Lets a teacher add a student straight into their class list; the record is the
// same Student/User row the admin Students page reads, so both stay in sync.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, sectionId, subjectId } = await request.json();

    if (!name || !email || !sectionId) {
      return NextResponse.json({ error: "Name, email and section are required" }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const teacherSchedule = await prisma.scheduleBlock.findFirst({
      where: { teacherId: teacher.id, sectionId, ...(subjectId ? { subjectId } : {}) },
    });
    if (!teacherSchedule) {
      return NextResponse.json({ error: "You don't teach this section" }, { status: 403 });
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }

    const studentId = await generateStudentId(section.gradeLevel);
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword, role: "STUDENT" },
    });

    const student = await prisma.student.create({
      data: {
        studentId,
        gradeLevel: section.gradeLevel,
        sectionId,
        userId: user.id,
      },
    });

    if (subjectId) {
      await prisma.subjectStudent.create({
        data: { studentId: student.id, subjectId, sectionId, teacherId: teacher.id },
      });
    }

    return NextResponse.json(
      {
        id: student.id,
        studentId: student.studentId,
        name: user.name,
        email: user.email,
        tempPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add student:", error);
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 });
  }
}
