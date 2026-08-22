const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Starting migration...');
    
    // Add date column
    console.log('Step 1: Adding date column...');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "date" TEXT'
    );
    console.log('✓ Added date column');
    
    // Backfill existing rows
    console.log('Step 2: Backfilling existing rows...');
    await prisma.$executeRawUnsafe(
      `UPDATE "AttendanceRecord" SET "date" = to_char("createdAt", 'YYYY-MM-DD') WHERE "date" IS NULL`
    );
    console.log('✓ Backfilled existing rows');
    
    // Drop old index
    console.log('Step 3: Dropping old unique index...');
    await prisma.$executeRawUnsafe(
      'DROP INDEX IF EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_key"'
    );
    console.log('✓ Dropped old unique index');
    
    // Make date NOT NULL
    console.log('Step 4: Setting date as NOT NULL...');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "AttendanceRecord" ALTER COLUMN "date" SET NOT NULL'
    );
    console.log('✓ Set date as NOT NULL');
    
    // Create new unique index with date
    console.log('Step 5: Creating new unique index...');
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key" ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date")'
    );
    console.log('✓ Created new unique index');
    
    console.log('\n✅ Migration completed successfully!');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runMigration();
