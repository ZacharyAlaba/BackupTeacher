import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeSubjectName } from "@/lib/normalizeSubjectName";
import fs from "fs";
import path from "path";

function loadSubjectsFromCSV() {
  try {
    const csvPath = path.join(process.cwd(), "..", "data", "subjects.csv");
    if (!fs.existsSync(csvPath)) {
      console.log("CSV file not found at:", csvPath);
      return [];
    }

    const raw = fs.readFileSync(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) return [];

    const subjects = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",");
      const gradeLevel = (parts[0] || "").trim();
      const track = (parts[1] || "").trim();
      const name = parts.slice(2).join(",").trim();

      if (!gradeLevel || !name) continue;

      subjects.push({
        id: `csv-${i}`,
        gradeLevel,
        track: track || null,
        name: normalizeSubjectName(name),
        createdAt: new Date(),
      });
    }

    return subjects;
  } catch (error) {
    console.error("Failed to load CSV:", error);
    return [];
  }
}

function makeScheduleKey(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const subjects = await prisma.subject.findMany({
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        subjects.map((subject: any) => ({
          ...subject,
          name: normalizeSubjectName(subject.name),
        }))
      );
    } catch (dbError) {
      console.log("Database unavailable, loading from CSV");
      const csvSubjects = loadSubjectsFromCSV();
      return NextResponse.json(csvSubjects);
    }
  } catch (error) {
    console.error("Subjects fetch error:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, gradeLevel, track } = await request.json();

    if (!name || !gradeLevel) {
      return NextResponse.json({ error: "Name and gradeLevel required" }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: { name, scheduleKey: makeScheduleKey(name), gradeLevel, track },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    console.error("Subject creation error:", error);
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, gradeLevel, track } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(gradeLevel && { gradeLevel }),
        ...(track && { track }),
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    console.error("Subject update error:", error);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
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
      return NextResponse.json({ error: "Subject ID required" }, { status: 400 });
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subject deletion error:", error);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
