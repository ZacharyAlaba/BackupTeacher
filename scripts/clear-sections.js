const { prisma } = require("../lib/prisma");

(async () => {
  try {
    await prisma.section.deleteMany();
    console.log("✅ Deleted all existing sections");
  } catch (error) {
    console.error("Error clearing sections:", error);
    process.exit(1);
  } finally {
    // no disconnect needed for Supabase shim
  }
})();
