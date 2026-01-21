-- ============================================
-- MIGRATION: Add phone to contacts
-- ============================================

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS phone TEXT;
