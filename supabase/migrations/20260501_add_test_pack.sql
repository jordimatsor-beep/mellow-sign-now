-- Add test pack (0.50€ / 30 credits) for testing purposes
-- Price is stored in cents: 50 = 0.50€ (Stripe minimum for EUR)

INSERT INTO public.credit_packs (slug, name, credits, price, description, popular, is_active)
VALUES (
  'test',
  'Prueba',
  30,
  50,  -- 50 céntimos = 0,50€ (mínimo de Stripe en EUR)
  'Pack de prueba. 30 créditos por 0,50€.',
  false,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  credits     = EXCLUDED.credits,
  price       = EXCLUDED.price,
  description = EXCLUDED.description,
  is_active   = EXCLUDED.is_active;
