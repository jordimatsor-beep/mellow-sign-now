-- ============================================
-- EMAIL QUEUE SYSTEM MIGRATION
-- ============================================

-- Create email_queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN ('document_invitation', 'signed_notification', 'reminder', 'otp')),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'dead')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status_retry
  ON public.email_queue(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_email_queue_created_at
  ON public.email_queue(created_at);

-- RLS: Only service_role can access
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Policy: service_role only (for edge functions)
CREATE POLICY "service_role_only" ON public.email_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to service_role
GRANT ALL ON public.email_queue TO service_role;