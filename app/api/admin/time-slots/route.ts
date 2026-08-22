import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

type TimeSlotRecord = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  createdAt?: Date | null;
  updatedAt?: Date;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeTimeSlot(slot: { day: string; startTime: string; endTime: string }) {
  return `${slot.day}:${slot.startTime}:${slot.endTime}`;
}

function sortTimeSlots<T extends { day: string; startTime: string }>(slots: T[]): T[] {
  return slots.sort((a, b) => {
    const dayA = daysOrder.indexOf(a.day);
    const dayB = daysOrder.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return Number(a.startTime.replace(":", "")) - Number(b.startTime.replace(":", ""));
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let timeSlots: TimeSlotRecord[] = await prisma.timeSlot.findMany({
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    let csvTimeSlots: TimeSlotRecord[] = [];
    try {
      csvTimeSlots = await loadTimeSlotsFromCsv();
    } catch (csvErr) {
      console.error("Failed to load time slots from CSV:", getErrorMessage(csvErr));
    }

    if (timeSlots.length === 0) {
      timeSlots = csvTimeSlots;
    } else if (csvTimeSlots.length > 0) {
      const existingKeys = new Set(timeSlots.map(normalizeTimeSlot));
      csvTimeSlots.forEach((slot) => {
        if (!existingKeys.has(normalizeTimeSlot(slot))) {
          timeSlots.push(slot);
        }
      });
      timeSlots = sortTimeSlots(timeSlots);
    }

    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error("TimeSlots fetch error:", error);
    try {
      const timeSlots = await loadTimeSlotsFromCsv();
      return NextResponse.json(timeSlots);
    } catch (csvError) {
      console.error("TimeSlots CSV fallback error:", csvError);
      return NextResponse.json([]);
    }
  }
}

async function loadTimeSlotsFromCsv(): Promise<TimeSlotRecord[]> {
  const csvPath = path.resolve(process.cwd(), "..", "data", "time_slots.csv");
  const raw = await fs.readFile(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line, index) => {
    const [day, startTime, endTime] = line.split(",").map((value) => value.trim());
    return {
      id: `csv-time-slot-${index + 1}`,
      day,
      startTime,
      endTime,
      createdAt: null,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { day, startTime, endTime } = await request.json();

    if (!day || !startTime || !endTime) {
      return NextResponse.json({ error: "Day, startTime, and endTime required" }, { status: 400 });
    }

    const timeSlot = await prisma.timeSlot.create({
      data: { day, startTime, endTime },
    });

    return NextResponse.json(timeSlot, { status: 201 });
  } catch (error) {
    console.error("TimeSlot creation error:", error);
    return NextResponse.json({ error: "Failed to create time slot" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, day, startTime, endTime } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "TimeSlot ID required" }, { status: 400 });
    }

    const timeSlot = await prisma.timeSlot.update({
      where: { id },
      data: {
        ...(day && { day }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
      },
    });

    return NextResponse.json(timeSlot);
  } catch (error) {
    console.error("TimeSlot update error:", error);
    return NextResponse.json({ error: "Failed to update time slot" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "TimeSlot ID required" }, { status: 400 });
    }

    await prisma.timeSlot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TimeSlot deletion error:", error);
    return NextResponse.json({ error: "Failed to delete time slot" }, { status: 500 });
  }
}
