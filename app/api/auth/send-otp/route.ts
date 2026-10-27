import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateOTPCode,
  sendOTPEmail,
  getOTPExpiryTime,
  OTP_CONFIG,
  OTP_PURPOSE,
} from '@/lib/otp-utils';
import { hasValidOtpSession, OTP_SESSION_COOKIE } from '@/lib/otp-session';
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
    const { email: rawEmail, password, resend: resendRequest } = await request.json();
    const resend = resendRequest === true;
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
      .select('id,email,password,role')
      .eq('email', email)
      .maybeSingle();

    if (!user && !userError) {
      const { data: student } = await supabase
        .from('Student')
        .select('User(id,email,password,role)')
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

    const userEmail = String(user.email).toLowerCase();
    if (hasValidOtpSession(request.cookies.get(OTP_SESSION_COOKIE)?.value, userEmail)) {
      return NextResponse.json({
        success: true,
        requiresOtp: false,
        email: userEmail,
        role: user.role,
      });
    }

    const now = new Date();
    const { data: existingRecords, error: existingRecordsError } = await supabase
      .from('OTP')
      .select('id,attempts,expiresAt,createdAt')
      .ilike('email', userEmail)
      .eq('purpose', OTP_PURPOSE.LOGIN);

    if (existingRecordsError) {
      console.error('Existing OTP lookup error:', existingRecordsError.message);
      return NextResponse.json(
        { error: 'Could not check the current verification code. Please try again.' },
        { status: 500 }
      );
    }

    const parseDatabaseDate = (value: string) => {
      const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
        ? value
        : `${value}Z`;
      return new Date(timestamp);
    };
    const currentOtp = (existingRecords || [])
      .filter((record) => {
        const expiry = parseDatabaseDate(String(record.expiresAt));
        return !Number.isNaN(expiry.getTime()) && now < expiry && record.attempts < OTP_CONFIG.MAX_ATTEMPTS;
      })
      .sort((first, second) =>
        String(second.createdAt).localeCompare(String(first.createdAt))
      )[0];

    const resendAvailableAt = currentOtp
      ? new Date(
          parseDatabaseDate(String(currentOtp.createdAt)).getTime() +
            OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000
        ).toISOString()
      : now.toISOString();

    if (!resend && currentOtp) {
      return NextResponse.json({
        success: true,
        message: 'A verification code is already active.',
        email: userEmail,
        role: user.role,
        requiresOtp: true,
        resendAvailableAt,
      });
    }

    if (resend && currentOtp && now < new Date(resendAvailableAt)) {
      const retryAfterSeconds = Math.ceil(
        (new Date(resendAvailableAt).getTime() - now.getTime()) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const otpCode = generateOTPCode();
    const otpId = randomUUID();
    const expiryTime = getOTPExpiryTime();
    const createdAt = new Date().toISOString();

    const { error: deleteError } = await supabase
      .from('OTP')
      .delete()
      .eq('email', userEmail)
      .eq('purpose', OTP_PURPOSE.LOGIN);

    if (deleteError) {
      console.error('Previous OTP cleanup error:', deleteError.message);
      return NextResponse.json(
        { error: 'Could not replace the previous verification code. Please try again.' },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase.from('OTP').insert({
      id: otpId,
      email: userEmail,
      code: otpCode,
      purpose: OTP_PURPOSE.LOGIN,
      attempts: 0,
      expiresAt: expiryTime.toISOString(),
      createdAt,
      updatedAt: createdAt,
    });

    if (insertError) {
      console.error('Insert OTP error:', insertError);
      throw insertError;
    }

    // Cleanup is independent of this login and should not delay OTP delivery.
    void supabase.from('OTP').delete().lt('expiresAt', new Date().toISOString());

    // Send OTP via email
    try {
      await sendOTPEmail(email, otpCode);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Delete the OTP if email fails
      const { error: cleanupError } = await supabase.from('OTP').delete().eq('id', otpId);
      if (cleanupError) {
        console.error('Failed to clean up unsent OTP:', cleanupError.message);
      }
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please check your email address.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent to your email',
        email: userEmail,
        role: user.role,
        requiresOtp: true,
        resendAvailableAt: new Date(
          Date.now() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000
        ).toISOString(),
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
