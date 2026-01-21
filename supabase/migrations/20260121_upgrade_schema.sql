-- MIGRATION: 20260121_upgrade_schema.sql

-- 1. Create LEGAL_TYPE enum
DO $$ BEGIN
    CREATE TYPE public.legal_type_enum AS ENUM ('individual', 'company');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update 'users' table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS legal_type public.legal_type_enum,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS legal_address TEXT,
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

-- 3. Update 'documents' table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS signer_tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS signer_address TEXT,
ADD COLUMN IF NOT EXISTS signer_company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS signer_phone VARCHAR(50);

-- 4. Create 'notifications' table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_document_id ON public.notifications(document_id);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications for their documents
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );
