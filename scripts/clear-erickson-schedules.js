const { prisma } = require("../lib/prisma");

(async () => {
  try {
    const section = await prisma.section.findFirst({ where: { name: { equals: "ERICKSON", mode: "insensitive" } } });
    if (!section) {
      console.log("Section ERICKSON not found. Nothing to delete.");
      process.exit(0);
    }

    const result = await prisma.scheduleBlock.deleteMany({ where: { sectionId: section.id } });
    console.log(`✅ Deleted ${result.count} schedule block(s) for ERICKSON`);
  } catch (error) {
    console.error("Error clearing ERICKSON schedules:", error);
    process.exit(1);
  } finally {
    // Prisma client disconnect is not necessary for the Supabase shim, but do it if available
    if (prisma && typeof prisma.$disconnect === "function") await prisma.$disconnect();
  }
})();
