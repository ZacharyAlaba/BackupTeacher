import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rooms = await prisma.room.findMany({
      include: { section: { select: { id: true, name: true, gradeLevel: true, track: true } } },
      orderBy: [{ section: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Rooms fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, sectionId } = await request.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!normalizedName || !sectionId) {
      return NextResponse.json({ error: "Room name and section are required" }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: { name: normalizedName, sectionId },
      include: { section: { select: { id: true, name: true, gradeLevel: true, track: true } } },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That room already exists for this section" }, { status: 400 });
    }
    console.error("Room creation error:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, sectionId } = await request.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    if (!id || !normalizedName || !sectionId) {
      return NextResponse.json({ error: "Room, name, and section are required" }, { status: 400 });
    }

    const existingRoom = await prisma.room.findUnique({
      where: { id },
      select: { sectionId: true, _count: { select: { scheduleBlocks: true } } },
    });
    if (!existingRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (existingRoom.sectionId !== sectionId && existingRoom._count.scheduleBlocks > 0) {
      return NextResponse.json({ error: "A room with assignments cannot be moved to another section" }, { status: 400 });
    }

    const room = await prisma.$transaction(async (transaction) => {
      const updatedRoom = await transaction.room.update({
        where: { id },
        data: { name: normalizedName, sectionId },
        include: { section: { select: { id: true, name: true, gradeLevel: true, track: true } } },
      });
      await transaction.scheduleBlock.updateMany({ where: { roomId: id }, data: { room: normalizedName } });
      return updatedRoom;
    });

    return NextResponse.json(room);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That room already exists for this section" }, { status: 400 });
    }
    console.error("Room update error:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Room ID required" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.scheduleBlock.updateMany({ where: { roomId: id }, data: { room: null, roomId: null } }),
      prisma.room.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Room deletion error:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}