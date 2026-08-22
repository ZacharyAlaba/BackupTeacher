const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixIndexes() {
  try {
    console.log('Checking existing indexes on AttendanceRecord...');
    
    // Get all indexes on AttendanceRecord table
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'AttendanceRecord'
    `);
    
    console.log('Existing indexes:');
    indexes.forEach(i => {
      console.log(`  - ${i.indexname}`);
      if (i.indexdef.includes('studentId') && i.indexdef.includes('subjectId')) {
        console.log(`    Definition: ${i.indexdef.substring(0, 100)}...`);
      }
    });
    
    // Find old index without date
    const oldIndex = indexes.find(i => 
      i.indexname && 
      i.indexname.includes('studentId_subjectId_gradingPeriod_academicYear') &&
      !i.indexname.includes('date') &&
      !i.indexname.includes('pkey') &&
      !i.indexname.includes('fkey')
    );
    
    if (oldIndex) {
      console.log(`\n✓ Found old index: ${oldIndex.indexname}`);
      console.log('Dropping it...');
      await prisma.$executeRawUnsafe(
        `DROP INDEX IF EXISTS "${oldIndex.indexname}"`
      );
      console.log('✓ Old index dropped');
    } else {
      console.log('\n✓ No old problematic index found');
    }
    
    // Create new index with date
    console.log('\nCreating new unique index with date...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key"
      ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date")
    `);
    console.log('✓ New unique index created');
    
    // Verify
    const newIndexes = await prisma.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'AttendanceRecord' AND indexname LIKE '%date%'
    `);
    
    console.log('\nVerification - indexes with date:');
    newIndexes.forEach(i => console.log(`  ✓ ${i.indexname}`));
    
    console.log('\n✅ Index fix completed!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixIndexes();
