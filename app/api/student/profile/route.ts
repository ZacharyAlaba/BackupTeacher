import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
