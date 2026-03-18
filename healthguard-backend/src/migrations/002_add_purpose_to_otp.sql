-- Add purpose column to otp_codes table to distinguish between registration and password_reset
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'registration';

-- Make registration_data nullable to support password reset scenarios where registration_data is not needed
ALTER TABLE otp_codes ALTER COLUMN registration_data DROP NOT NULL;

-- Create index for faster purpose lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(purpose);
