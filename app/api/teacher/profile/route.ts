import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: teacher.id,
      teacherId: teacher.teacherId,
      name: teacher.user.name,
      email: teacher.user.email,
      dateOfBirth: teacher.dateOfBirth?.toISOString().split("T")[0] ?? null,
      gender: teacher.gender,
      phone: teacher.phone,
      address: teacher.address,
    });
  } catch (error) {
    console.error("Failed to fetch teacher profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// Teachers can only fill in their own contact/personal details here -
// name and email stay admin managed.
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dateOfBirth, gender, phone, address } = await request.json();

    if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
      return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
    }

    const teacher = await prisma.teacher.update({
      where: { userId: session.user.id },
      data: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
      },
    });

    return NextResponse.json({
      dateOfBirth: teacher.dateOfBirth?.toISOString().split("T")[0] ?? null,
      gender: teacher.gender,
      phone: teacher.phone,
      address: teacher.address,
    });
  } catch (error) {
    console.error("Failed to update teacher profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
