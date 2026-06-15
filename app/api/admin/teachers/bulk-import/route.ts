import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

function buildTeacherInsertSql(
  userId: string,
  data: { dateOfBirth?: Date | null; gender?: string | null; phone?: string | null; address?: string | null }
) {
  const columns = [Prisma.raw('"userId"')];
  const values = [Prisma.sql`${userId}`];

  if (Object.prototype.hasOwnProperty.call(data, "dateOfBirth")) {
    columns.push(Prisma.raw('"dateOfBirth"'));
    values.push(Prisma.sql`${data.dateOfBirth}`);
  }
  if (Object.prototype.hasOwnProperty.call(data, "gender")) {
    columns.push(Prisma.raw('"gender"'));
    values.push(Prisma.sql`${data.gender}`);
  }
  if (Object.prototype.hasOwnProperty.call(data, "phone")) {
    columns.push(Prisma.raw('"phone"'));
    values.push(Prisma.sql`${data.phone}`);
  }
  if (Object.prototype.hasOwnProperty.call(data, "address")) {
    columns.push(Prisma.raw('"address"'));
    values.push(Prisma.sql`${data.address}`);
  }

  return Prisma.sql`
    INSERT INTO "Teacher" (${Prisma.join(columns, Prisma.sql`, `)})
    VALUES (${Prisma.join(values, Prisma.sql`, `)})
    RETURNING *
  `;
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

    if (!file.name.endsWith(".csv")) {
      return new Response(JSON.stringify({ error: "Only CSV files are supported" }), { status: 400 });
    }

    const fileContent = await file.text();
    const lines = fileContent.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: "CSV file is empty" }), { status: 400 });
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
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

    for (let i = 1; i < lines.length; i++) {
      const row = i + 1;
      const values = lines[i].split(",").map((v) => v.trim());

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

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          throw new Error("Email already exists in system");
        }

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const teacherCreateData: { dateOfBirth?: Date | null; gender?: string | null; phone?: string | null; address?: string | null } = {};
        if (dateOfBirth) teacherCreateData.dateOfBirth = new Date(dateOfBirth);
        if (gender) teacherCreateData.gender = gender;
        if (phone) teacherCreateData.phone = phone;
        if (address) teacherCreateData.address = address;

        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: "TEACHER",
          },
        });

        await prisma.$queryRaw(buildTeacherInsertSql(user.id, teacherCreateData));

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
