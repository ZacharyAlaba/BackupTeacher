ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "otpVerifiedAt" TIMESTAMP;

-- Existing accounts have already passed the old login flow. New accounts remain NULL.
UPDATE "User"
SET "otpVerifiedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "otpVerifiedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "User_otpVerifiedAt_idx"
ON "User" ("otpVerifiedAt");

NOTIFY pgrst, 'reload schema';