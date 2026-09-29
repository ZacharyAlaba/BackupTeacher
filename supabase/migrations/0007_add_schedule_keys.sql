-- Preserve template identity separately from editable Subject and Section names.
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "scheduleKey" TEXT;
ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "scheduleKey" TEXT;

UPDATE "Subject"
SET "scheduleKey" = UPPER(REGEXP_REPLACE("name", '[^A-Za-z0-9]', '', 'g'))
WHERE "scheduleKey" IS NULL;

UPDATE "Section"
SET "scheduleKey" = UPPER(REGEXP_REPLACE("name", '[^A-Za-z0-9]', '', 'g'))
WHERE "scheduleKey" IS NULL;

CREATE INDEX IF NOT EXISTS "Subject_scheduleKey_idx" ON "Subject"("scheduleKey");
CREATE INDEX IF NOT EXISTS "Section_scheduleKey_idx" ON "Section"("scheduleKey");
