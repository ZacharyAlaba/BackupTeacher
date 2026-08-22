#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔍 DEPLOYMENT READINESS CHECK\n");

// Check 1: Environment variables
console.log("✓ Environment Variables:");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf-8");
  const hasSupabaseUrl = env.includes("NEXT_PUBLIC_SUPABASE_URL");
  const hasServiceRole = env.includes("SUPABASE_SERVICE_ROLE_KEY");
  const hasNextAuthSecret = env.includes("NEXTAUTH_SECRET");
  const hasDatabaseUrl = env.includes("DATABASE_URL");

  console.log(`  - DATABASE_URL: ${hasDatabaseUrl ? "✅" : "❌"}`);
  console.log(
    `  - NEXT_PUBLIC_SUPABASE_URL: ${hasSupabaseUrl ? "✅" : "❌"}`
  );
  console.log(
    `  - SUPABASE_SERVICE_ROLE_KEY: ${hasServiceRole ? "✅" : "❌"}`
  );
  console.log(`  - NEXTAUTH_SECRET: ${hasNextAuthSecret ? "✅" : "❌"}`);

  if (
    hasDatabaseUrl &&
    hasSupabaseUrl &&
    hasServiceRole &&
    hasNextAuthSecret
  ) {
    console.log("  Result: ✅ All required env vars present");
  } else {
    console.log("  Result: ❌ Missing env vars");
  }
} else {
  console.log("  Result: ❌ .env file not found");
}

// Check 2: Dependencies
console.log("\n✓ Dependencies:");
const packagePath = path.join(__dirname, "package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
const hasNextAuth = !!pkg.dependencies["next-auth"];
const hasSupabaseJs = !!pkg.dependencies["@supabase/supabase-js"];
const hasPrisma = !!pkg.dependencies["@prisma/client"];

console.log(`  - next-auth: ${hasNextAuth ? "✅" : "❌"}`);
console.log(`  - @supabase/supabase-js: ${hasSupabaseJs ? "✅" : "❌"}`);
console.log(`  - @prisma/client: ${hasPrisma ? "✅" : "❌"}`);

if (hasNextAuth && hasSupabaseJs && hasPrisma) {
  console.log("  Result: ✅ All key dependencies present");
} else {
  console.log("  Result: ❌ Missing dependencies");
}

// Check 3: Schema migration file
console.log("\n✓ Supabase Schema:");
const schemaPath = path.join(
  __dirname,
  "supabase/migrations/0001_create_schema.sql"
);
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  console.log(`  - Migration file exists: ✅`);
  console.log(`  - File size: ${schema.length} bytes`);
} else {
  console.log(`  - Migration file exists: ❌`);
}

// Check 4: Prisma schema
console.log("\n✓ Prisma Schema:");
const prismaPath = path.join(__dirname, "prisma/schema.prisma");
if (fs.existsSync(prismaPath)) {
  const prisma = fs.readFileSync(prismaPath, "utf-8");
  console.log(`  - schema.prisma exists: ✅`);
  console.log(
    `  - Contains model definitions: ${prisma.includes("model ") ? "✅" : "❌"}`
  );
} else {
  console.log(`  - schema.prisma exists: ❌`);
}

// Summary
console.log("\n" + "=".repeat(50));
console.log(
  "📋 SUMMARY: Your system appears deployment-ready IF:\n"
);
console.log("  1. ✅ All Supabase tables are created in your project");
console.log("  2. ✅ Seed data has been run (users, sections, subjects)");
console.log("  3. ✅ GitHub repo is up-to-date and pushed");
console.log("  4. ❓ Ready to deploy to Vercel (Next steps below)\n");
console.log("NEXT STEPS for Vercel Deployment:");
console.log("  1. Go to https://vercel.com and link your GitHub repo");
console.log("  2. Add the same env vars from .env to Vercel project settings");
console.log("  3. Deploy!\n");
