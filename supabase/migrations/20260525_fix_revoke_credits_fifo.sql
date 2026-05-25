-- ============================================================
-- Fix: admin_revoke_credits — FIFO multi-pack correcto
-- Bug: la versión anterior buscaba UN solo pack con saldo >= amount,
--      fallando silenciosamente si el saldo estaba repartido en varios packs.
--      La transacción de crédito se insertaba pero los packs no se actualizaban.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_revoke_credits(
  target_user_id UUID,
  credit_amount  INTEGER,
  description    TEXT DEFAULT 'Admin revoked credits'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available        INTEGER;
  new_transaction_id UUID;
  v_remaining        INTEGER;
  v_pack             RECORD;
  v_deduct           INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF credit_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'El importe debe ser mayor que 0');
  END IF;

  -- Comprobar saldo total disponible
  SELECT COALESCE(SUM(credits_total - credits_used), 0)
  INTO v_available
  FROM public.user_credit_purchases
  WHERE user_id = target_user_id;

  IF v_available < credit_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', format(
        'El usuario solo tiene %s créditos disponibles, no se pueden revocar %s',
        v_available, credit_amount
      )
    );
  END IF;

  -- Registrar transacción
  INSERT INTO public.credit_transactions (user_id, type, amount, description)
  VALUES (target_user_id, 'revoked', -credit_amount, description)
  RETURNING id INTO new_transaction_id;

  -- FIFO real: consumir de múltiples packs en orden de antigüedad
  v_remaining := credit_amount;

  FOR v_pack IN
    SELECT id, (credits_total - credits_used) AS available
    FROM public.user_credit_purchases
    WHERE user_id = target_user_id
      AND (credits_total - credits_used) > 0
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_deduct := LEAST(v_remaining, v_pack.available);

    UPDATE public.user_credit_purchases
    SET credits_used = credits_used + v_deduct
    WHERE id = v_pack.id;

    v_remaining := v_remaining - v_deduct;
  END LOOP;

  -- Garantía de integridad: si queda saldo pendiente, es un bug
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Inconsistencia: no se pudieron revocar todos los créditos (quedan %)', v_remaining;
  END IF;

  RETURN json_build_object(
    'success',        true,
    'transaction_id', new_transaction_id,
    'message',        format('Revocados %s créditos', credit_amount)
  );
END;
$$;
