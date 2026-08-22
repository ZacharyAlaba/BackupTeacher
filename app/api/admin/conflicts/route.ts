import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ScheduleWithRelations = Prisma.ScheduleBlockGetPayload<{
  include: {
    teacher: { include: { user: true } };
    subject: true;
    section: true;
    timeSlot: true;
  };
}>;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules: ScheduleWithRelations[] = await prisma.scheduleBlock.findMany({
      include: {
        teacher: { include: { user: true } },
        subject: true,
        section: true,
        timeSlot: true,
      },
    });

    const conflicts: any[] = [];
    const teacherWorkload: { [key: string]: number } = {};

    // Check for teacher conflicts
    for (const schedule of schedules) {
      const teacherId = schedule.teacherId;
      const timeSlotId = schedule.timeSlotId;

      // Count workload
      if (!teacherWorkload[teacherId]) {
        teacherWorkload[teacherId] = 0;
      }
      teacherWorkload[teacherId]++;

      // Find other schedules at same time for same teacher
      const duplicates = schedules.filter(
        (s) =>
          s.teacherId === teacherId &&
          s.timeSlotId === timeSlotId &&
          s.id !== schedule.id
      );

      if (duplicates.length > 0) {
        conflicts.push({
          type: "TEACHER_CONFLICT",
          description: `${schedule.teacher.user.name} has overlapping classes`,
          schedules: [schedule, ...duplicates].map((s) => ({
            id: s.id,
            teacher: s.teacher.user.name,
            subject: s.subject.name,
            section: s.section.name,
            time: `${s.timeSlot.day} ${s.timeSlot.startTime}-${s.timeSlot.endTime}`,
          })),
        });
      }
    }

    // Check for section conflicts
    for (const schedule of schedules) {
      const sectionId = schedule.sectionId;
      const timeSlotId = schedule.timeSlotId;

      const duplicates = schedules.filter(
        (s) =>
          s.sectionId === sectionId &&
          s.timeSlotId === timeSlotId &&
          s.id !== schedule.id
      );

      if (duplicates.length > 0) {
        conflicts.push({
          type: "SECTION_CONFLICT",
          description: `${schedule.section.name} has multiple teachers at same time`,
          schedules: [schedule, ...duplicates].map((s) => ({
            id: s.id,
            teacher: s.teacher.user.name,
            subject: s.subject.name,
            section: s.section.name,
            time: `${s.timeSlot.day} ${s.timeSlot.startTime}-${s.timeSlot.endTime}`,
          })),
        });
      }
    }

    // Find overloaded teachers (more than 24 periods/week)
    const overloadedTeachers = Object.entries(teacherWorkload)
      .filter(([_, count]) => (count as number) > 24)
      .map(([teacherId, count]) => {
        const teacher = schedules.find((s) => s.teacherId === teacherId)?.teacher;
        return {
          type: "OVERLOAD_WARNING",
          description: `${teacher?.user.name} has ${count} class periods (recommended: max 24)`,
          teacherId,
          periods: count,
        };
      });

    // Remove duplicate conflicts
    const uniqueConflicts = Array.from(
      new Map(conflicts.map((c) => [JSON.stringify(c), c])).values()
    );

    return NextResponse.json({
      conflicts: uniqueConflicts,
      warnings: overloadedTeachers,
      totalSchedules: schedules.length,
      affectedTeachers: Object.keys(teacherWorkload).length,
    });
  } catch (error) {
    console.error("Conflict detection error:", error);
    return NextResponse.json({ error: "Failed to detect conflicts" }, { status: 500 });
  }
}
