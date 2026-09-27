import { prisma } from "../lib/prisma";

(async () => {
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER" }, include: { teacher: true } });
  console.log("Teachers:", teachers.map((t: any) => ({ id: t.id, name: t.name, email: t.email, teacherId: t.teacher?.id })));

  const count = await prisma.scheduleBlock.count();
  console.log("Total scheduleBlock rows:", count);

  for (const t of teachers) {
    if (!t.teacher) continue;
    const blocks = await prisma.scheduleBlock.findMany({ where: { teacherId: t.teacher.id } });
    console.log(`Teacher ${t.name} (${t.email}) has ${blocks.length} scheduleBlocks`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
