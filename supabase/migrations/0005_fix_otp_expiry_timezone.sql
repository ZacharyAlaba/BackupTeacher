-- Store OTP expiry timestamps with their timezone so UTC values remain unambiguous.
alter table "OTP"
  alter column "expiresAt" type timestamp with time zone
  using "expiresAt" at time zone 'UTC';