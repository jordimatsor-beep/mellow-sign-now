-- Add updated_at column to credit_packs table
ALTER TABLE public.credit_packs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Optional: Add trigger to automatically update updated_at (good practice)
CREATE OR REPLACE FUNCTION public.handle_updated_at()    
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS on_credit_packs_updated ON public.credit_packs;
CREATE TRIGGER on_credit_packs_updated
    BEFORE UPDATE ON public.credit_packs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
