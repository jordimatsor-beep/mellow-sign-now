-- Support Chat System
-- Tables for live support chat between users and admin

-- Chat sessions
CREATE TABLE IF NOT EXISTS public.support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  admin_read BOOLEAN DEFAULT false,
  user_read BOOLEAN DEFAULT true
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.support_chats(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_chats_user_id ON public.support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_status ON public.support_chats(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_chat_id ON public.support_messages(chat_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_support_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_support_chats_updated ON public.support_chats;
CREATE TRIGGER on_support_chats_updated
  BEFORE UPDATE ON public.support_chats
  FOR EACH ROW EXECUTE FUNCTION update_support_chats_updated_at();

-- RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chats
DROP POLICY IF EXISTS "Users can view own chats" ON public.support_chats;
CREATE POLICY "Users can view own chats" ON public.support_chats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chats" ON public.support_chats;
CREATE POLICY "Users can insert own chats" ON public.support_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chats" ON public.support_chats;
CREATE POLICY "Users can update own chats" ON public.support_chats
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can see messages of their own chats
DROP POLICY IF EXISTS "Users can view messages of own chats" ON public.support_messages;
CREATE POLICY "Users can view messages of own chats" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE support_chats.id = support_messages.chat_id
        AND support_chats.user_id = auth.uid()
    )
  );

-- Users can insert messages in their own chats
DROP POLICY IF EXISTS "Users can insert messages in own chats" ON public.support_messages;
CREATE POLICY "Users can insert messages in own chats" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender = 'user' AND
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE support_chats.id = support_messages.chat_id
        AND support_chats.user_id = auth.uid()
    )
  );

-- Enable Realtime for live messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
