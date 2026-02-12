-- CORRECCIÓN IMPORTANTE:
-- El sistema de créditos ha cambiado recientemente.
-- Ahora los créditos del usuario se guardan en la tabla 'user_credit_purchases', no en 'credit_packs'.
-- 'credit_packs' ahora solo sirve como catálogo de precios.

-- Ejecuta esto para añadir 1000 créditos a tu usuario:
UPDATE public.user_credit_purchases
SET credits_total = credits_total + 1000,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM public.users WHERE email = 'jordimatsor@gmail.com');
