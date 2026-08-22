type EnvCheck = {
  configured: boolean;
  message: string;
};

export type RuntimeEnvStatus = {
  checks: {
    databaseUrl: EnvCheck;
    nextAuthSecret: EnvCheck;
    supabaseUrl: EnvCheck;
    supabaseServiceRoleKey: EnvCheck;
  };
  isReady: boolean;
};

function isConfigured(value?: string) {
  if (!value || !value.trim()) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return !/(placeholder|changeme|your[-_]?|your\s)/i.test(normalized);
}

function buildCheck(configured: boolean, message: string): EnvCheck {
  return { configured, message };
}

export function getRuntimeEnvStatus(): RuntimeEnvStatus {
  const databaseUrl = process.env.DATABASE_URL || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const checks = {
    databaseUrl: buildCheck(
      isConfigured(databaseUrl),
      isConfigured(databaseUrl) ? "Database URL is configured." : "DATABASE_URL is missing or still using a placeholder value."
    ),
    nextAuthSecret: buildCheck(
      isConfigured(nextAuthSecret),
      isConfigured(nextAuthSecret) ? "Auth secret is configured." : "NEXTAUTH_SECRET or AUTH_SECRET is missing or still using a placeholder value."
    ),
    supabaseUrl: buildCheck(
      isConfigured(supabaseUrl),
      isConfigured(supabaseUrl) ? "Supabase URL is configured." : "NEXT_PUBLIC_SUPABASE_URL is missing or still using a placeholder value."
    ),
    supabaseServiceRoleKey: buildCheck(
      isConfigured(supabaseServiceRoleKey),
      isConfigured(supabaseServiceRoleKey) ? "Supabase service role key is configured." : "SUPABASE_SERVICE_ROLE_KEY is missing or still using a placeholder value."
    ),
  };

  return {
    checks,
    isReady: Object.values(checks).every((check) => check.configured),
  };
}
