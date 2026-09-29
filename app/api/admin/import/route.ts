import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSubjectName } from "@/lib/normalizeSubjectName";
import { generateTeacherId } from "@/lib/teacherIdGenerator";
import { validateSectionSubjectPlacement, WEEKDAYS } from "@/lib/schedulingRules";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").map((line) => line.trim()).filter((line) => line);

    let currentSection = "";
    let imported = { teachers: 0, subjects: 0, sections: 0, timeSlots: 0, schedules: 0 };
    let skipped = { constraints: 0, policy: 0 };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === "TEACHERS") {
        currentSection = "TEACHERS";
        i++; // skip header
        continue;
      }

      if (line === "SUBJECTS") {
        currentSection = "SUBJECTS";
        i++;
        continue;
      }

      if (line === "SECTIONS") {
        currentSection = "SECTIONS";
        i++;
        continue;
      }

      if (line === "TIME_SLOTS") {
        currentSection = "TIME_SLOTS";
        i++;
        continue;
      }

      if (line === "SCHEDULES") {
        currentSection = "SCHEDULES";
        i++;
        continue;
      }

      if (!line || line.startsWith("EXPORT_DATA") || line.startsWith("Libertad")) {
        continue;
      }

      try {
        if (currentSection === "TEACHERS") {
          const [id, email, name] = parseCSVLine(line);
          const existing = await prisma.teacher.findUnique({ where: { id } });
          if (!existing) {
            await prisma.user.create({
              data: {
                email,
                name,
                password: "defaultPassword123",
                role: "TEACHER",
                teacher: { create: { teacherId: await generateTeacherId() } },
              },
            });
            imported.teachers++;
          }
        } else if (currentSection === "SUBJECTS") {
          const [id, name, gradeLevel, track] = parseCSVLine(line);
          const normalizedName = normalizeSubjectName(name);
          const existing = await prisma.subject.findUnique({ where: { id } });
          if (!existing) {
            await prisma.subject.create({
              data: { id, name: normalizedName, gradeLevel, track: track || undefined },
            });
            imported.subjects++;
          }
        } else if (currentSection === "SECTIONS") {
          const [id, name, gradeLevel, track] = parseCSVLine(line);
          const existing = await prisma.section.findUnique({ where: { id } });
          if (!existing) {
            await prisma.section.create({
              data: { id, name, gradeLevel, track },
            });
            imported.sections++;
          }
        } else if (currentSection === "TIME_SLOTS") {
          const [id, day, startTime, endTime] = parseCSVLine(line);
          const existing = await prisma.timeSlot.findUnique({ where: { id } });
          if (!existing) {
            await prisma.timeSlot.create({
              data: { id, day, startTime, endTime },
            });
            imported.timeSlots++;
          }
        } else if (currentSection === "SCHEDULES") {
          const [teacherEmail, subject, section, day, startTime, endTime, room] = parseCSVLine(line);
          const normalizedSubject = normalizeSubjectName(subject);
          
          const teacher = await prisma.teacher.findFirst({
            where: { user: { email: teacherEmail } },
          });
          const subjectObj = await prisma.subject.findFirst({
            where: { name: normalizedSubject },
          });
          const sectionObj = await prisma.section.findFirst({
            where: { name: section },
          });
          const timeSlot = await prisma.timeSlot.findFirst({
            where: { day, startTime, endTime },
          });

          if (teacher && subjectObj && sectionObj && timeSlot) {
            const sectionSubjectSchedules = await prisma.scheduleBlock.findMany({
              where: {
                sectionId: sectionObj.id,
                subjectId: subjectObj.id,
              },
              include: {
                timeSlot: true,
              },
            });

            const placementValidation = validateSectionSubjectPlacement(
              subjectObj.name,
              sectionSubjectSchedules.map((s: any) => ({ day: s.timeSlot.day })),
              timeSlot.day
            );

            if (!placementValidation.valid) {
              skipped.policy++;
              continue;
            }

            const teacherSchedules = await prisma.scheduleBlock.findMany({
              where: { teacherId: teacher.id },
              include: { timeSlot: true },
            });

            const daysUsed = new Set(teacherSchedules.map((s: any) => s.timeSlot.day));
            daysUsed.add(timeSlot.day);
            const hasDayOff = WEEKDAYS.some((weekday) => !daysUsed.has(weekday));

            if (!hasDayOff) {
              skipped.policy++;
              continue;
            }

            try {
              await prisma.scheduleBlock.create({
                data: {
                  teacherId: teacher.id,
                  subjectId: subjectObj.id,
                  sectionId: sectionObj.id,
                  timeSlotId: timeSlot.id,
                  room: room || undefined,
                },
              });
              imported.schedules++;
            } catch (e) {
              // Skip duplicate or constraint violation
              skipped.constraints++;
            }
          }
        }
      } catch (error) {
        console.error(`Error importing ${currentSection}:`, error);
      }
    }

    return NextResponse.json({
      message: "Import completed",
      imported,
      skipped,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
