-- Add issuer profile columns to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'España',
ADD COLUMN IF NOT EXISTS issuer_type text DEFAULT 'company';

-- Comment on columns for clarity
COMMENT ON COLUMN public.users.tax_id IS 'NIF or CIF of the issuer';
COMMENT ON COLUMN public.users.issuer_type IS 'Type of issuer: company or person';
