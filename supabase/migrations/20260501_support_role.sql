-- Migration for Support Role & Credit Management

-- 1. Create is_support() helper
CREATE OR REPLACE FUNCTION public.is_support()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('support', 'admin')
    );
$$;

-- 2. Update support chats & messages RLS to use is_support()
DROP POLICY IF EXISTS "Admins can view all chats" ON public.support_chats;
CREATE POLICY "Support can view all chats"
ON public.support_chats FOR SELECT
USING ( public.is_support() );

DROP POLICY IF EXISTS "Admins can update all chats" ON public.support_chats;
CREATE POLICY "Support can update all chats"
ON public.support_chats FOR UPDATE
USING ( public.is_support() )
WITH CHECK ( public.is_support() );

DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Support can view all messages"
ON public.support_messages FOR SELECT
USING ( public.is_support() );

DROP POLICY IF EXISTS "Admins can insert messages" ON public.support_messages;
CREATE POLICY "Support can insert messages"
ON public.support_messages FOR INSERT
WITH CHECK ( public.is_support() );

-- 3. Create RPC to grant credits securely
CREATE OR REPLACE FUNCTION public.grant_credits(
    target_email TEXT,
    credits_amount INTEGER,
    description_text TEXT DEFAULT 'Créditos asignados por soporte'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
    result JSONB;
BEGIN
    -- Check permissions
    IF NOT public.is_support() THEN
        RAISE EXCEPTION 'No tienes permisos para otorgar créditos';
    END IF;

    -- Find user by email
    SELECT id INTO target_user_id FROM public.users WHERE email = target_email LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    -- Insert credit purchase record (type 'gift')
    INSERT INTO public.user_credit_purchases (user_id, pack_id, credits_total, credits_used, amount_paid, currency, status, payment_intent_id)
    VALUES (target_user_id, 'support_gift', credits_amount, 0, 0, 'EUR', 'completed', 'gift_' || gen_random_uuid());

    -- Record transaction
    INSERT INTO public.credit_transactions (user_id, type, amount, description)
    VALUES (target_user_id, 'gift', credits_amount, description_text);

    RETURN jsonb_build_object('success', true, 'message', 'Créditos otorgados correctamente', 'user_id', target_user_id);
END;
$$;

-- 4. Create RPC to set user roles securely
CREATE OR REPLACE FUNCTION public.set_user_role(
    target_email TEXT,
    new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Check permissions (only admins can set roles)
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'No tienes permisos para cambiar roles';
    END IF;

    -- Find user by email
    SELECT id INTO target_user_id FROM public.users WHERE email = target_email LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    -- Attempt to update role. If there's a constraint, we might need to alter it, but assume TEXT for now.
    UPDATE public.users SET role = new_role WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Rol actualizado correctamente');
END;
$$;
