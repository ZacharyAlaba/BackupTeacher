import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateStudentId } from "@/lib/studentIdGenerator";
import bcrypt from "bcryptjs";

interface BulkImportStudent {
  name: string;
  email: string;
  gradeLevel: string;
  sectionId: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    name: string;
    error: string;
  }>;
  created: Array<{
    studentId: string;
    name: string;
    email: string;
  }>;
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

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return new Response(JSON.stringify({ error: "CSV file is empty" }), { status: 400 });
    }

    // Parse CSV header (first line)
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIndex = headers.indexOf("name");
    const emailIndex = headers.indexOf("email");
    const gradeLevelIndex = headers.indexOf("grade");
    const sectionNameIndex = headers.indexOf("section");
    const dobIndex = headers.indexOf("dateofbirth");
    const genderIndex = headers.indexOf("gender");
    const phoneIndex = headers.indexOf("phone");
    const addressIndex = headers.indexOf("address");
    const guardianNameIndex = headers.indexOf("guardianname");
    const guardianPhoneIndex = headers.indexOf("guardianphone");

    if (nameIndex === -1 || emailIndex === -1 || gradeLevelIndex === -1 || sectionNameIndex === -1) {
      return new Response(
        JSON.stringify({ error: "CSV must have columns: name, email, grade, section" }),
        { status: 400 }
      );
    }

    // Get all sections for lookup
    const sections = await prisma.section.findMany();
    const sectionMap = new Map(sections.map((s) => [s.name.toLowerCase(), s.id]));

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    // Process each data line
    for (let i = 1; i < lines.length; i++) {
      const row = i + 1;
      const values = lines[i].split(",").map((v) => v.trim());

      if (values.length < 4) continue;

      const name = values[nameIndex];
      const email = values[emailIndex];
      const gradeRaw = values[gradeLevelIndex].trim();
      const gradeLevel = gradeRaw.toUpperCase().startsWith("G") ? gradeRaw.toUpperCase() : `G${gradeRaw}`;
      const sectionName = values[sectionNameIndex];
      const dateOfBirth = dobIndex !== -1 ? values[dobIndex] : undefined;
      const gender = genderIndex !== -1 ? values[genderIndex] : undefined;
      const phone = phoneIndex !== -1 ? values[phoneIndex] : undefined;
      const address = addressIndex !== -1 ? values[addressIndex] : undefined;
      const guardianName = guardianNameIndex !== -1 ? values[guardianNameIndex] : undefined;
      const guardianPhone = guardianPhoneIndex !== -1 ? values[guardianPhoneIndex] : undefined;

      try {
        // Validate inputs
        if (!name || !email) {
          throw new Error("Name and email are required");
        }

        if (!email.includes("@")) {
          throw new Error("Invalid email format");
        }

        const sectionId = sectionMap.get(sectionName.toLowerCase());
        if (!sectionId) {
          throw new Error(`Section '${sectionName}' not found`);
        }

        let parsedDateOfBirth: Date | undefined;
        if (dateOfBirth) {
          parsedDateOfBirth = new Date(dateOfBirth);
          if (Number.isNaN(parsedDateOfBirth.getTime())) {
            throw new Error("Invalid date of birth format");
          }
        }

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        });

        if (existingEmail) {
          throw new Error("Email already exists in system");
        }

        // Generate student ID
        const studentId = await generateStudentId(gradeLevel);

        // Generate random password
        const password = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: "STUDENT",
          },
        });

        // Create student
        const student = await prisma.student.create({
          data: {
            studentId,
            gradeLevel,
            sectionId,
            userId: user.id,
            dateOfBirth: parsedDateOfBirth,
            gender,
            phone,
            address,
            guardianName,
            guardianPhone,
          },
        });

        result.created.push({
          studentId: student.studentId,
          name: user.name,
          email: user.email,
        });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row,
          name: values[nameIndex] || "Unknown",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Failed to import students:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to import students" }),
      { status: 500 }
    );
  }
}
