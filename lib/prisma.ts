import { PrismaClient } from "@prisma/client";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return undefined;
  }

  const url = new URL(databaseUrl);
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543") {
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "1");
  }

  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(process.env.DATABASE_URL
      ? { datasources: { db: { url: getDatabaseUrl() } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
