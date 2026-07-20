-- ═══════════════════════════════════════════════════════════════════
-- Afiliados: eliminar los regalos de firmas gratis (+5 referidor / +3 referido)
-- La ÚNICA recompensa por traer clientes pasa a ser la comisión del 20%.
-- (Decisión de negocio 2026-07-17 — acuerdo Conektium)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Quitar el trigger que regalaba firmas al enviar el primer documento.
--    "Referido activo" ya no depende de enviar documentos, sino de PAGAR
--    (lo marca el webhook de Stripe al crear la primera comisión).
DROP TRIGGER IF EXISTS documents_referral_on_first_send ON public.documents;

-- 2. Neutralizar process_referral_reward: se conserva por compatibilidad pero
--    ya no acredita ninguna firma. No se elimina para no romper llamadas antiguas.
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Regalos de firmas retirados. La recompensa de afiliado es 100% monetaria
  -- (comisión 20% recurrente vía referral_commissions).
  RETURN jsonb_build_object('action', 'none', 'reason', 'credit_gifts_disabled');
END;
$$;

-- 3. La función trigger_process_referral_on_first_send queda huérfana (sin trigger).
--    La dejamos existir sin efecto; opcionalmente se puede borrar en el futuro.
