-- MIGRATION: 20260123_security_branding.sql

-- 1. Create Security Level ENUM
DO $$ BEGIN
    CREATE TYPE public.security_level_enum AS ENUM ('standard', 'whatsapp_otp');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update 'documents' table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS security_level public.security_level_enum DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS otp_code_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_verification_status VARCHAR(20); -- 'pending', 'sent', 'verified'

-- 3. Update 'signatures' table
ALTER TABLE public.signatures
ADD COLUMN IF NOT EXISTS otp_channel VARCHAR(20), -- 'none', 'whatsapp'
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_code_ref VARCHAR(20);
