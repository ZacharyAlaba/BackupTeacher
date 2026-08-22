import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

function normalizeSectionKey(section: { name: string; gradeLevel: string; track: string }) {
  const name = (section.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const grade = (section.gradeLevel || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const track = (section.track || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `${grade}:${track}:${name}`;
}

async function loadSectionsFromCsv() {
  const csvPath = path.resolve(process.cwd(), "..", "data", "sections.csv");
  const txt = await fs.readFile(csvPath, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line, index) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const obj: any = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    return {
      id: `csv-section-${index}`,
      name: obj.name || obj.section || obj[headers[0]] || "",
      gradeLevel: obj.grade_level || obj.gradeLevel || obj.grade || "",
      track: obj.track || "",
      createdAt: null,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (err: unknown) {
      console.error(
        "getServerSession error in sections route:",
        err instanceof Error ? err.message : JSON.stringify(err)
      );
      session = null;
    }

    const demoEnabled = process.env.DEMO_AUTH_ENABLED === "true";

    if (!session || session.user?.role !== "ADMIN") {
      if (!demoEnabled) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // continue in demo mode to read CSV fallback
    }
    let sections: Array<{ id: string | null; name: string; gradeLevel: string; track: string; createdAt: Date | null }> = [];
    let csvSections: Array<{ id: string | null; name: string; gradeLevel: string; track: string; createdAt: Date | null }> = [];

    try {
      sections = await prisma.section.findMany({ orderBy: { createdAt: "desc" } });
    } catch (dbErr: unknown) {
      console.error(
        "Prisma error fetching sections, falling back to CSV:",
        dbErr instanceof Error ? dbErr.message : JSON.stringify(dbErr)
      );
      sections = [];
    }

    try {
      csvSections = await loadSectionsFromCsv();
      const existingKeys = new Set(sections.map(normalizeSectionKey));
      sections = sections.concat(
        csvSections.filter((csv) => !existingKeys.has(normalizeSectionKey(csv)))
      );
    } catch (csvErr: unknown) {
      console.error(
        "Failed to load sections from CSV:",
        csvErr instanceof Error ? csvErr.message : JSON.stringify(csvErr)
      );
    }

    // If no sections in DB or merged sections are still empty, use CSV fallback
    if (!sections || sections.length === 0) {
      return NextResponse.json(csvSections);
    }

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Sections fetch error:", error);
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

    if (!name || !gradeLevel || !track) {
      return NextResponse.json({ error: "Name, gradeLevel, and track required" }, { status: 400 });
    }

    const section = await prisma.section.create({
      data: { name, gradeLevel, track },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("Section creation error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
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
      return NextResponse.json({ error: "Section ID required" }, { status: 400 });
    }

    const section = await prisma.section.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(gradeLevel && { gradeLevel }),
        ...(track && { track }),
      },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error("Section update error:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
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
      return NextResponse.json({ error: "Section ID required" }, { status: 400 });
    }

    await prisma.section.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Section deletion error:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
