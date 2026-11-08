import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const scheduleSelect = {
  id: true,
  teacherId: true,
  sectionId: true,
  timeSlotId: true,
  teacher: {
    select: {
      user: { select: { name: true } },
    },
  },
  subject: { select: { name: true } },
  section: { select: { name: true } },
  timeSlot: {
    select: {
      day: true,
      startTime: true,
      endTime: true,
    },
  },
} satisfies Prisma.ScheduleBlockSelect;

type ScheduleWithRelations = Prisma.ScheduleBlockGetPayload<{
  select: typeof scheduleSelect;
}>;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules: ScheduleWithRelations[] = await prisma.scheduleBlock.findMany({
      select: scheduleSelect,
    });

    type ConflictResult = {
      type: "TEACHER_CONFLICT" | "SECTION_CONFLICT";
      description: string;
      schedules: Array<{
        id: string;
        teacher: string;
        subject: string;
        section: string;
        time: string;
      }>;
    };
    const conflicts: ConflictResult[] = [];
    const teacherWorkload = new Map<string, number>();
    const teacherSlots = new Map<string, ScheduleWithRelations[]>();
    const sectionSlots = new Map<string, ScheduleWithRelations[]>();

    for (const schedule of schedules) {
      teacherWorkload.set(
        schedule.teacherId,
        (teacherWorkload.get(schedule.teacherId) ?? 0) + 1
      );

      const teacherKey = `${schedule.teacherId}:${schedule.timeSlotId}`;
      const teacherGroup = teacherSlots.get(teacherKey) ?? [];
      teacherGroup.push(schedule);
      teacherSlots.set(teacherKey, teacherGroup);

      const sectionKey = `${schedule.sectionId}:${schedule.timeSlotId}`;
      const sectionGroup = sectionSlots.get(sectionKey) ?? [];
      sectionGroup.push(schedule);
      sectionSlots.set(sectionKey, sectionGroup);
    }

    const toConflictSchedule = (schedule: ScheduleWithRelations) => ({
      id: schedule.id,
      teacher: schedule.teacher.user.name,
      subject: schedule.subject.name,
      section: schedule.section.name,
      time: `${schedule.timeSlot.day} ${schedule.timeSlot.startTime}-${schedule.timeSlot.endTime}`,
    });

    for (const group of Array.from(teacherSlots.values())) {
      if (group.length > 1) {
        conflicts.push({
          type: "TEACHER_CONFLICT",
          description: `${group[0].teacher.user.name} has overlapping classes`,
          schedules: group.map(toConflictSchedule),
        });
      }
    }

    for (const group of Array.from(sectionSlots.values())) {
      if (group.length > 1) {
        conflicts.push({
          type: "SECTION_CONFLICT",
          description: `${group[0].section.name} has multiple teachers at the same time`,
          schedules: group.map(toConflictSchedule),
        });
      }
    }

    // Find overloaded teachers (more than 24 periods/week)
    const overloadedTeachers = Array.from(teacherWorkload.entries())
      .filter(([, count]) => count > 24)
      .map(([teacherId, count]) => {
        const teacher = schedules.find((s) => s.teacherId === teacherId)?.teacher;
        return {
          type: "OVERLOAD_WARNING",
          description: `${teacher?.user.name} has ${count} class periods (recommended: max 24)`,
          teacherId,
          periods: count,
        };
      });

    return NextResponse.json({
      conflicts,
      warnings: overloadedTeachers,
      totalSchedules: schedules.length,
      affectedTeachers: teacherWorkload.size,
    });
  } catch (error) {
    console.error("Conflict detection error:", error);
    return NextResponse.json({ error: "Failed to detect conflicts" }, { status: 500 });
  }
}
