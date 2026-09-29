import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTeacherId } from "@/lib/teacherIdGenerator";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword } = body as {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    };

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { message: "All fields are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match." },
        { status: 400 }
      );
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { message: "Email is already registered." },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "TEACHER",
        },
      });

      await prisma.teacher.create({
        data: {
          teacherId: await generateTeacherId(),
          userId: user.id,
        },
      });

      return NextResponse.json({ message: "Signup successful." }, { status: 201 });
    } catch (dbError) {
      console.error("Database error during signup:", dbError);
      return NextResponse.json(
        { message: "Teacher registration requires a database connection. Please contact the administrator to set up the database first." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
