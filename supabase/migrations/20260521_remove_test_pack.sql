-- Remove 'Prueba' test pack from the product catalog
UPDATE public.credit_packs
SET is_active = false
WHERE slug = 'test';
