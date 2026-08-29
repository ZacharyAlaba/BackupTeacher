import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import {
  generateOTPCode,
  getOTPExpiryTime,
  sendOTPEmail,
  clearOTPSentInCurrentProcess,
  clearOTPVerifiedInCurrentProcess,
} from "@/lib/otp-utils";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceRole ? createClient(url, serviceRole) : null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword, otp: rawOtp } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const email = session.user.email.toLowerCase();
    const otp = String(rawOtp || "").replace(/\D/g, "");

    if (!otp) {
      const otpCode = generateOTPCode();
      await supabase.from("OTP").delete().eq("email", email);
      const { error: otpError } = await supabase.from("OTP").insert({
        id: randomUUID(),
        email,
        code: otpCode,
        attempts: 0,
        expiresAt: getOTPExpiryTime().toISOString(),
      });

      if (otpError) throw otpError;
      await sendOTPEmail(email, otpCode);
      return NextResponse.json({ requiresOtp: true }, { status: 202 });
    }

    const { data: otpRecords } = await supabase
      .from("OTP")
      .select("*")
      .eq("email", email)
      .gt("expiresAt", new Date().toISOString());

    const matchingOtp = (otpRecords || []).find(
      (record) => String(record.code) === otp && record.attempts < 5
    );

    if (!matchingOtp) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 401 });
    }

    await supabase.from("OTP").delete().eq("email", email);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, otpVerifiedAt: null },
    });

    clearOTPSentInCurrentProcess(email);
    clearOTPVerifiedInCurrentProcess(email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Student password change error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
