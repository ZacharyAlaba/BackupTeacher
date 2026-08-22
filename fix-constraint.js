const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixConstraint() {
  try {
    console.log('Checking existing constraints...');
    
    // Get all constraints on AttendanceRecord table
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'AttendanceRecord'
    `);
    
    console.log('Existing constraints:');
    constraints.forEach(c => console.log(`  - ${c.constraint_name} (${c.constraint_type})`));
    
    // Find and drop the old unique constraint
    const oldConstraint = constraints.find(c => 
      c.constraint_type === 'UNIQUE' && 
      c.constraint_name.includes('studentId_subjectId_gradingPeriod_academicYear')
    );
    
    if (oldConstraint && !oldConstraint.constraint_name.includes('date')) {
      console.log(`\nDropping old constraint: ${oldConstraint.constraint_name}`);
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "AttendanceRecord" DROP CONSTRAINT IF EXISTS "${oldConstraint.constraint_name}"`
      );
      console.log('✓ Old constraint dropped');
    }
    
    // Check if new constraint with date exists
    const newConstraint = constraints.find(c =>
      c.constraint_type === 'UNIQUE' &&
      c.constraint_name.includes('date')
    );
    
    if (newConstraint) {
      console.log(`✓ New constraint with date exists: ${newConstraint.constraint_name}`);
    } else {
      console.log('\n⚠ New constraint with date not found. Creating it...');
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceRecord_studentId_subjectId_gradingPeriod_academicYear_date_key"
        ON "AttendanceRecord" ("studentId", "subjectId", "gradingPeriod", "academicYear", "date")
      `);
      console.log('✓ New constraint created');
    }
    
    console.log('\n✅ Constraint fix completed!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixConstraint();
