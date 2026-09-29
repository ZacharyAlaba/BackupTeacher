import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function generateTeacherId() {
  const year = new Date().getFullYear();
  const prefix = `${year}-T-`;
  const lastTeacher = await prisma.teacher.findFirst({
    where: { teacherId: { startsWith: prefix } },
    orderBy: { teacherId: "desc" },
  });
  const lastNumber = lastTeacher ? Number(lastTeacher.teacherId.split("-").pop()) || 0 : 0;
  return `${prefix}${String(lastNumber + 1).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teachers = await prisma.teacher.findMany({
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          qualifications: { select: { subjectId: true } },
        },
      orderBy: { createdAt: "desc" },
    });

    const teachersWithDisplayIds = teachers.map((teacher) => ({
      ...teacher,
      teacherId: `T-${teacher.id.slice(-6).toUpperCase()}`,
    }));

    return NextResponse.json(teachersWithDisplayIds);
  } catch (error) {
    console.error("Teachers fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, firstName, lastName, email, password, dateOfBirth, gender, phone, address } = await request.json();
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || name;

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "First name, last name, email, and password required" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user first
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        password: hashedPassword,
        role: "TEACHER",
      },
    });

    // Create teacher with profile fields
    const teacher = await prisma.teacher.create({
      data: {
        teacherId: await generateTeacherId(),
        userId: user.id,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
      },
    });

    return NextResponse.json(
      {
        ...teacher,
        user: {
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Teacher creation error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create teacher" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, firstName, lastName, email, dateOfBirth, gender, phone, address } = await request.json();
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || name;

    if (!id) {
      return NextResponse.json({ error: "Teacher ID required" }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Update user details
    await prisma.user.update({
      where: { id: teacher.userId },
      data: {
        ...(fullName && { name: fullName }),
        ...(email && { email }),
      },
    });

    // Update teacher profile fields
    await prisma.teacher.update({
      where: { id },
      data: {
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(phone && { phone }),
        ...(address && { address }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher update error:", error);
    return NextResponse.json({ error: "Failed to update teacher" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Teacher ID required" }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    // Delete user (cascade will delete teacher)
    await prisma.user.delete({
      where: { id: teacher.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher deletion error:", error);
    return NextResponse.json({ error: "Failed to delete teacher" }, { status: 500 });
  }
}
