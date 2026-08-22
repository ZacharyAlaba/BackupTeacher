const { execSync } = require("child_process");

function run(command) {
  execSync(command, {
    stdio: "inherit",
    shell: true,
  });
}

function hasConfiguredDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL || "";

  if (!databaseUrl) {
    return false;
  }

  return !databaseUrl.includes("username:password@host");
}

function isEnabled(flag) {
  return String(flag).toLowerCase() === "true";
}

try {
  if (hasConfiguredDatabaseUrl() && isEnabled(process.env.RUN_DB_PUSH_ON_BUILD)) {
    console.log("[build] RUN_DB_PUSH_ON_BUILD=true. Running prisma db push...");
    run("prisma db push");
  } else if (hasConfiguredDatabaseUrl()) {
    console.log("[build] DATABASE_URL detected. Skipping prisma db push (set RUN_DB_PUSH_ON_BUILD=true to enable).");
  } else {
    console.log("[build] No real DATABASE_URL configured. Skipping prisma db push.");
  }

  if (hasConfiguredDatabaseUrl() && isEnabled(process.env.RUN_DB_SEED_ON_BUILD)) {
    console.log("[build] RUN_DB_SEED_ON_BUILD=true. Seeding database from Prisma seed script...");
    run("npm run db:seed");
  } else if (hasConfiguredDatabaseUrl()) {
    console.log("[build] DATABASE_URL detected. Skipping db seed (set RUN_DB_SEED_ON_BUILD=true to enable).");
  } else {
    console.log("[build] No real DATABASE_URL configured. Skipping db seed.");
  }

  console.log("[build] Running next build...");
  run("next build");
} catch (error) {
  process.exit(error?.status || 1);
}
