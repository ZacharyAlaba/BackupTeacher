import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { OTP_CONFIG, OTP_PURPOSE } from "@/lib/otp-utils";
import { OTP_SESSION_COOKIE } from "@/lib/otp-session";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceRole ? createClient(url, serviceRole) : null;
}

function parseDatabaseDate(value: string) {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, otp: rawOtp, newPassword } = await request.json();
    const email = String(rawEmail || "").trim().toLowerCase();
    const otp = String(rawOtp || "").replace(/\D/g, "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || otp.length !== OTP_CONFIG.LENGTH) {
      return NextResponse.json({ error: "Enter the email and 6-digit code." }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "Your new password must be at least 8 characters." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Password reset is temporarily unavailable." }, { status: 500 });
    }

    const { data: user, error: userError } = await supabase
      .from("User")
      .select("id,role")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      console.error("Password reset user lookup error:", userError.message);
      return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 500 });
    }

    if (!user || (user.role !== "STUDENT" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
    }

    const { data: records, error: fetchError } = await supabase
      .from("OTP")
      .select("id,code,attempts,expiresAt,createdAt")
      .eq("email", email)
      .eq("purpose", OTP_PURPOSE.PASSWORD_RESET)
      .gt("expiresAt", new Date().toISOString());

    if (fetchError) {
      console.error("Password reset OTP lookup error:", fetchError.message);
      return NextResponse.json({ error: "Could not verify the reset code. Please try again." }, { status: 500 });
    }

    const latestRecord = (records || [])
      .filter((record) => {
        const expiry = parseDatabaseDate(String(record.expiresAt));
        return !Number.isNaN(expiry.getTime()) && Date.now() < expiry.getTime();
      })
      .sort((first, second) => String(second.createdAt).localeCompare(String(first.createdAt)))[0];

    if (!latestRecord) {
      return NextResponse.json({ error: "Invalid or expired reset code. Request a new one." }, { status: 400 });
    }

    if (latestRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      const { error: deleteError } = await supabase.from("OTP").delete().eq("id", latestRecord.id);
      if (deleteError) console.error("Locked reset OTP cleanup error:", deleteError.message);
      return NextResponse.json({ error: "Too many attempts. Request a new reset code." }, { status: 429 });
    }

    if (String(latestRecord.code) !== otp) {
      const { error: attemptError } = await supabase
        .from("OTP")
        .update({ attempts: latestRecord.attempts + 1 })
        .eq("id", latestRecord.id);
      if (attemptError) {
        console.error("Password reset attempt update error:", attemptError.message);
        return NextResponse.json({ error: "Could not verify the reset code. Please try again." }, { status: 500 });
      }
      return NextResponse.json({ error: "Invalid reset code." }, { status: 400 });
    }

    const { data: consumedOtp, error: consumeError } = await supabase
      .from("OTP")
      .delete()
      .eq("id", latestRecord.id)
      .select("id")
      .maybeSingle();

    if (consumeError) {
      console.error("Password reset OTP consumption error:", consumeError.message);
      return NextResponse.json({ error: "Could not verify the reset code. Please try again." }, { status: 500 });
    }

    if (!consumedOtp) {
      return NextResponse.json({ error: "Invalid or expired reset code. Request a new one." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, otpVerifiedAt: null },
    });

    const response = NextResponse.json({ success: true, message: "Password reset successfully." });
    response.cookies.delete(OTP_SESSION_COOKIE);
    return response;
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}
