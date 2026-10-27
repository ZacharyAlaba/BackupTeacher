CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Room_sectionId_fkey" FOREIGN KEY ("sectionId")
    REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Room_sectionId_name_key" ON "Room"("sectionId", "name");
CREATE INDEX "Room_sectionId_idx" ON "Room"("sectionId");

ALTER TABLE "ScheduleBlock" ADD COLUMN "roomId" TEXT;
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_roomId_fkey" FOREIGN KEY ("roomId")
  REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ScheduleBlock_roomId_idx" ON "ScheduleBlock"("roomId");