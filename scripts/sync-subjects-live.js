const fs = require("fs");
const path = require("path");
const { prisma } = require("../lib/prisma");

function normalize(name) {
  return name.trim().replace(/\s+/g, " ");
}

(async () => {
  try {
    const csvPath = path.resolve("..", "data", "subjects.csv");
    const raw = fs.readFileSync(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
      console.log("No data rows found in subjects.csv");
      process.exit(0);
    }

    let created = 0;
    let existing = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",");
      const gradeLevel = (parts[0] || "").trim();
      const track = (parts[1] || "").trim();
      const name = normalize(parts.slice(2).join(","));

      if (!gradeLevel || !name) continue;

      const found = await prisma.subject.findFirst({
        where: { gradeLevel, name },
      });

      if (found) {
        existing++;
        continue;
      }

      await prisma.subject.create({
        data: {
          gradeLevel,
          track: track || null,
          name,
        },
      });
      created++;
    }

    console.log(`Subjects sync complete. Created: ${created}, Existing: ${existing}`);
  } catch (error) {
    console.error("Subjects sync failed:", error);
    process.exit(1);
  } finally {
    // no disconnect needed for Supabase shim
  }
})();
