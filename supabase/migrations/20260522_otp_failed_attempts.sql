-- Add OTP failed attempts counter to documents table
-- Allows sign-complete-v2 to lock out brute force attempts on OTP verification
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS otp_failed_attempts INTEGER DEFAULT 0;
