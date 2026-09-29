import { prisma } from "@/lib/prisma";

export async function generateTeacherId(): Promise<string> {
  const prefix = `${new Date().getFullYear()}-T-`;
  const lastTeacher = await prisma.teacher.findFirst({
    where: { teacherId: { startsWith: prefix } },
    orderBy: { teacherId: "desc" },
  });
  const lastNumber = lastTeacher ? Number(lastTeacher.teacherId.split("-").pop()) || 0 : 0;
  return `${prefix}${String(lastNumber + 1).padStart(3, "0")}`;
}
