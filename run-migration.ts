import { prisma } from './lib/prisma';

async function migrate() {
  try {
    console.log('Executing migration: add date column to AttendanceRecord...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AttendanceRecord"
      ADD COLUMN IF NOT EXISTS "date" TEXT;
    `);
    console.log('✓ Added date column');
    
    await prisma.$executeRawUnsafe(`
      UPDATE "AttendanceRecord"
      SET "date" = COALESCE("date", to_char("createdAt", 'YYYY-MM-DD'))
      WHERE "date" IS NULL;
    `);
    console.log('✓ Backfilled existing rows with date from createdAt');
    
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_key";
    `);
    console.log('✓ Dropped old unique index');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AttendanceRecord"
      ALTER COLUMN "date" SET NOT NULL;
    `);
    console.log('✓ Set date as NOT NULL');
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key"
      ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date");
    `);
    console.log('✓ Created new unique index with date');
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
