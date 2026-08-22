#!/usr/bin/env node
/**
 * Test student creation directly
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testCreateStudent() {
  try {
    console.log("🧪 Testing student creation...\n");

    // 1. Check if ARISTOTLE section exists
    const section = await prisma.section.findFirst({
      where: { name: "ARISTOTLE" },
    });

    if (!section) {
      console.error("❌ Section ARISTOTLE not found!");
      console.log("Available sections:");
      const sections = await prisma.section.findMany({
        select: { id: true, name: true },
        take: 5,
      });
      console.log(sections);
      process.exit(1);
    }

    console.log("✅ Section found:", section.name);

    // 2. Create user
    const hashedPassword = await bcrypt.hash("testpass123", 10);
    const user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}`,
        email: `student_${Date.now()}@school.edu`,
        password: hashedPassword,
        name: "Test Student",
        role: "STUDENT",
      },
    });

    console.log("✅ User created:", user.email);

    // 3. Create student
    const student = await prisma.student.create({
      data: {
        studentId: `STU${Date.now()}`,
        gradeLevel: "G11",
        sectionId: section.id,
        userId: user.id,
      },
      include: {
        user: true,
        section: true,
      },
    });

    console.log("✅ Student created successfully!");
    console.log({
      studentId: student.studentId,
      email: student.user.email,
      section: student.section.name,
    });
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Details:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateStudent();
