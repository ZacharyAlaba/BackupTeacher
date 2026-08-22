#!/usr/bin/env node
/**
 * Direct database seed using Prisma
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...\n");

    // 1. Create admin user if doesn't exist
    const adminExists = await prisma.user.findUnique({
      where: { email: "admin@school.edu" },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await prisma.user.create({
        data: {
          id: "admin_001",
          email: "admin@school.edu",
          password: hashedPassword,
          name: "Admin User",
          role: "ADMIN",
        },
      });
      console.log("✅ Admin user created");
    } else {
      console.log("⏭️  Admin user already exists");
    }

    // 2. Load and seed sections
    const sectionsData = readFileSync("../data/sections.csv", "utf-8");
    const sections = parse(sectionsData, {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{ grade_level: string; name: string; track: string }>;

    for (const section of sections) {
      const exists = await prisma.section.findFirst({
        where: {
          name: section.name.trim(),
          gradeLevel: section.grade_level,
        },
      });

      if (!exists) {
        await prisma.section.create({
          data: {
            name: section.name.trim(),
            gradeLevel: section.grade_level,
            track: section.track,
          },
        });
        console.log(`  ✅ Section: ${section.name.trim()}`);
      }
    }
    console.log("✅ Sections seeded\n");

    // 3. Load and seed subjects
    const subjectsData = readFileSync("../data/subjects.csv", "utf-8");
    const subjects = parse(subjectsData, {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{ name: string; grade_level: string; track?: string }>;

    for (const subject of subjects) {
      const exists = await prisma.subject.findFirst({
        where: {
          name: subject.name.trim(),
          gradeLevel: subject.grade_level,
        },
      });

      if (!exists) {
        await prisma.subject.create({
          data: {
            name: subject.name.trim(),
            gradeLevel: subject.grade_level,
            track: subject.track?.trim() || null,
          },
        });
        console.log(`  ✅ Subject: ${subject.name.trim()}`);
      }
    }
    console.log("✅ Subjects seeded\n");

    // 4. Load and seed time slots
    const timeSlotsData = readFileSync("../data/time_slots.csv", "utf-8");
    const timeSlots = parse(timeSlotsData, {
      columns: true,
      skip_empty_lines: true,
    }) as Array<{ day: string; start_time: string; end_time: string }>;

    for (const slot of timeSlots) {
      const exists = await prisma.timeSlot.findFirst({
        where: {
          day: slot.day.trim(),
          startTime: slot.start_time.trim(),
        },
      });

      if (!exists) {
        await prisma.timeSlot.create({
          data: {
            day: slot.day.trim(),
            startTime: slot.start_time.trim(),
            endTime: slot.end_time.trim(),
          },
        });
        console.log(`  ✅ TimeSlot: ${slot.day.trim()} ${slot.start_time.trim()}`);
      }
    }
    console.log("✅ Time slots seeded\n");

    console.log("✅ Database seed completed successfully!");
  } catch (error: any) {
    console.error("❌ Seed error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();
