-- Migration: Create credit_transactions table for real transaction history
-- This replaces the hardcoded history in Credits.tsx

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'gift', 'refund', 'expiry')),
    amount INTEGER NOT NULL, -- positive for credits added, negative for credits used
    description TEXT NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL, -- optional link to document
    credit_pack_id UUID REFERENCES public.credit_packs(id) ON DELETE SET NULL, -- optional link to pack
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast user queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own transactions
CREATE POLICY "Users can view their own transactions"
    ON public.credit_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Only service role can insert (transactions created by backend)
CREATE POLICY "Service role can insert transactions"
    ON public.credit_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR current_setting('role', true) = 'service_role');

-- Create function to get transaction history for current user
CREATE OR REPLACE FUNCTION get_credit_transactions(p_limit INTEGER DEFAULT 20)
RETURNS TABLE(
    id UUID,
    type TEXT,
    amount INTEGER,
    description TEXT,
    document_id UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ct.id,
        ct.type,
        ct.amount,
        ct.description,
        ct.document_id,
        ct.created_at
    FROM credit_transactions ct
    WHERE ct.user_id = auth.uid()
    ORDER BY ct.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_credit_transactions(INTEGER) TO authenticated;

-- Comment
COMMENT ON TABLE public.credit_transactions IS 'Stores credit transaction history for users';
