-- Support Chat Improvements
-- Add columns for rating and closing metadata

ALTER TABLE public.support_chats 
ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS closed_by TEXT CHECK (closed_by IN ('user', 'admin'));
