import { getServerSession } from "next-auth/next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type ScheduleWithRelations = Prisma.ScheduleBlockGetPayload<{
  include: {
    teacher: { include: { user: true } };
    subject: true;
    section: true;
    timeSlot: true;
  };
}>;

export async function GET() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (sessErr) {
    console.error('getServerSession error:', sessErr);
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session || session.user?.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all schedules with their details and creation time
    const schedules: ScheduleWithRelations[] = await prisma.scheduleBlock.findMany({
      include: {
        teacher: { include: { user: true } },
        subject: true,
        section: true,
        timeSlot: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format as audit log
    const auditLog = schedules.map((schedule) => ({
      id: schedule.id,
      action: "ASSIGNED",
      timestamp: schedule.createdAt,
      teacher: schedule.teacher?.user?.name ?? "Unknown",
      subject: schedule.subject?.name ?? "Unknown",
      section: schedule.section?.name ?? "Unknown",
      timeSlot:
        schedule.timeSlot
          ? `${schedule.timeSlot.day} ${schedule.timeSlot.startTime}-${schedule.timeSlot.endTime}`
          : "Unknown",
      room: schedule.room || "N/A",
      changes: null,
    }));

    return Response.json(auditLog);
  } catch (error) {
    console.error("Audit log error:", error);
    return Response.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
