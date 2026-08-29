# OTP Authentication Setup Guide

## Overview
Your Teacher Scheduling system now uses **Two-Factor Authentication (2FA)** with OTP (One-Time Password) sent via Gmail.

## Environment Variables Required

Add these variables to your `.env.local` file:

```env
# Gmail OTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Other existing variables...
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-database-url
```

## Setting Up Gmail App Password

### Step 1: Enable 2-Factor Authentication on Google Account
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll to "How you sign in to Google"
3. Click "2-Step Verification"
4. Follow the setup process

### Step 2: Generate Gmail App Password
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll to "App passwords" (only visible if 2FA is enabled)
3. Select "Mail" and "Windows Computer" (or your device)
4. Click "Generate"
5. Google will show a 16-character password like: `vdjm kipo bjho bgay`
6. Copy this password and add it to your `.env.local`:

```env
GMAIL_APP_PASSWORD=vdjmkipobihobgay
```

⚠️ **Security Note:** 
- Never share your app password
- Never commit `.env.local` to version control
- Store the password securely

## OTP Flow

### First Login Process
1. User enters email and password on the login page
2. System verifies credentials
3. On the user's first login, a 6-digit OTP is sent to the user's email
4. User enters OTP on verification screen
5. Upon successful OTP verification, the account is marked as verified and the user is logged in
6. Later logins in the same server process use the email/student ID and password without sending another OTP
7. Restarting `npm run dev` starts a new process; the next login sends one OTP again for demonstration

### Changing a Password
1. User enters the current password and a new password
2. System sends a separate verification OTP to the account email
3. User enters the OTP to confirm the password change

The password-change OTP is separate from first-login verification. After a successful password change, `otpVerifiedAt` is reset so the next login with the new password requires a fresh OTP.

### OTP Configuration
- **OTP Length:** 6 digits
- **Validity Duration:** 5 minutes
- **Max Verification Attempts:** 5 attempts
- **Email Service:** Gmail (via Nodemailer)

## Database Schema

The system uses a new `OTP` table to store temporary OTP records:

```prisma
model OTP {
  id        String   @id @default(cuid())
  email     String
  code      String   @unique
  attempts  Int      @default(0)
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

## API Endpoints

 **Response:** `{ success: true, requiresOtp: boolean, email: string }`
 `requiresOtp` is `false` after the account has completed first-login verification.
- **Endpoint:** `POST /api/auth/send-otp`
- **Body:** `{ email: string, password: string }`
- **Response:** `{ success: true, message: string, email: string }`

### Verify OTP
- **Endpoint:** `POST /api/auth/verify-otp`
- **Body:** `{ email: string, otp: string }`
- **Response:** `{ success: true, message: string, email: string }`

## Testing the OTP System

### Test Credentials
- **Admin:** admin@school.edu / admin123
- **Teacher:** teacher@example.com / teacher123
- **Student:** STU001 / student123

### Test with Real Email
1. Replace `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env.local`
2. Update test user email addresses in the database
3. Try logging in to receive real OTP emails

## Troubleshooting

### "Gmail credentials not configured" error
- Ensure `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in `.env.local`
- Restart the development server after adding env variables

### OTP Email Not Received
1. Check spam/junk folders
2. Verify `GMAIL_USER` is correct
3. Ensure Gmail account has 2FA enabled
4. Check that the app password is correct (16 characters without spaces)

### "OTP has expired" error
- OTP is valid for only 5 minutes
- Stop and restart `npm run dev`, then sign in again to get a new OTP

### "Maximum OTP verification attempts exceeded"
- Too many wrong OTP attempts (limit: 5)
- Request a new OTP by going back and re-entering credentials

## Next Steps

1. ✅ Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to `.env.local`
2. ✅ Run database migration: `npx prisma migrate dev`
3. ✅ Restart development server: `npm run dev`
4. ✅ Test login with OTP flow
5. ✅ Deploy to production with env variables set in Vercel

## Security Best Practices

- ✅ OTP codes are one-time use only (deleted after verification)
- ✅ OTP automatically expires after 5 minutes
- ✅ Failed attempts are tracked (5 max before lockout)
- ✅ Gmail app password is securely stored in environment variables
- ✅ OTP is never logged or stored in plain text longer than necessary
