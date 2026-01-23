-- Add phone, nif/cif, address to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS nif TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address TEXT;
