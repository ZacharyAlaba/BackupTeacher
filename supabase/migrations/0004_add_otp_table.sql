-- Add OTP table for 2FA authentication
create table if not exists "OTP" (
  id text primary key,
  email text not null,
  code text not null unique,
  attempts integer not null default 0,
  "expiresAt" timestamp without time zone not null,
  "createdAt" timestamp without time zone not null default now(),
  "updatedAt" timestamp without time zone not null default now()
);

-- Create index on email for faster lookups
create index if not exists "OTP_email_idx" on "OTP"(email);
