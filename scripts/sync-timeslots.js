const fs = require("fs");
const path = require("path");
const { prisma } = require("../lib/prisma");

(async () => {
  try {
    const csvPath = path.resolve("..", "data", "time_slots.csv");
    const raw = fs.readFileSync(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
      console.log("No data rows found in time_slots.csv");
      process.exit(0);
    }

    const parsedSlots = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(",");
      const day = (parts[0] || "").trim();
      const startTime = (parts[1] || "").trim();
      const endTime = (parts[2] || "").trim();

      if (!day || !startTime || !endTime) continue;

      parsedSlots.push({ day, startTime, endTime });
    }

    // Clear existing schedule blocks and time slots, then insert new ones
    await prisma.scheduleBlock.deleteMany({});
    await prisma.timeSlot.deleteMany({});

    if (parsedSlots.length > 0) {
      for (const slot of parsedSlots) {
        try {
          await prisma.timeSlot.create({ data: slot });
        } catch (e) {
          // ignore duplicates or errors on insert
        }
      }
    }

    const total = await prisma.timeSlot.count();

    console.log(
      `Time slots sync complete. Replaced with ${total} slots from CSV. Existing schedule assignments were cleared.`
    );
  } catch (error) {
    console.error("Time slots sync failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
