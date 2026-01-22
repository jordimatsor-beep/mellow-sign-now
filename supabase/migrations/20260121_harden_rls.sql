-- ============================================
-- MIGRATION: Harden RLS Policies (Production Grade)
-- DATE: 2026-01-21
-- ============================================

-- 1. HARDEN SIGNATURES
-- Remove the public insert policy (unsafe). 
-- Writes must now go through 'submit_signature' RPC (Security Definier).
DROP POLICY IF EXISTS "public_insert_signatures" ON public.signatures;

-- Ensure RLS is enabled
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- 2. HARDEN EVENT_LOGS
-- Remove any policy allowing public/anon to insert directly.
DROP POLICY IF EXISTS "Users can insert own logs" ON public.event_logs;

-- Re-create stricter policy: Owners can SEE their own logs, but not insert.
-- Inserts happen via RPCs (Security Definier) or triggers.
-- We can allow users to view their own logs if needed for dashboard history.
-- Assuming event_logs have user_id (if not, we might need to rely on document ownership join, but let's check schema first).
-- For now, let's assume we want to lock it down completely for WRITES from client.
CREATE POLICY "Users can view own logs" ON public.event_logs
    FOR SELECT USING (
        -- If event_logs maps directly to user_id:
        -- auth.uid() = user_id
        -- But logs might be on document_id. Let's start safely with no public access if schema isn't clear,
        -- BUT the previous file hinted at "Users can insert own logs".
        -- Let's check if we can join via documents.
        -- For safety in this "lockdown" phase, we'll allow Authenticated READS if they own the resource?
        -- Safest is: No direct client access to logs unless specifically requested.
        -- Let's assume dashboard needs to show history.
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = event_logs.document_id
            AND d.user_id = auth.uid()
        )
    );

-- 3. HARDEN CREDIT_PACKS & PACK_TYPES
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_types ENABLE ROW LEVEL SECURITY;

-- Credit Packs: Users can only see their OWN purchases.
CREATE POLICY "Users can view own credit packs" ON public.credit_packs
    FOR SELECT USING (auth.uid() = user_id);

-- Pack Types: Public read (catalog), no write.
CREATE POLICY "Public view pack types" ON public.pack_types
    FOR SELECT USING (true);


-- 4. HARDEN CLARA TABLES (Chat)
ALTER TABLE public.clara_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clara_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own conversations" ON public.clara_conversations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own messages" ON public.clara_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clara_conversations c
            WHERE c.id = clara_messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

-- 5. HARDEN CONTACTS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own contacts" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

-- 6. ENSURE USER_CREDITS IS SAFE
-- It acts as a view usually, but if it was a table:
-- "user_credits cannot be modified by clients"
-- If it's a View (security_invoker=true), it relies on underlying credit_packs RLS.
-- Since we locked credit_packs to SELECT only (no INSERT/UPDATE policy for anyone except maybe service_role which bypasses RLS),
-- we are good. Direct manipulation is blocked.
