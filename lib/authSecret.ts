import { getRuntimeEnvStatus } from "./runtime-env";

const fallbackSecret = "temporary-secret-change-in-production";
const configuredSecret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "";
const envStatus = getRuntimeEnvStatus();

export const authSecret = configuredSecret || fallbackSecret;
export const isAuthSecretConfigured = envStatus.checks.nextAuthSecret.configured;
