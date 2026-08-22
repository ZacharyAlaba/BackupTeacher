const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUniqueIndex() {
  try {
    console.log('Step 1: Dropping old unique index (without date)...');
    await prisma.$executeRawUnsafe(
      'DROP INDEX IF EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academic_key"'
    );
    console.log('✓ Dropped');
    
    console.log('\nStep 2: Dropping conflicting unique index...');
    await prisma.$executeRawUnsafe(
      'DROP INDEX IF EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear"'
    );
    console.log('✓ Dropped');
    
    console.log('\nStep 3: Creating the CORRECT unique index WITH date...');
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key" ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date")'
    );
    console.log('✓ Created');
    
    console.log('\nStep 4: Verifying...');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'AttendanceRecord' AND indexname LIKE '%studentId%'
    `);
    
    console.log('Current indexes with studentId:');
    indexes.forEach(i => console.log(`  ✓ ${i.indexname}`));
    
    console.log('\n✅ Complete!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUniqueIndex();
