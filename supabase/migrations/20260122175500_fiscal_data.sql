-- Migration: Add Strict Fiscal Data for Legal Contracts
-- Date: 2026-01-22
-- Description: Adds tax_id, legal_address, and other fiscal fields to users and documents to support AI contract generation.

-- 1. Update users table (Issuer/Emisor)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS legal_type VARCHAR(20) DEFAULT 'individual' CHECK (legal_type IN ('individual', 'company')),
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50), -- DNI/NIF/CIF
ADD COLUMN IF NOT EXISTS legal_address TEXT,
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

-- Add comments for clarity
COMMENT ON COLUMN public.users.legal_type IS 'Legal entity type: individual (autónomo/particular) or company (empresa)';
COMMENT ON COLUMN public.users.tax_id IS 'Fiscal ID (DNI, NIF, CIF) for contracts';
COMMENT ON COLUMN public.users.legal_address IS 'Full fiscal address for contracts';

-- 2. Update documents table (Receiver/Firmante)
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS signer_tax_id VARCHAR(50), -- DNI/CIF del firmante
ADD COLUMN IF NOT EXISTS signer_address TEXT; -- Domicilio del firmante

-- Note: signer_phone already exists in schema, but ensuring it's used for valid E.164
COMMENT ON COLUMN public.documents.signer_tax_id IS 'Fiscal ID of the signer for the contract header';
