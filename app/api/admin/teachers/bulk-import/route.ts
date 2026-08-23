import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";

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

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  created: Array<{ name: string; email: string }>;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
      return new Response(JSON.stringify({ error: "Only CSV and Excel files are supported" }), { status: 400 });
    }

    const rows = await parseImportRows(file);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "The selected file is empty" }), { status: 400 });
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const nameIndex = headers.indexOf("name");
    const emailIndex = headers.indexOf("email");
    const dateOfBirthIndex = headers.indexOf("dateofbirth");
    const genderIndex = headers.indexOf("gender");
    const phoneIndex = headers.indexOf("phone");
    const addressIndex = headers.indexOf("address");

    if (nameIndex === -1 || emailIndex === -1) {
      return new Response(
        JSON.stringify({ error: "CSV must have columns: name, email" }),
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    for (let i = 1; i < rows.length; i++) {
      const row = i + 1;
      const values = rows[i];

      if (values.length < 2) continue;

      const name = values[nameIndex];
      const email = values[emailIndex];
      const dateOfBirth = dateOfBirthIndex !== -1 ? values[dateOfBirthIndex] : "";
      const gender = genderIndex !== -1 ? values[genderIndex] : "";
      const phone = phoneIndex !== -1 ? values[phoneIndex] : "";
      const address = addressIndex !== -1 ? values[addressIndex] : "";

      try {
        if (!name || !email) {
          throw new Error("Name and email are required");
        }

        if (!email.includes("@")) {
          throw new Error("Invalid email format");
        }

        if (dateOfBirth && Number.isNaN(Date.parse(dateOfBirth))) {
          throw new Error("Invalid dateOfBirth format");
        }

        const teacherCreateData: { dateOfBirth?: Date | null; gender?: string | null; phone?: string | null; address?: string | null } = {};
        if (dateOfBirth) teacherCreateData.dateOfBirth = new Date(dateOfBirth);
        if (gender) teacherCreateData.gender = gender;
        if (phone) teacherCreateData.phone = phone;
        if (address) teacherCreateData.address = address;

        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { teacher: true },
        });
        if (existingUser) {
          if (existingUser.role !== "TEACHER") {
            throw new Error("Email already belongs to a non-teacher account");
          }

          if (existingUser.teacher) {
            throw new Error("Teacher email already exists in system");
          }

          await prisma.teacher.create({
            data: {
              userId: existingUser.id,
              ...teacherCreateData,
            },
          });
          result.created.push({ name: existingUser.name, email });
          result.success++;
          continue;
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: "TEACHER",
          },
        });

        await prisma.teacher.create({
          data: {
            userId: user.id,
            ...teacherCreateData,
          },
        });

        result.created.push({ name, email });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row,
          name: name || "Unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Failed to import teachers:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to import teachers" }),
      { status: 500 }
    );
  }
}
