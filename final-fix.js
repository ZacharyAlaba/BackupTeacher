const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAll() {
  try {
    console.log('Step 1: Dropping old unique index without date...');
    try {
      await prisma.$executeRawUnsafe(
        'DROP INDEX IF EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear"'
      );
      console.log('✓ Old index dropped');
    } catch (e) {
      console.log('  (Index may not exist, continuing...)');
    }
    
    console.log('\nStep 2: Creating new unique index WITH date...');
    try {
      await prisma.$executeRawUnsafe(
        'CREATE UNIQUE INDEX "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key" ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date")'
      );
      console.log('✓ New index created');
    } catch (e) {
      console.log('  Note:', e.message.substring(0, 100));
    }
    
    console.log('\nStep 3: Verify indexes...');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'AttendanceRecord'
      ORDER BY indexname
    `);
    
    console.log('\nCurrent indexes:');
    indexes.forEach(i => {
      if (i.indexname.includes('studentId')) {
        console.log(`  ✓ ${i.indexname}`);
      }
    });
    
    console.log('\n✅ All done!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAll();
