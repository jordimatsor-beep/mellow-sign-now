-- Instrucciones:
-- 1. Reemplaza 'tu@email.com' con el email del usuario al que quieres añadir créditos.
-- 2. Ejecuta este script en el Supabase SQL Editor.

INSERT INTO public.credit_packs (
    user_id,
    pack_type,
    credits_total,
    price_paid,
    purchased_at
)
SELECT 
    id, 
    'business', -- Tipo de pack (para referencia)
    1000,       -- Cantidad de créditos a añadir
    0,          -- Precio pagado (0 para regalo/manual)
    NOW()
FROM public.users
WHERE email = 'tu@email.com';

-- Verificar el nuevo saldo
-- SELECT * FROM public.user_credits WHERE user_id = (SELECT id FROM public.users WHERE email = 'tu@email.com');
