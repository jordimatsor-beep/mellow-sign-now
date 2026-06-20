-- ═══════════════════════════════════════════════════════════════════
-- Sistema de Referidos FirmaClara — Migración v1.1
-- Spec: docs/superpowers/specs/2026-06-20-referral-system-design.md
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Tablas ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- El UNIQUE constraint sobre 'code' ya crea su propio índice.
-- Solo añadimos el índice no-único sobre user_id.
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id         UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rewarded', 'invalid')),
  credits_to_referrer INTEGER     NOT NULL DEFAULT 5,
  credits_to_referred INTEGER     NOT NULL DEFAULT 3,
  rewarded_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status      ON public.referrals(status);

-- I4-FIX: Realtime UPDATE events necesitan REPLICA IDENTITY FULL para que
-- el filtro server-side (referrer_id=eq.X) funcione correctamente.
ALTER TABLE public.referrals REPLICA IDENTITY FULL;

-- ── 2. Row Level Security ────────────────────────────────────────────

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;

-- referral_codes: lookup público (el campo 'code' no es sensible — solo mapea code→user_id)
DROP POLICY IF EXISTS "Public code lookup"  ON public.referral_codes;
DROP POLICY IF EXISTS "Own code SELECT"     ON public.referral_codes;
DROP POLICY IF EXISTS "Own code INSERT"     ON public.referral_codes;
DROP POLICY IF EXISTS "Service full rc"     ON public.referral_codes;

CREATE POLICY "Public code lookup"
  ON public.referral_codes FOR SELECT
  USING (true);

CREATE POLICY "Own code INSERT"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service full rc"
  ON public.referral_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- referrals: usuarios solo ven sus propias filas
DROP POLICY IF EXISTS "Referrer sees own"  ON public.referrals;
DROP POLICY IF EXISTS "Referred sees self" ON public.referrals;
DROP POLICY IF EXISTS "Service full ref"   ON public.referrals;

CREATE POLICY "Referrer sees own"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Referred sees self"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

CREATE POLICY "Service full ref"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 3. Vista referral_stats ──────────────────────────────────────────

CREATE OR REPLACE VIEW public.referral_stats
WITH (security_invoker = true)
AS
SELECT
  r.referrer_id                                                                   AS user_id,
  COUNT(*)                                                                        AS total_invited,
  COUNT(*) FILTER (WHERE r.status = 'pending')                                   AS total_pending,
  COUNT(*) FILTER (WHERE r.status = 'rewarded')                                  AS total_active,
  COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0)  AS credits_earned,
  GREATEST(0, 50 - COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0)) AS credits_remaining
FROM public.referrals r
GROUP BY r.referrer_id;

-- ── 4. Funciones SQL ─────────────────────────────────────────────────

-- 4.1 Generador de código único (FC-XXXXXX, charset sin 0/O/1/I para evitar confusión)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars    TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code   TEXT;
  counter  INT  := 0;
BEGIN
  LOOP
    v_code := 'FC-';
    FOR i IN 1..6 LOOP
      v_code := v_code || substr(chars, (floor(random() * length(chars)) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE referral_codes.code = v_code);
    counter := counter + 1;
    IF counter > 200 THEN
      RAISE EXCEPTION 'referral_codes: no se puede generar código único tras 200 intentos';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- 4.2 get_or_create_referral_code: idempotente
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NULL THEN
    v_code := public.generate_referral_code();
    INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
  END IF;
  RETURN v_code;
END;
$$;

-- 4.3 process_referral_reward: recompensa al referidor y al referido
-- Llamada desde el trigger AFTER UPDATE de documents (ver sección 5.2)
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref           public.referrals%ROWTYPE;
  v_credits_acum  INT;
  v_referred_name TEXT;
  v_result        JSONB;
BEGIN
  -- C4: Verificar que el email del referido está confirmado
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_referred_id AND email_confirmed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'email_not_verified');
  END IF;

  -- 1. Buscar referral pendiente con lock (C8: evitar race condition doble reward)
  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referred_id = p_referred_id
    AND status      = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'no_pending_referral');
  END IF;

  -- 2. Verificar cap de 50 créditos del referidor
  SELECT COALESCE(SUM(credits_to_referrer), 0)
  INTO   v_credits_acum
  FROM   public.referrals
  WHERE  referrer_id = v_ref.referrer_id AND status = 'rewarded';

  -- 3. Marcar estado antes de acreditar (idempotencia)
  IF v_credits_acum >= 50 THEN
    -- C7: Cap alcanzado — referido igual recibe su bono, referidor no
    UPDATE public.referrals
    SET status = 'invalid', updated_at = now()
    WHERE id   = v_ref.id;
    v_result := jsonb_build_object('action', 'cap_reached', 'referrer_credited', false);
  ELSE
    UPDATE public.referrals
    SET status = 'rewarded', rewarded_at = now(), updated_at = now()
    WHERE id   = v_ref.id;
    v_result := jsonb_build_object('action', 'rewarded', 'referrer_credited', true,
                                    'referrer_id', v_ref.referrer_id::TEXT);
  END IF;

  -- 4. Créditos al referidor (solo si no llegó al cap)
  IF (v_result->>'referrer_credited')::BOOLEAN THEN
    SELECT COALESCE(name, email) INTO v_referred_name
    FROM   public.users WHERE id = p_referred_id;

    -- C1-FIX: add_firmas_creditos requiere contexto de billing activo en la transacción
    PERFORM set_config('app.billing_ctx', 'on', true);
    PERFORM public.add_firmas_creditos(
      p_user_id     := v_ref.referrer_id,
      p_credits     := v_ref.credits_to_referrer,
      p_session     := gen_random_uuid()::TEXT,
      p_description := 'Referido activo: ' || COALESCE(v_referred_name, 'nuevo usuario')
    );
  END IF;

  -- 5. Bono de bienvenida al referido (siempre, cap o no)
  -- Repetir set_config por si el bloque anterior no corrió (cuando cap_reached)
  PERFORM set_config('app.billing_ctx', 'on', true);
  PERFORM public.add_firmas_creditos(
    p_user_id     := p_referred_id,
    p_credits     := v_ref.credits_to_referred,
    p_session     := gen_random_uuid()::TEXT,
    p_description := 'Bono de bienvenida por invitación'
  );

  RETURN v_result;
END;
$$;

-- ── 5. Triggers ──────────────────────────────────────────────────────

-- 5.1 updated_at automático en referrals
CREATE OR REPLACE FUNCTION public.update_referrals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS referrals_updated_at ON public.referrals;
CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_referrals_updated_at();

-- 5.2 C3-FIX: Trigger AFTER UPDATE en documents
-- Dispara process_referral_reward cuando el usuario envía su primer documento.
-- NO modifica consumir_firma(). El reward es completamente independiente del billing.
CREATE OR REPLACE FUNCTION public.trigger_process_referral_on_first_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo disparar cuando status pasa a 'sent' desde otro estado
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    -- Solo si es el PRIMER documento enviado de este usuario
    IF (SELECT COUNT(*) FROM public.documents
        WHERE user_id = NEW.user_id AND status = 'sent') = 1 THEN
      -- I6-FIX: excepción en el referral NO cancela la transacción de firma
      BEGIN
        PERFORM public.process_referral_reward(NEW.user_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'process_referral_reward falló para user %: %', NEW.user_id, SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_referral_on_first_send ON public.documents;
CREATE TRIGGER documents_referral_on_first_send
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_referral_on_first_send();
