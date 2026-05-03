-- Add optional comment field for support chat rating
ALTER TABLE public.support_chats
ADD COLUMN IF NOT EXISTS rating_comment TEXT;
