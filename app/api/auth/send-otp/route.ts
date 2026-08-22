import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateOTPCode, sendOTPEmail, getOTPExpiryTime } from '@/lib/otp-utils';
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
    const { email, password } = await request.json();

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
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .maybeSingle();

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

    // Generate OTP
    const otpCode = generateOTPCode();
    const expiryTime = getOTPExpiryTime();

    // Remove any existing OTP for this email, then insert the new one
    // (no unique constraint on email, so upsert-by-email isn't possible)
    await supabase.from('OTP').delete().eq('email', email);

    const { error: insertError } = await supabase.from('OTP').insert({
      id: randomUUID(),
      email,
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
      await supabase.from('OTP').delete().eq('email', email);
      return NextResponse.json(
        { error: 'Failed to send OTP email. Please check your email address.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent to your email',
        email: email,
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
