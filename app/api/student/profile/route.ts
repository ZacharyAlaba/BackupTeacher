import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        section: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      studentId: student.studentId,
      gradeLevel: student.gradeLevel,
      sectionName: student.section.name,
      track: student.section.track,
      dateOfBirth: student.dateOfBirth?.toISOString().split("T")[0] ?? null,
      gender: student.gender,
      phone: student.phone,
      address: student.address,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
    });
  } catch (error) {
    console.error("Failed to fetch student profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// Students can only fill in their own contact/personal details here -
// name, email, studentId, section and grade stay admin/teacher managed.
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dateOfBirth, gender, phone, address, guardianName, guardianPhone } = await request.json();

    if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { userId: session.user.id },
      data: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
      },
    });

    return NextResponse.json({
      dateOfBirth: student.dateOfBirth?.toISOString().split("T")[0] ?? null,
      gender: student.gender,
      phone: student.phone,
      address: student.address,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
    });
  } catch (error) {
    console.error("Failed to update student profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
