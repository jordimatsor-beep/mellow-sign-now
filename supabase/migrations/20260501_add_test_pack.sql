-- Add test pack (0.10€ / 30 credits) for testing purposes
-- Price is stored in cents: 10 = 0.10€

INSERT INTO public.credit_packs (slug, name, credits, price, description, popular, is_active)
VALUES (
  'test',
  'Prueba',
  30,
  10,  -- 10 céntimos = 0,10€
  'Pack de prueba para verificar el flujo de pago. Solo para testing.',
  false,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  credits     = EXCLUDED.credits,
  price       = EXCLUDED.price,
  description = EXCLUDED.description,
  is_active   = EXCLUDED.is_active;
