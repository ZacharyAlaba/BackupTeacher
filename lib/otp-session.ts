import { createHmac, timingSafeEqual } from "crypto";
import { authSecret } from "@/lib/authSecret";

export const OTP_SESSION_COOKIE = "otp-session";

function signPayload(payload: string): string {
  return createHmac("sha256", authSecret).update(payload).digest("base64url");
}

export function createOtpSessionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), version: 1 })
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function hasValidOtpSession(
  token: string | undefined,
  email: string
): boolean {
  if (!token) {
    return false;
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return false;
  }

  const expectedSignature = signPayload(payload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.version === 1 && data.email === email.toLowerCase();
  } catch {
    return false;
  }
}
