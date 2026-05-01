-- Admin RLS Policies for Support System

-- Admins can view all chats
DROP POLICY IF EXISTS "Admins can view all chats" ON public.support_chats;
CREATE POLICY "Admins can view all chats"
ON public.support_chats FOR SELECT
USING ( public.is_admin() );

-- Admins can update all chats
DROP POLICY IF EXISTS "Admins can update all chats" ON public.support_chats;
CREATE POLICY "Admins can update all chats"
ON public.support_chats FOR UPDATE
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- Admins can view all messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages"
ON public.support_messages FOR SELECT
USING ( public.is_admin() );

-- Admins can insert messages
DROP POLICY IF EXISTS "Admins can insert messages" ON public.support_messages;
CREATE POLICY "Admins can insert messages"
ON public.support_messages FOR INSERT
WITH CHECK ( public.is_admin() );
