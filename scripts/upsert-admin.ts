import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin User";

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, name, role: "ADMIN" },
    create: { email, password: hashed, name, role: "ADMIN" },
  });

  console.log(`Upserted admin: ${user.email}`);
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
