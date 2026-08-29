import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateOTPCode,
  sendOTPEmail,
  getOTPExpiryTime,
  isOTPRequiredForCurrentProcess,
  hasOTPSentInCurrentProcess,
  markOTPSentInCurrentProcess,
  hasOTPVerifiedInCurrentProcess,
} from '@/lib/otp-utils';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return null;
  }

  return createClient(url, serviceRole);
}

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password } = await request.json();
    const identifier = String(rawEmail || '').trim();
    const email = identifier.toLowerCase();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Verify user exists with correct password
    let { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user && !userError) {
      const { data: student } = await supabase
        .from('Student')
        .select('User(*)')
        .eq('studentId', identifier)
        .maybeSingle();
      user = Array.isArray((student as any)?.User)
        ? (student as any).User[0]
        : (student as any)?.User;
    }

    if (userError) {
      console.error('User fetch error:', userError);
      return NextResponse.json(
        { error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    if (hasOTPVerifiedInCurrentProcess(user.email) || !isOTPRequiredForCurrentProcess(user.otpVerifiedAt)) {
      return NextResponse.json({ success: true, requiresOtp: false, email: user.email });
    }

    const userEmail = String(user.email).toLowerCase();

    // A verified user skips OTP until the development server is restarted.
    if (hasOTPSentInCurrentProcess(userEmail)) {
      return NextResponse.json({ success: true, requiresOtp: true, email: userEmail });
    }

    // Generate OTP
    const otpCode = generateOTPCode();
    const expiryTime = getOTPExpiryTime();

    // Remove expired records, but keep recent codes because email delivery can
    // arrive out of order when a user requests OTP more than once.
    await supabase.from('OTP').delete().lt('expiresAt', new Date().toISOString());

    const { error: insertError } = await supabase.from('OTP').insert({
      id: randomUUID(),
      email: userEmail,
      code: otpCode,
      attempts: 0,
      expiresAt: expiryTime.toISOString(),
    });

    if (insertError) {
      console.error('Insert OTP error:', insertError);
      throw insertError;
    }

    // Send OTP via email
    try {
      await sendOTPEmail(email, otpCode);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Delete the OTP if email fails
      await supabase.from('OTP').delete().eq('email', userEmail);
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please check your email address.' },
        { status: 500 }
      );
    }

    markOTPSentInCurrentProcess(userEmail);

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent to your email',
        email: userEmail,
        requiresOtp: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
