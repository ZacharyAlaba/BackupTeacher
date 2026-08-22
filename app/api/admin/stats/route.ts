import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [teacherCount, subjectCount, sectionCount, timeSlotCount, scheduleCount, studentCount] = await Promise.all([
      prisma.teacher.count(),
      prisma.subject.count(),
      prisma.section.count(),
      prisma.timeSlot.count(),
      prisma.scheduleBlock.count(),
      prisma.student.count(),
    ]);

    return NextResponse.json({
      teachers: teacherCount,
      subjects: subjectCount,
      sections: sectionCount,
      timeSlots: timeSlotCount,
      schedules: scheduleCount,
      students: studentCount,
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
