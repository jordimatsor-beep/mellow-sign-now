-- Migration: Add Security and OTP fields
-- Date: 2026-01-22
-- Description: Adds security_level to documents and OTP traceability fields to signatures.

-- 1. Update documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS security_level VARCHAR(50) DEFAULT 'standard' 
CHECK (security_level IN ('standard', 'whatsapp_otp'));

-- Add temp fields for OTP handling in documents (active challenge)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS otp_code_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS whatsapp_verification_status VARCHAR(50) DEFAULT 'pending'
CHECK (whatsapp_verification_status IN ('pending', 'sent', 'verified', 'failed'));

-- 2. Update signatures table
ALTER TABLE public.signatures
ADD COLUMN IF NOT EXISTS otp_channel VARCHAR(20) DEFAULT 'none' 
CHECK (otp_channel IN ('none', 'whatsapp')),
ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
-- Storing a reference or hash of the code for traceability/audit (never plain text)
ADD COLUMN IF NOT EXISTS otp_code_ref VARCHAR(255);

-- 3. Update comments/descriptions
COMMENT ON COLUMN public.documents.security_level IS 'Security level required for signing: standard or whatsapp_otp';
COMMENT ON COLUMN public.signatures.otp_channel IS 'Channel used for 2FA verification';
