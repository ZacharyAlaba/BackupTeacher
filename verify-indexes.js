const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'AttendanceRecord'
      ORDER BY indexname
    `);
    
    console.log('All AttendanceRecord indexes:');
    indexes.forEach(i => console.log(`  - ${i.indexname}`));
    
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
}

verify();
