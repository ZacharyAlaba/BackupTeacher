import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateStudentId } from "@/lib/studentIdGenerator";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            gradeLevel: true,
            track: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedStudents = students.map((student) => ({
      id: student.id,
      studentId: student.studentId,
      name: student.user.name,
      email: student.user.email,
      gradeLevel: student.gradeLevel,
      sectionId: student.sectionId,
      section: student.section,
      createdAt: student.createdAt,
    }));

    return new Response(JSON.stringify(formattedStudents), { status: 200 });
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch students" }), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { studentId, name, email, password, gradeLevel, sectionId, dateOfBirth, gender, phone, address, guardianName, guardianPhone } = await request.json();

    if (!name || !email || !gradeLevel || !sectionId || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Generate student ID if not provided
    let finalStudentId = studentId;
    if (!finalStudentId) {
      finalStudentId = await generateStudentId(gradeLevel);
    }

    // Check if student ID already exists
    const existingStudentId = await prisma.student.findUnique({
      where: { studentId: finalStudentId },
    });

    if (existingStudentId) {
      return new Response(JSON.stringify({ error: "Student ID already exists" }), { status: 400 });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return new Response(JSON.stringify({ error: "Email already exists" }), { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "STUDENT",
      },
    });

    // Create student with profile fields
    const student = await prisma.student.create({
      data: {
        studentId: finalStudentId,
        gradeLevel,
        sectionId,
        userId: user.id,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        phone: phone || null,
        address: address || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
      },
      include: {
        section: true,
      },
    });

    return new Response(
      JSON.stringify({
        id: student.id,
        studentId: student.studentId,
        name: user.name,
        email: user.email,
        gradeLevel: student.gradeLevel,
        sectionId: student.sectionId,
        section: student.section,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        phone: student.phone,
        address: student.address,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create student:", error);
    return new Response(JSON.stringify({ error: "Failed to create student" }), { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { id, name, email, gradeLevel, sectionId, password, dateOfBirth, gender, phone, address, guardianName, guardianPhone } = await request.json();

    if (!id || !name || !email || !gradeLevel || !sectionId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return new Response(JSON.stringify({ error: "Student not found" }), { status: 404 });
    }

    // Check if email is being changed to an existing email
    if (email !== student.user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return new Response(JSON.stringify({ error: "Email already exists" }), { status: 400 });
      }
    }

    // Update user
    let updateData: any = {
      name,
      email,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: student.userId },
      data: updateData,
    });

    // Update student with profile fields
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        gradeLevel,
        sectionId,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(guardianName && { guardianName }),
        ...(guardianPhone && { guardianPhone }),
      },
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

    return new Response(
      JSON.stringify({
        id: updatedStudent.id,
        studentId: updatedStudent.studentId,
        name: updatedStudent.user.name,
        email: updatedStudent.user.email,
        gradeLevel: updatedStudent.gradeLevel,
        sectionId: updatedStudent.sectionId,
        section: updatedStudent.section,
        dateOfBirth: updatedStudent.dateOfBirth,
        gender: updatedStudent.gender,
        phone: updatedStudent.phone,
        address: updatedStudent.address,
        guardianName: updatedStudent.guardianName,
        guardianPhone: updatedStudent.guardianPhone,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update student:", error);
    return new Response(JSON.stringify({ error: "Failed to update student" }), { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing student ID" }), { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return new Response(JSON.stringify({ error: "Student not found" }), { status: 404 });
    }

    // Delete student (user will cascade delete)
    await prisma.student.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Failed to delete student:", error);
    return new Response(JSON.stringify({ error: "Failed to delete student" }), { status: 500 });
  }
}
