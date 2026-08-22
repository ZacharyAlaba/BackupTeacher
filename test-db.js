const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing database schema...');
    
    // Check if date column exists
    const result = await prisma.$queryRawUnsafe(
      "SELECT column_name FROM information_schema.columns WHERE table_name='AttendanceRecord' AND column_name='date'"
    );
    console.log('✓ Date column exists:', result.length > 0);
    
    // Try a test save
    const testRecord = await prisma.attendanceRecord.upsert({
      where: {
        studentId_subjectId_gradingPeriod_academicYear_date: {
          studentId: 'test-id-123',
          subjectId: 'test-subject-123',
          gradingPeriod: 'Quarter 1',
          academicYear: '2026-2027',
          date: '2026-08-17'
        }
      },
      create: {
        studentId: 'test-id-123',
        subjectId: 'test-subject-123',
        sectionId: 'test-section-123',
        teacherId: 'test-teacher-123',
        gradingPeriod: 'Quarter 1',
        academicYear: '2026-2027',
        date: '2026-08-17',
        status: 'PRESENT'
      },
      update: {
        status: 'PRESENT'
      }
    });
    console.log('✓ Test upsert succeeded, ID:', testRecord.id);
    
    // Delete test record
    await prisma.attendanceRecord.delete({ where: { id: testRecord.id } });
    console.log('✓ Test record cleaned up');
    
    console.log('\n✅ All database tests passed!');
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
