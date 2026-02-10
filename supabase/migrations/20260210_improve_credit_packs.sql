-- Create credit_packs table
CREATE TABLE IF NOT EXISTS public.credit_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE, -- 'basic', 'pro', 'business'
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price INTEGER NOT NULL, -- price in cents (e.g. 1200 for €12.00)
    description TEXT,
    popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active packs
CREATE POLICY "Allow public read access to active packs"
    ON public.credit_packs
    FOR SELECT
    USING (is_active = true);

-- Allow service role to manage packs (for admin/seed)
CREATE POLICY "Allow service role full access"
    ON public.credit_packs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE TRIGGER on_credit_packs_updated
    BEFORE UPDATE ON public.credit_packs
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Seed initial data (Upsert based on slug)
INSERT INTO public.credit_packs (slug, name, credits, price, description, popular, is_active)
VALUES
    ('basic', 'Básico', 10, 1200, 'Pack de inicio para uso personal', false, true),
    ('pro', 'Profesional', 30, 2900, 'Para profesionales y autónomos', true, true),
    ('business', 'Empresa', 100, 6900, 'Para empresas con volumen moderado', false, true)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    credits = EXCLUDED.credits,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    popular = EXCLUDED.popular,
    is_active = EXCLUDED.is_active;

-- Grant permissions if needed (usually public is enough for anon access if RLS allows it)
GRANT SELECT ON public.credit_packs TO anon, authenticated;
