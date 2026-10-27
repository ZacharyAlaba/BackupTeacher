import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { OTP_CONFIG, OTP_PURPOSE, generateOTPCode, getOTPExpiryTime, sendOTPEmail } from "@/lib/otp-utils";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceRole ? createClient(url, serviceRole) : null;
}

function parseDatabaseDate(value: string) {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

const genericResponse = {
  success: true,
  message: "If an eligible account exists for that email, a verification code has been sent.",
};

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json();
    const email = String(rawEmail || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 500 });
    }

    const { data: user, error: userError } = await supabase
      .from("User")
      .select("id,email,role")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      console.error("Password reset account lookup error:", userError.message);
      return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 500 });
    }

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER")) {
      return NextResponse.json(genericResponse);
    }

    const now = new Date();
    const { data: records, error: recordsError } = await supabase
      .from("OTP")
      .select("id,expiresAt,createdAt")
      .eq("email", email)
      .eq("purpose", OTP_PURPOSE.PASSWORD_RESET);

    if (recordsError) {
      console.error("Password reset OTP lookup error:", recordsError.message);
      return NextResponse.json({ error: "Could not request a reset code. Please try again." }, { status: 500 });
    }

    const activeRecord = (records || [])
      .filter((record) => {
        const expiry = parseDatabaseDate(String(record.expiresAt));
        return !Number.isNaN(expiry.getTime()) && now < expiry;
      })
      .sort((first, second) => String(second.createdAt).localeCompare(String(first.createdAt)))[0];

    if (activeRecord) {
      const resendAt = parseDatabaseDate(String(activeRecord.createdAt)).getTime() +
        OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
      if (now.getTime() < resendAt) {
        const retryAfterSeconds = Math.ceil((resendAt - now.getTime()) / 1000);
        return NextResponse.json(
          { error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`, retryAfterSeconds },
          { status: 429 }
        );
      }
    }

    const otpId = randomUUID();
    const otpCode = generateOTPCode();
    const createdAt = now.toISOString();
    const { error: deleteError } = await supabase
      .from("OTP")
      .delete()
      .eq("email", email)
      .eq("purpose", OTP_PURPOSE.PASSWORD_RESET);

    if (deleteError) {
      console.error("Previous password reset OTP cleanup error:", deleteError.message);
      return NextResponse.json({ error: "Could not request a reset code. Please try again." }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("OTP").insert({
      id: otpId,
      email,
      code: otpCode,
      purpose: OTP_PURPOSE.PASSWORD_RESET,
      attempts: 0,
      expiresAt: getOTPExpiryTime().toISOString(),
      createdAt,
      updatedAt: createdAt,
    });

    if (insertError) {
      console.error("Password reset OTP insert error:", insertError.message);
      return NextResponse.json({ error: "Could not request a reset code. Please try again." }, { status: 500 });
    }

    try {
      await sendOTPEmail(email, otpCode, undefined, "password reset");
    } catch (error) {
      console.error("Password reset email sending error:", error);
      const { error: cleanupError } = await supabase.from("OTP").delete().eq("id", otpId);
      if (cleanupError) {
        console.error("Unsent password reset OTP cleanup error:", cleanupError.message);
      }
      return NextResponse.json({ error: "Could not send the reset email. Please try again later." }, { status: 500 });
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("Forgot password request error:", error);
    return NextResponse.json({ error: "Could not request a reset code. Please try again." }, { status: 500 });
  }
}
