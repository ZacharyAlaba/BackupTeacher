import prisma from "@/lib/prisma";
import { generateTeacherId } from "@/lib/teacherIdGenerator";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  console.log("✅ Created admin user:", admin.email);

  // Create teacher user
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      email: "teacher@example.com",
      password: teacherPassword,
      name: "Teacher User",
      role: "TEACHER",
    },
  });

  // Create teacher profile
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      teacherId: await generateTeacherId(),
      userId: teacherUser.id,
    },
  });

  console.log("✅ Created teacher user:", teacherUser.email);

  await seedTimeSlotsFromCsv();

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("Admin: admin@example.com / admin123");
  console.log("Teacher: teacher@example.com / teacher123");
}

async function seedTimeSlotsFromCsv() {
  const csvPath = path.resolve(process.cwd(), "..", "data", "time_slots.csv");

  try {
    const raw = await fs.readFile(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    if (lines.length <= 1) {
      console.log("ℹ️ No time slot rows found in time_slots.csv");
      return;
    }

    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const [day, startTime, endTime] = lines[i].split(",").map((value) => value.trim());

      if (!day || !startTime || !endTime) {
        continue;
      }

      const existing = await prisma.timeSlot.findFirst({
        where: { day, startTime, endTime },
      });

      if (!existing) {
        await prisma.timeSlot.create({ data: { day, startTime, endTime } });
        imported++;
      }
    }

    console.log(`✅ Seeded ${imported} time slots from time_slots.csv`);
  } catch (error) {
    console.warn("⚠️ Skipping time slot seed:", error instanceof Error ? error.message : error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
