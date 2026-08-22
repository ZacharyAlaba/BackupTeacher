const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConstraints() {
  try {
    console.log('=== Checking ALL indexes and constraints on AttendanceRecord ===\n');
    
    // Get all indexes
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'AttendanceRecord'
      ORDER BY indexname
    `);
    
    console.log('ALL INDEXES:');
    indexes.forEach(i => {
      console.log(`  Index: ${i.indexname}`);
      console.log(`  Definition: ${i.indexdef}`);
      console.log();
    });
    
    // Get unique constraints
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT constraint_name, constraint_type, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'AttendanceRecord'
      ORDER BY constraint_name, column_name
    `);
    
    console.log('UNIQUE CONSTRAINTS:');
    let lastConstraint = '';
    constraints.forEach(c => {
      if (c.constraint_name !== lastConstraint) {
        console.log(`  ${c.constraint_name} (${c.constraint_type}): ${c.column_name}`);
        lastConstraint = c.constraint_name;
      } else {
        console.log(`    , ${c.column_name}`);
      }
    });
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkConstraints();
