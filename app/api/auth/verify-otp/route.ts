import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OTP_CONFIG } from '@/lib/otp-utils';

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
    const { email, otp } = await request.json();

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

    // Find OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from('OTP')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('OTP fetch error:', fetchError);
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 404 }
      );
    }

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'OTP not found or expired' },
        { status: 404 }
      );
    }

    const expiryValue = String(otpRecord.expiresAt);
    const expiryDate = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(expiryValue)
      ? new Date(expiryValue)
      : new Date(`${expiryValue}Z`);

    if (Number.isNaN(expiryDate.getTime()) || Date.now() >= expiryDate.getTime()) {
      await supabase.from('OTP').delete().eq('email', email);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Check attempt count
    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      await supabase.from('OTP').delete().eq('email', email);
      return NextResponse.json(
        { error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' },
        { status: 429 }
      );
    }

    // Verify OTP code
    if (otpRecord.code !== otp) {
      // Increment attempts
      await supabase
        .from('OTP')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('email', email);

      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return NextResponse.json(
        {
          error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // OTP is valid - delete it so it can't be reused
    await supabase.from('OTP').delete().eq('email', email);

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
