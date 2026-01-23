-- Add stripe_price_id to pack_types
ALTER TABLE public.pack_types 
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Optional: Add a comment
COMMENT ON COLUMN public.pack_types.stripe_price_id IS 'ID del Precio en Stripe (price_...)';
