import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OTP_CONFIG, markOTPVerifiedInCurrentProcess } from '@/lib/otp-utils';

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
    const { email: rawEmail, otp: rawOtp } = await request.json();
    const email = String(rawEmail || '').trim().toLowerCase();
    const otp = String(rawOtp || '').replace(/\D/g, '').padStart(OTP_CONFIG.LENGTH, '0');

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
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

    // Keep all recent records because Gmail can deliver OTP messages out of order.
    // Sort locally so verification does not depend on database column quoting.
    const { data: otpRecords, error: fetchError } = await supabase
      .from('OTP')
      .select('id,email,code,attempts,expiresAt,createdAt')
      .ilike('email', email);

    if (fetchError) {
      console.error('OTP fetch error:', fetchError.message);
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 404 }
      );
    }

    if (!otpRecords || otpRecords.length === 0) {
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const activeRecords = [...otpRecords]
      .sort((first, second) => String(second.createdAt).localeCompare(String(first.createdAt)))
      .filter((record) => {
      const expiryValue = String(record.expiresAt);
      const expiryDate = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(expiryValue)
        ? new Date(expiryValue)
        : new Date(`${expiryValue}Z`);
      return !Number.isNaN(expiryDate.getTime()) && now < expiryDate.getTime();
      });

    const matchingRecord = activeRecords.find((record) => {
      const storedCode = String(record.code || '').replace(/\D/g, '').padStart(OTP_CONFIG.LENGTH, '0');
      return storedCode === otp && record.attempts < OTP_CONFIG.MAX_ATTEMPTS;
    });

    if (!matchingRecord) {
      const latestRecord = activeRecords[0];
      if (!latestRecord) {
        await supabase.from('OTP').delete().eq('email', email);
        return NextResponse.json(
          { error: 'OTP has expired. Please request a new one.' },
          { status: 410 }
        );
      }

      if (activeRecords.every((record) => record.attempts >= OTP_CONFIG.MAX_ATTEMPTS)) {
        await supabase.from('OTP').delete().eq('email', email);
        return NextResponse.json(
          { error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' },
          { status: 429 }
        );
      }

      await supabase
        .from('OTP')
        .update({ attempts: latestRecord.attempts + 1 })
        .eq('id', latestRecord.id);

      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (latestRecord.attempts + 1);
      return NextResponse.json(
        {
          error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // A valid OTP consumes all outstanding codes for this login email.
    const [{ error: verificationUpdateError }] = await Promise.all([
      supabase.from('User').update({ otpVerifiedAt: new Date().toISOString() }).eq('email', email),
      supabase.from('OTP').delete().eq('email', email),
    ]);

    if (verificationUpdateError) {
      console.error('User OTP verification update error:', verificationUpdateError);
      return NextResponse.json(
        { error: 'OTP verified, but account verification could not be saved. Please run the latest database migration.' },
        { status: 500 }
      );
    }

    markOTPVerifiedInCurrentProcess(email);

    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified successfully',
        email: email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
