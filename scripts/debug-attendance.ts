import prisma from '../lib/prisma';
import supabaseAdmin from '../lib/supabaseAdmin';

async function main() {
  console.log('prisma shim keys', Object.keys(prisma).sort());
  const { count } = await supabaseAdmin.from('AttendanceRecord').select('id', { count: 'exact' });
  console.log('attendance count', count);

  const students = await prisma.student.findMany({ select: { id: true, studentId: true, userId: true } });
  console.log('students', students);

  const { data: records } = await supabaseAdmin.from('AttendanceRecord').select('*').limit(5);
  console.log('records', records);

  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  console.log('users', users);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
