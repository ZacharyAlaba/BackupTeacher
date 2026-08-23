import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStudentId } from "@/lib/studentIdGenerator";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

async function parseImportRows(file: File): Promise<string[][]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const content = await file.text();
    const records = parse(content, {
      skip_empty_lines: true,
      trim: true,
    }) as Array<string[]>;

    return records.map((row) => row.map((value) => String(value).trim()));
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as Array<Array<string | number | boolean | null>>;

    return rows.map((row) => row.map((value) => String(value ?? "").trim()));
  }

  throw new Error("Only CSV and Excel files are supported");
}

function lookupStudentByRow(row: string[], studentIdIndex: number, emailIndex: number) {
  const studentIdValue = studentIdIndex !== -1 ? row[studentIdIndex] : "";
  const emailValue = emailIndex !== -1 ? row[emailIndex] : "";
  return { studentIdValue: studentIdValue.trim(), emailValue: emailValue.trim() };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const subjectId = formData.get("subjectId") as string;
    const sectionId = formData.get("sectionId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!subjectId || !sectionId) {
      return NextResponse.json({ error: "subjectId and sectionId are required" }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({ where: { userId: session.user.id } });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const teacherSchedule = await prisma.scheduleBlock.findFirst({
      where: {
        teacherId: teacher.id,
        subjectId,
        sectionId,
      },
    });
    if (!teacherSchedule) {
      return NextResponse.json({ error: "You don't teach this subject in this section" }, { status: 403 });
    }

    const rows = await parseImportRows(file);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Imported file is empty" }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const studentIdIndex = headers.indexOf("studentid");
    const emailIndex = headers.indexOf("email");
    const nameIndex = headers.indexOf("name");

    if (nameIndex === -1 || emailIndex === -1) {
      return NextResponse.json({ error: "Import must have columns: name, email" }, { status: 400 });
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const result = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; student: string; error: string }>,
      created: [] as Array<{ studentId: string; name: string; email: string; tempPassword: string }>,
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const { studentIdValue, emailValue } = lookupStudentByRow(row, studentIdIndex, emailIndex);
      const nameValue = nameIndex !== -1 ? (row[nameIndex] || "").trim() : "";
      const studentIdentifier = studentIdValue || emailValue || `row ${rowNumber}`;

      try {
        if (!nameValue || !emailValue) {
          throw new Error("name and email are required");
        }

        let student = await prisma.student.findFirst({
          where: {
            sectionId,
            OR: [
              studentIdValue ? { studentId: studentIdValue } : undefined,
              emailValue ? { user: { email: emailValue } } : undefined,
            ].filter(Boolean) as any[],
          },
          include: {
            user: true,
          },
        });

        if (!student) {
          // Not enrolled anywhere in this section yet - create the student record
          // so both the teacher's class list and Admin -> Students stay in sync.
          if (!emailValue) {
            throw new Error("email is required to create a new student");
          }
          if (!nameValue) {
            throw new Error("name is required to create a new student");
          }

          const existingEmail = await prisma.user.findUnique({
            where: { email: emailValue },
            include: { student: true },
          });
          if (existingEmail) {
            if (existingEmail.role !== "STUDENT" || existingEmail.student) {
              throw new Error("A student with this email already exists in a different section");
            }

            student = await prisma.student.create({
              data: {
                studentId: studentIdValue || (await generateStudentId(section.gradeLevel)),
                gradeLevel: section.gradeLevel,
                sectionId,
                userId: existingEmail.id,
              },
              include: { user: true },
            });
          } else {
            const newStudentId = studentIdValue || (await generateStudentId(section.gradeLevel));
            const existingStudentId = await prisma.student.findUnique({ where: { studentId: newStudentId } });
            if (existingStudentId) {
              throw new Error(`Student ID ${newStudentId} already exists`);
            }

            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            const user = await prisma.user.create({
              data: { email: emailValue, name: nameValue, password: hashedPassword, role: "STUDENT" },
            });

            student = await prisma.student.create({
              data: {
                studentId: newStudentId,
                gradeLevel: section.gradeLevel,
                sectionId,
                userId: user.id,
              },
              include: { user: true },
            });

            result.created.push({ studentId: student.studentId, name: user.name, email: user.email, tempPassword });
          }
        }

        const existing = await prisma.subjectStudent.findFirst({
          where: {
            studentId: student.id,
            subjectId,
            sectionId,
            teacherId: teacher.id,
          },
        });

        if (existing) {
          throw new Error("Student already enrolled in this subject");
        }

        await prisma.subjectStudent.create({
          data: {
            studentId: student.id,
            subjectId,
            sectionId,
            teacherId: teacher.id,
          },
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          student: studentIdentifier,
          error: error?.message || "Unknown error",
        });
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to import subject enrollments:", error);
    return NextResponse.json({ error: "Failed to import subject enrollments" }, { status: 500 });
  }
}
