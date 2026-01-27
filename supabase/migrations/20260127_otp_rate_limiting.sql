-- ============================================
-- MIGRATION: OTP Rate Limiting & Security Logs
-- Date: 2026-01-27
-- Description: Creates table to track and limit SMS OTP attempts.
-- ============================================

CREATE TABLE IF NOT EXISTS public.otp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    
    -- Security Metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Status
    success BOOLEAN DEFAULT FALSE, -- True if SMS was sent, False if failed/blocked
    blocked BOOLEAN DEFAULT FALSE, -- True if request was blocked by Rate Limit
    block_reason VARCHAR(50),      -- 'limit_doc', 'limit_ip', 'limit_global'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast Rate Limit Lookups
CREATE INDEX idx_otp_logs_document_id ON public.otp_logs(document_id);
CREATE INDEX idx_otp_logs_ip_address ON public.otp_logs(ip_address);
CREATE INDEX idx_otp_logs_created_at ON public.otp_logs(created_at DESC);

-- RLS Policies
ALTER TABLE public.otp_logs ENABLE ROW LEVEL SECURITY;

-- Deny ALL public access (Only Service Role can View/Insert)
-- No policies for Anon/Authenticated users imply strict denial by default.
-- This is critical to prevent user enumeration or log flooding from frontend.
