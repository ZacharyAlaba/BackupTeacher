/**
 * Supabase Seed Script
 * Populates Supabase database with initial data from CSV files
 * Run: npx tsx scripts/seed-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedDatabase() {
  try {
    console.log("🌱 Starting Supabase seed...\n");

    // 1. Create admin user
    console.log("📝 Creating admin user...");
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminUserId = nanoid();

    const { error: adminUserError } = await supabase
      .from("User")
      .upsert(
        [
          {
            id: adminUserId,
            email: "admin@school.edu",
            password: adminPassword,
            name: "Admin User",
            role: "ADMIN",
          },
        ],
        { onConflict: "email" }
      );

    if (adminUserError) {
      console.error("❌ Error creating admin user:", adminUserError);
    } else {
      console.log("✅ Admin user created");
    }

    // 2. Load and seed TimeSlots from CSV
    console.log("\n📝 Loading time slots from CSV...");
    const timeSlotsCsv = readFileSync("data/time_slots.csv", "utf-8");
    const timeSlots = parse(timeSlotsCsv, {
      columns: true,
      skip_empty_lines: true,
    });

    const timeSlotRecords = timeSlots.map((row: any) => ({
      id: nanoid(),
      day: row.day,
      startTime: row.start_time,
      endTime: row.end_time,
    }));

    const { error: timeSlotError } = await supabase
      .from("TimeSlot")
      .upsert(timeSlotRecords, {
        onConflict: "day,startTime,endTime",
      });

    if (timeSlotError) {
      console.error("❌ Error seeding time slots:", timeSlotError);
    } else {
      console.log(`✅ Seeded ${timeSlotRecords.length} time slots`);
    }

    // 3. Load and seed Sections from CSV
    console.log("\n📝 Loading sections from CSV...");
    const sectionsCsv = readFileSync("data/sections.csv", "utf-8");
    const sections = parse(sectionsCsv, {
      columns: true,
      skip_empty_lines: true,
    });

    const sectionRecords = sections.map((row: any) => ({
      id: nanoid(),
      name: row.name,
      gradeLevel: row.grade_level,
      track: row.track,
    }));

    const { error: sectionError } = await supabase
      .from("Section")
      .upsert(sectionRecords, {
        onConflict: "name",
      });

    if (sectionError) {
      console.error("❌ Error seeding sections:", sectionError);
    } else {
      console.log(`✅ Seeded ${sectionRecords.length} sections`);
    }

    // 4. Load and seed Subjects from CSV
    console.log("\n📝 Loading subjects from CSV...");
    const subjectsCsv = readFileSync("data/subjects.csv", "utf-8");
    const subjects = parse(subjectsCsv, {
      columns: true,
      skip_empty_lines: true,
    });

    const subjectRecords = subjects.map((row: any) => ({
      id: nanoid(),
      name: row.name,
      gradeLevel: row.grade_level,
      track: row.track || null,
    }));

    const { error: subjectError } = await supabase
      .from("Subject")
      .upsert(subjectRecords, {
        onConflict: "name,gradeLevel",
      });

    if (subjectError) {
      console.error("❌ Error seeding subjects:", subjectError);
    } else {
      console.log(`✅ Seeded ${subjectRecords.length} subjects`);
    }

    // 5. Create sample teacher
    console.log("\n📝 Creating sample teacher...");
    const teacherUserId = nanoid();
    const teacherPassword = await bcrypt.hash("teacher123", 10);

    const { error: teacherUserError } = await supabase
      .from("User")
      .insert([
        {
          id: teacherUserId,
          email: "teacher@school.edu",
          password: teacherPassword,
          name: "John Teacher",
          role: "TEACHER",
        },
      ]);

    if (teacherUserError) {
      console.error("❌ Error creating teacher user:", teacherUserError);
    } else {
      const { error: teacherError } = await supabase
        .from("Teacher")
        .insert([
          {
            id: nanoid(),
            userId: teacherUserId,
          },
        ]);

      if (teacherError) {
        console.error("❌ Error creating teacher:", teacherError);
      } else {
        console.log("✅ Sample teacher created");
      }
    }

    // 6. Create sample student
    console.log("\n📝 Creating sample student...");
    const studentUserId = nanoid();
    const studentPassword = await bcrypt.hash("student123", 10);

    // Get first section
    const { data: firstSection } = await supabase
      .from("Section")
      .select("id")
      .limit(1)
      .single();

    if (firstSection) {
      const { error: studentUserError } = await supabase
        .from("User")
        .insert([
          {
            id: studentUserId,
            email: "student@school.edu",
            password: studentPassword,
            name: "Jane Student",
            role: "STUDENT",
          },
        ]);

      if (studentUserError) {
        console.error("❌ Error creating student user:", studentUserError);
      } else {
        const { error: studentError } = await supabase
          .from("Student")
          .insert([
            {
              id: nanoid(),
              userId: studentUserId,
              studentId: "2024-0001",
              gradeLevel: "G11",
              sectionId: firstSection.id,
            },
          ]);

        if (studentError) {
          console.error("❌ Error creating student:", studentError);
        } else {
          console.log("✅ Sample student created");
        }
      }
    }

    console.log("\n✅ Seed completed successfully!\n");
    console.log("Test credentials:");
    console.log("  Admin: admin@school.edu / admin123");
    console.log("  Teacher: teacher@school.edu / teacher123");
    console.log("  Student: student@school.edu / student123");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedDatabase();
