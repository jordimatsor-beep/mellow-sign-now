# Sistema de Referidos — Plan de Implementación

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el sistema de referidos peer-to-peer completo: tablas SQL, Edge Functions, hook useReferral, página /invita con animaciones, badge en sidebar, e integración en el flujo de registro.

**Architecture:** La recompensa se dispara vía AFTER UPDATE trigger en `documents` (cuando status cambia a 'sent') sin tocar `consumir_firma`. Las Edge Functions `get-referral-info` (autenticada) y `register-referral` (pública, service_role) gestionan lectura y vínculo. El frontend usa Supabase Realtime para toasts en tiempo real al referidor cuando un referido se activa.

**Tech Stack:** PostgreSQL · Supabase Edge Functions (Deno) · React 18 + TypeScript · Tailwind CSS 3 · shadcn/ui · Lucide · canvas-confetti (import dinámico)

**Spec:** `docs/superpowers/specs/2026-06-20-referral-system-design.md`

---

## Chunk 1: Base de datos

**Files:**
- Create: `supabase/migrations/20260620_referral_system.sql`

### Task 1: Migración SQL completa

- [ ] **Step 1: Crear el archivo de migración**

Crear `supabase/migrations/20260620_referral_system.sql` con el siguiente contenido:

```sql
-- ═══════════════════════════════════════════════════════════════════
-- Sistema de Referidos FirmaClara — Migración v1.1
-- Spec: docs/superpowers/specs/2026-06-20-referral-system-design.md
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Tablas ────────────────────────────────────────────────────────

CREATE TABLE public.referral_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- El UNIQUE constraint ya crea el índice sobre 'code'.
-- Solo añadimos el índice no-único sobre user_id.
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);

CREATE TABLE public.referrals (
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

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status      ON public.referrals(status);

-- I4-FIX: Realtime UPDATE events necesitan REPLICA IDENTITY FULL para que
-- el filtro server-side (referrer_id=eq.X) funcione.
ALTER TABLE public.referrals REPLICA IDENTITY FULL;

-- ── 2. Row Level Security ────────────────────────────────────────────

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;

-- referral_codes
CREATE POLICY "Own code SELECT"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Own code INSERT"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public code lookup"
  ON public.referral_codes FOR SELECT
  USING (true);   -- Solo lectura; el campo 'code' no es sensible (mapea code→user_id)

CREATE POLICY "Service full rc"
  ON public.referral_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- referrals: el referidor ve sus propias filas
CREATE POLICY "Referrer sees own"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- El referido puede ver SI fue referido (para el banner de bienvenida)
CREATE POLICY "Referred sees self"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referred_id);

-- Service role acceso total (Edge Functions con service_role key)
CREATE POLICY "Service full ref"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- NOTA: usuarios NO pueden INSERT/UPDATE/DELETE en referrals directamente.
-- Todo va por Edge Functions con service_role.

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

-- 4.1 Generador de código único (FC-XXXXXX, charset sin 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars   TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code    TEXT;
  counter INT  := 0;
BEGIN
  LOOP
    code := 'FC-';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, (floor(random() * length(chars)) + 1)::INT, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE referral_codes.code = code);
    counter := counter + 1;
    IF counter > 200 THEN
      RAISE EXCEPTION 'referral_codes: no se puede generar código único tras 200 intentos';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- 4.2 get_or_create_referral_code: idempotente, llamada desde get-referral-info EF
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

-- 4.3 process_referral_reward: llamada desde el trigger de documents
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
  -- C4: Verificar email confirmado del referido
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_referred_id AND email_confirmed_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'email_not_verified');
  END IF;

  -- 1. Buscar referral pendiente con lock (evitar race condition doble reward)
  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referred_id = p_referred_id
    AND status      = 'pending'
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'no_pending_referral');
  END IF;

  -- 2. Verificar cap de créditos del referidor (máx 50 por referidos)
  SELECT COALESCE(SUM(credits_to_referrer), 0)
  INTO   v_credits_acum
  FROM   public.referrals
  WHERE  referrer_id = v_ref.referrer_id AND status = 'rewarded';

  -- 3. Marcar estado (antes de acreditar para idempotencia)
  IF v_credits_acum >= 50 THEN
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

    -- C1-FIX: add_firmas_creditos requiere billing_ctx activo en la transacción
    PERFORM set_config('app.billing_ctx', 'on', true);
    PERFORM public.add_firmas_creditos(
      p_user_id     := v_ref.referrer_id,
      p_credits     := v_ref.credits_to_referrer,
      p_session     := gen_random_uuid()::TEXT,
      p_description := 'Referido activo: ' || COALESCE(v_referred_name, 'nuevo usuario')
    );
  END IF;

  -- 5. Bono de bienvenida al referido (siempre, cap o no)
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

-- 5.1 Trigger updated_at en referrals
CREATE OR REPLACE FUNCTION public.update_referrals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_referrals_updated_at();

-- 5.2 C3-FIX: Trigger AFTER UPDATE en documents → dispara reward en el primer envío
-- No modifica consumir_firma(); el reward es completamente independiente.
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

CREATE TRIGGER documents_referral_on_first_send
  AFTER UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_referral_on_first_send();
```

- [ ] **Step 2: Aplicar la migración en Supabase local**

```bash
npx supabase db reset
```

Si el proyecto no tiene Supabase local configurado, aplicar vía SQL Editor en el dashboard. Pegar el contenido de la migración directamente.

- [ ] **Step 3: Verificar funciones SQL manualmente**

En el SQL Editor de Supabase, ejecutar:

```sql
-- Test 1: generar código único
SELECT public.generate_referral_code();
-- Esperado: 'FC-XXXXXX' (6 chars alfanuméricos)

-- Test 2: get_or_create (con un UUID real de un usuario de prueba)
SELECT public.get_or_create_referral_code('TU-UUID-AQUI');
-- Esperado: mismo código en llamadas repetidas (idempotente)

-- Test 3: vista referral_stats vacía
SELECT * FROM public.referral_stats;
-- Esperado: sin filas (tabla referrals vacía)

-- Test 4: verificar RLS — ejecutar como usuario (con set role)
SET ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "TU-UUID-AQUI", "role": "authenticated"}';
SELECT * FROM public.referral_codes;
-- Esperado: solo fila propia o ninguna
RESET ROLE;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260620_referral_system.sql
git commit -m "feat(db): migración sistema de referidos — tablas, RLS, funciones, triggers"
```

---

## Chunk 2: Edge Functions

**Files:**
- Create: `supabase/functions/get-referral-info/index.ts`
- Create: `supabase/functions/register-referral/index.ts`
- Create: `supabase/functions/get-referrer-name/index.ts`

### Task 2: Edge Function `get-referral-info`

- [ ] **Step 1: Crear `supabase/functions/get-referral-info/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente autenticado con el JWT del usuario
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Cliente admin para operaciones que necesitan service_role
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener (o crear) el código de referido del usuario
    const { data: codeData, error: codeError } = await adminSupabase
      .rpc('get_or_create_referral_code', { p_user_id: user.id })
    if (codeError) throw codeError

    const code = codeData as string
    const baseUrl = Deno.env.get('APP_URL') ?? 'https://firmaclara.es'
    const url = `${baseUrl}/r/${code}`

    // Stats del usuario (desde la vista referral_stats)
    const { data: statsData } = await adminSupabase
      .from('referral_stats')
      .select('total_invited, total_pending, total_active, credits_earned, credits_remaining')
      .eq('user_id', user.id)
      .maybeSingle()

    const stats = statsData ?? {
      total_invited: 0,
      total_pending: 0,
      total_active: 0,
      credits_earned: 0,
      credits_remaining: 50,
    }

    // Lista de referidos con nombre (solo primer nombre, privacidad)
    const { data: referralsRaw } = await adminSupabase
      .from('referrals')
      .select('id, status, rewarded_at, created_at, referred_id')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Enriquecer con nombre del referido
    const referrals = await Promise.all(
      (referralsRaw ?? []).map(async (r) => {
        const { data: userData } = await adminSupabase
          .from('users')
          .select('name')
          .eq('id', r.referred_id)
          .maybeSingle()
        const fullName = userData?.name ?? ''
        const firstName = fullName.split(' ')[0] || 'Usuario'
        return {
          id: r.id,
          name: firstName,
          status: r.status,
          rewarded_at: r.rewarded_at,
          created_at: r.created_at,
        }
      })
    )

    return new Response(JSON.stringify({ code, url, stats, referrals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('get-referral-info error:', error)
    return new Response(JSON.stringify({ error: sanitizeErrorMessage(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

- [ ] **Step 2: Test local**

```bash
# Iniciar el servidor de funciones local (si está configurado)
npx supabase functions serve get-referral-info --env-file .env.local

# En otra terminal, con un JWT válido:
curl -i http://localhost:54321/functions/v1/get-referral-info \
  -H "Authorization: Bearer TU_JWT_AQUI"
# Esperado: { code: "FC-XXXXXX", url: "...", stats: {...}, referrals: [] }
```

### Task 3: Edge Function `register-referral`

- [ ] **Step 1: Crear `supabase/functions/register-referral/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FIFTEEN_MINUTES = 15 * 60 * 1000

function normalizeEmail(email: string): string {
  const [local, domain] = email.split('@')
  return `${local.split('+')[0]}@${domain}`.toLowerCase()
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    const { ref_code, new_user_id } = body ?? {}

    // Validación de formato
    if (!ref_code || !CODE_REGEX.test(ref_code)) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!new_user_id || !UUID_REGEX.test(new_user_id)) {
      return new Response(JSON.stringify({ error: 'invalid_user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // C2-FIX: Verificar que new_user_id existe y fue creado hace < 15 minutos
    const { data: { user: newUser }, error: userErr } = await adminSupabase.auth.admin.getUserById(new_user_id)
    if (userErr || !newUser) {
      return new Response(JSON.stringify({ error: 'invalid_user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const createdAt = new Date(newUser.created_at).getTime()
    if (Date.now() - createdAt > FIFTEEN_MINUTES) {
      return new Response(JSON.stringify({ error: 'registration_expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Buscar el referral_code → referrer_id
    const { data: codeRow, error: codeErr } = await adminSupabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', ref_code)
      .maybeSingle()

    if (codeErr || !codeRow) {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const referrerId = codeRow.user_id

    // C3 (defensa extra): auto-referido por UUID
    if (referrerId === new_user_id) {
      return new Response(JSON.stringify({ error: 'self_referral' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // C10: Normalizar emails para detectar alias '+' del mismo dominio
    const { data: referrerUser } = await adminSupabase.auth.admin.getUserById(referrerId)
    if (referrerUser?.user) {
      const referrerEmail = normalizeEmail(referrerUser.user.email ?? '')
      const newUserEmail  = normalizeEmail(newUser.email ?? '')
      if (referrerEmail && newUserEmail && referrerEmail === newUserEmail) {
        return new Response(JSON.stringify({ error: 'self_referral' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // INSERT en referrals (UNIQUE en referred_id previene duplicados)
    const { error: insertErr } = await adminSupabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_id: new_user_id,
        status: 'pending',
        credits_to_referrer: 5,
        credits_to_referred: 3,
      })

    if (insertErr) {
      // UNIQUE violation → ya existe, idempotente
      if (insertErr.code === '23505') {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      throw insertErr
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('register-referral error:', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

- [ ] **Step 2: Test local**

```bash
# Primero crear dos usuarios de prueba en Supabase local.
# Obtener el código del usuario A (referidor):
# SELECT code FROM referral_codes WHERE user_id = 'UUID-USUARIO-A';

# Luego llamar con el UUID del usuario B (nuevo, creado hace < 15 min):
curl -i -X POST http://localhost:54321/functions/v1/register-referral \
  -H 'Content-Type: application/json' \
  -d '{"ref_code": "FC-XXXXXX", "new_user_id": "UUID-USUARIO-B"}'
# Esperado: { "ok": true }

# Verificar en DB:
# SELECT * FROM referrals WHERE referred_id = 'UUID-USUARIO-B';
# Esperado: fila con status='pending'
```

### Task 4: Edge Function `get-referrer-name`

- [ ] **Step 1: Crear `supabase/functions/get-referrer-name/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflightResponse = handleCorsPreflightRequest(req)
  if (preflightResponse) return preflightResponse

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code') ?? ''

    // Siempre devolvemos 200 con name: null si el código no existe
    // para no confirmar si un código es válido (evitar enumeración).
    if (!CODE_REGEX.test(code)) {
      return new Response(JSON.stringify({ name: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar referrer_id por código
    const { data: codeRow } = await adminSupabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', code)
      .maybeSingle()

    if (!codeRow) {
      return new Response(JSON.stringify({ name: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obtener nombre del referidor (solo primer nombre)
    const { data: userData } = await adminSupabase
      .from('users')
      .select('name')
      .eq('id', codeRow.user_id)
      .maybeSingle()

    const fullName = userData?.name ?? ''
    const firstName = fullName.split(' ')[0] || null

    return new Response(JSON.stringify({ name: firstName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('get-referrer-name error:', error)
    return new Response(JSON.stringify({ name: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

- [ ] **Step 2: Commit Chunk 2**

```bash
git add supabase/functions/get-referral-info/ supabase/functions/register-referral/ supabase/functions/get-referrer-name/
git commit -m "feat(functions): edge functions referral — get-info, register, get-referrer-name"
```

---

## Chunk 3: Lógica Frontend + Tailwind

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/lib/referral.ts`
- Create: `src/hooks/useReferral.ts`

### Task 5: Tailwind keyframes (animaciones)

- [ ] **Step 1: Modificar `tailwind.config.ts` — añadir keyframes referral**

Dentro del bloque `keyframes: { ... }`, después de `"tilt"`, añadir:

```typescript
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(32px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'copy-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgba(16,185,129,0.45)' },
          '100%': { boxShadow: '0 0 0 14px rgba(16,185,129,0)' },
        },
        'badge-pop': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':      { transform: 'scale(1.25)' },
        },
        'reveal-from-left': {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to:   { clipPath: 'inset(0 0% 0 0)' },
        },
```

Dentro del bloque `animation: { ... }`, añadir:

```typescript
        'slide-in-right':   'slide-in-right 350ms ease-out forwards',
        'fade-up':          'fade-up 400ms ease-out forwards',
        'copy-pulse':       'copy-pulse 500ms ease-out forwards',
        'badge-pop':        'badge-pop 300ms ease-out',
        'reveal-from-left': 'reveal-from-left 600ms ease-out forwards',
```

- [ ] **Step 2: Verificar build**

```bash
npm run build
# Esperado: sin errores de Tailwind
```

### Task 6: `src/lib/referral.ts`

- [ ] **Step 1: Crear `src/lib/referral.ts`**

```typescript
const REF_KEY    = 'fc_ref'
const REF_TS_KEY = 'fc_ref_ts'
const CODE_REGEX = /^FC-[A-Z2-9]{6}$/
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

// Captura el código de referido de la URL actual y lo guarda en localStorage.
// First-touch attribution: no sobreescribe si ya hay uno guardado.
// Llamar en App.tsx en el mount inicial.
export function captureReferralCode(): void {
  const urlParams = new URLSearchParams(window.location.search)
  const pathMatch = window.location.pathname.match(/^\/r\/(FC-[A-Z2-9]{6})$/)
  const ref = urlParams.get('ref') || pathMatch?.[1]
  if (ref && CODE_REGEX.test(ref) && !localStorage.getItem(REF_KEY)) {
    localStorage.setItem(REF_KEY, ref)
    localStorage.setItem(REF_TS_KEY, Date.now().toString())
  }
}

// Devuelve el código almacenado si existe y no ha caducado (7 días).
export function getStoredReferralCode(): string | null {
  const ref = localStorage.getItem(REF_KEY)
  const ts  = Number(localStorage.getItem(REF_TS_KEY) || 0)
  if (!ref || Date.now() - ts > SEVEN_DAYS) {
    clearReferralCode()
    return null
  }
  return ref
}

// Limpia el código tras un registro exitoso o caducidad.
export function clearReferralCode(): void {
  localStorage.removeItem(REF_KEY)
  localStorage.removeItem(REF_TS_KEY)
}
```

### Task 7: `src/hooks/useReferral.ts`

- [ ] **Step 1: Crear `src/hooks/useReferral.ts`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface ReferralEntry {
  id: string
  name: string
  status: 'pending' | 'rewarded' | 'invalid'
  rewarded_at: string | null
  created_at: string
}

export interface ReferralStats {
  total_invited: number
  total_pending: number
  total_active: number
  credits_earned: number
  credits_remaining: number
}

export interface ReferralData {
  code: string
  url: string
  stats: ReferralStats
  referrals: ReferralEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const MILESTONES = [5, 10, 25, 50]

export function useReferral(): ReferralData {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [url, setUrl] = useState('')
  const [stats, setStats] = useState<ReferralStats>({
    total_invited: 0,
    total_pending: 0,
    total_active: 0,
    credits_earned: 0,
    credits_remaining: 50,
  })
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const triggeredMilestones = useRef<Set<number>>(new Set())

  const fetchData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-referral-info')
      if (fnError) throw fnError
      setCode(data.code)
      setUrl(data.url)
      setStats(data.stats)
      setReferrals(data.referrals)
    } catch {
      setError('No se pudo cargar la información de referidos.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Supabase Realtime: escuchar cambios en referrals (I4-FIX: REPLICA IDENTITY FULL)
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('referrals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { status: string; referred_id: string }
          if (updated.status === 'rewarded') {
            // Actualizar estado local sin refetch completo
            setReferrals((prev) =>
              prev.map((r) =>
                r.id === (payload.new as ReferralEntry).id
                  ? { ...r, status: 'rewarded', rewarded_at: new Date().toISOString() }
                  : r
              )
            )
            setStats((prev) => {
              const newEarned = prev.credits_earned + 5
              // Milestones
              for (const m of MILESTONES) {
                if (newEarned >= m && !triggeredMilestones.current.has(m)) {
                  triggeredMilestones.current.add(m)
                  const msgs: Record<number, string> = {
                    5:  '¡Primer hito! Ya tienes 5 firmas ganadas',
                    10: '¡10 firmas ganadas con referidos! Sigue así',
                    25: '¡Increíble! 25 firmas. Eres embajador de FirmaClara',
                    50: '¡Máximo alcanzado! 50 firmas ganadas. Muchísimas gracias',
                  }
                  setTimeout(() => toast.success(msgs[m] ?? ''), 600)
                }
              }
              return {
                ...prev,
                total_pending: Math.max(0, prev.total_pending - 1),
                total_active: prev.total_active + 1,
                credits_earned: newEarned,
                credits_remaining: Math.max(0, prev.credits_remaining - 5),
              }
            })
            const name = (payload.new as ReferralEntry).name || 'Alguien'
            toast.success(`¡${name} acaba de enviar su primer contrato! +5 créditos para ti`)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return { code, url, stats, referrals, isLoading, error, refetch: fetchData }
}
```

- [ ] **Step 2: Commit Chunk 3**

```bash
git add tailwind.config.ts src/lib/referral.ts src/hooks/useReferral.ts
git commit -m "feat(referral): lógica frontend — lib/referral, hook useReferral, keyframes Tailwind"
```

---

## Chunk 4: Componentes UI

**Files:**
- Create: `src/components/referral/ReferralCertificate.tsx`
- Create: `src/components/referral/ShareButtons.tsx`
- Create: `src/components/referral/ReferralStats.tsx`
- Create: `src/components/referral/HowItWorks.tsx`
- Create: `src/components/referral/ReferralList.tsx`
- Create: `src/components/referral/ReferralRow.tsx`
- Create: `src/components/referral/ReferralEmptyState.tsx`
- Create: `src/components/referral/MilestoneCelebration.tsx`

### Task 8: `ReferralCertificate.tsx` + `ShareButtons.tsx`

- [ ] **Step 1: Crear `src/components/referral/ShareButtons.tsx`**

```tsx
import { MessageCircle, Mail, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ShareButtonsProps {
  url: string
}

export function ShareButtons({ url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const whatsappText = encodeURIComponent(
    `Hola, te paso FirmaClara: una forma muy sencilla y barata de firmar contratos online. Puedes empezar gratis: ${url}`
  )
  const emailSubject = encodeURIComponent('Te recomiendo FirmaClara para firmar contratos')
  const emailBody = encodeURIComponent(
    `Hola,\n\nTe recomiendo FirmaClara, una herramienta para firmar contratos online en segundos, sin instalaciones.\n\nEmpieza gratis aquí: ${url}\n\nSaludos`
  )

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
        asChild
      >
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        asChild
      >
        <a href={`mailto:?subject=${emailSubject}&body=${emailBody}`}>
          <Mail className="h-4 w-4" />
          Email
        </a>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? '¡Copiado!' : 'Copiar'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/referral/ReferralCertificate.tsx`**

```tsx
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileCheck, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShareButtons } from './ShareButtons'

interface ReferralCertificateProps {
  code: string
  url: string
}

export function ReferralCertificate({ code, url }: ReferralCertificateProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 border-dashed transition-all duration-200',
        copied
          ? 'border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20'
          : 'border-primary/25 bg-primary/5'
      )}
    >
      {/* Watermark diagonal */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Sello top-right */}
      <FileCheck className="absolute right-4 top-4 h-5 w-5 text-primary/40" />

      <CardContent className="p-6">
        {/* Eyebrow */}
        <p className="mb-3 text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          Código de invitación
        </p>

        {/* Divider */}
        <div className="mb-4 h-px bg-primary/15" />

        {/* URL copiable */}
        <div className="mb-4 flex items-center gap-3">
          <code className="flex-1 rounded bg-background/60 px-3 py-2 font-mono text-sm text-foreground/80 break-all">
            {url}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={cn(
              'shrink-0 gap-2 transition-all duration-200',
              copied && 'border-emerald-500 text-emerald-700 animate-copy-pulse'
            )}
          >
            {copied ? (
              <><Check className="h-4 w-4" /> ¡Copiado!</>
            ) : (
              <><Copy className="h-4 w-4" /> Copiar enlace</>
            )}
          </Button>
        </div>

        {/* Divider punteado */}
        <div className="mb-4 border-t border-dashed border-primary/15" />

        {/* Botones compartir */}
        <ShareButtons url={url} />
      </CardContent>
    </Card>
  )
}
```

### Task 9: `ReferralStats.tsx`

- [ ] **Step 1: Crear `src/components/referral/ReferralStats.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { ReferralStats as Stats } from '@/hooks/useReferral'

function useCountUp(target: number, delay = 0, duration = 800): number {
  const [value, setValue] = useState(0)
  const frame = useRef<number>(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const t = Math.min(elapsed / duration, 1)
        const progress = 1 - (1 - t) * (1 - t) // easeOutQuad
        setValue(Math.round(target * progress))
        if (t < 1) frame.current = requestAnimationFrame(animate)
        else setValue(target)
      }
      frame.current = requestAnimationFrame(animate)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame.current) }
  }, [target, delay, duration])

  return value
}

interface ReferralStatsProps {
  stats: Stats
}

export function ReferralStats({ stats }: ReferralStatsProps) {
  const invited  = useCountUp(stats.total_invited,   0)
  const active   = useCountUp(stats.total_active,  150)
  const earned   = useCountUp(stats.credits_earned, 300)

  const nextMilestone = [5, 10, 25, 50].find((m) => m > stats.credits_earned) ?? 50
  const prevMilestone = [0, 5, 10, 25].filter((m) => m <= stats.credits_earned).at(-1) ?? 0
  const progressPct   = stats.credits_earned >= 50
    ? 100
    : Math.round(((stats.credits_earned - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  const progressLabel = stats.credits_earned >= 50
    ? 'Máximo alcanzado · Has ganado 50 firmas con referidos'
    : `Invita a ${Math.max(1, Math.ceil((nextMilestone - stats.credits_earned) / 5))} personas más para ganar tus próximas 5 firmas`

  const counters = [
    { label: 'invitados',        value: invited, highlight: false },
    { label: 'activos',          value: active,  highlight: false },
    { label: 'créditos ganados', value: earned,  highlight: true  },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {counters.map(({ label, value, highlight }) => (
          <Card
            key={label}
            className={highlight ? 'ring-2 ring-primary/20' : ''}
          >
            <CardContent className="flex flex-col items-center py-5">
              <span className="text-4xl font-bold tracking-tight">{value}</span>
              <span className="mt-1 text-sm text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar hacia próximo hito */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">{progressLabel}</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-[1200ms] cubic-bezier(0.22,1,0.36,1)"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

### Task 10: `HowItWorks.tsx`

- [ ] **Step 1: Crear `src/components/referral/HowItWorks.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Share2, UserCheck, Gift } from 'lucide-react'

const STEPS = [
  {
    icon: Share2,
    title: 'Comparte tu enlace',
    description: 'Envíalo a autónomos o pymes que firmen contratos habitualmente',
  },
  {
    icon: UserCheck,
    title: 'Se registran y firman',
    description: 'Cuando envían su primer contrato, el sistema lo confirma automáticamente',
  },
  {
    icon: Gift,
    title: 'Ambos ganáis',
    description: 'Tú recibes 5 firmas. Ellos, 3 de bienvenida',
  },
]

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) { setVisible(true); return }

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="space-y-4">
      <h2 className="text-lg font-semibold">Cómo funciona</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className={[
              'flex flex-col gap-3 rounded-lg border p-4',
              visible ? 'animate-reveal-from-left opacity-100' : 'opacity-0',
            ].join(' ')}
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Task 11: `ReferralRow.tsx`, `ReferralEmptyState.tsx`, `ReferralList.tsx`

- [ ] **Step 1: Crear `src/components/referral/ReferralRow.tsx`**

```tsx
import { useRef, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { ReferralEntry } from '@/hooks/useReferral'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG = {
  pending:  { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  rewarded: { label: 'Activo',    className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  invalid:  { label: 'No válido', className: 'bg-muted text-muted-foreground' },
}

interface ReferralRowProps {
  entry: ReferralEntry
  index: number
}

export function ReferralRow({ entry, index }: ReferralRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) { setVisible(true); return }

    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); observer.unobserve(e.target) } },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const cfg = STATUS_CONFIG[entry.status]
  const dateStr = entry.rewarded_at
    ? format(new Date(entry.rewarded_at), 'dd/MM/yyyy', { locale: es })
    : format(new Date(entry.created_at), 'dd/MM/yyyy', { locale: es })

  return (
    <div
      ref={ref}
      className={[
        'flex items-center justify-between rounded-lg border p-3 transition-all',
        visible ? 'animate-slide-in-right opacity-100' : 'opacity-0',
      ].join(' ')}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div>
        <p className="text-sm font-medium">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          {entry.status === 'rewarded'
            ? `Activo · +5 créditos · ${dateStr}`
            : entry.status === 'pending'
            ? 'Registrado · Pendiente de enviar su primer contrato'
            : 'No válido'}
        </p>
      </div>
      <Badge variant="outline" className={cfg.className}>
        {cfg.label}
      </Badge>
    </div>
  )
}
```

- [ ] **Step 2: Crear `src/components/referral/ReferralEmptyState.tsx`**

```tsx
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReferralEmptyStateProps {
  onCopy: () => void
}

export function ReferralEmptyState({ onCopy }: ReferralEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Users className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-medium">Todavía no has invitado a nadie</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Comparte tu enlace con clientes, proveedores o colegas autónomos.
        Cuando envíen su primer contrato, los dos ganáis créditos.
      </p>
      <Button onClick={onCopy} className="mt-2">
        Copiar mi enlace
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Crear `src/components/referral/ReferralList.tsx`**

```tsx
import type { ReferralEntry } from '@/hooks/useReferral'
import { ReferralRow } from './ReferralRow'
import { ReferralEmptyState } from './ReferralEmptyState'

interface ReferralListProps {
  referrals: ReferralEntry[]
  onCopy: () => void
}

export function ReferralList({ referrals, onCopy }: ReferralListProps) {
  if (referrals.length === 0) {
    return <ReferralEmptyState onCopy={onCopy} />
  }
  return (
    <div className="space-y-2">
      {referrals.map((entry, i) => (
        <ReferralRow key={entry.id} entry={entry} index={i} />
      ))}
    </div>
  )
}
```

### Task 12: `MilestoneCelebration.tsx`

- [ ] **Step 1: Crear `src/components/referral/MilestoneCelebration.tsx`**

```tsx
import { useEffect, useRef } from 'react'

interface MilestoneCelebrationProps {
  creditsEarned: number
}

const MILESTONES = [5, 10, 25, 50]

export function MilestoneCelebration({ creditsEarned }: MilestoneCelebrationProps) {
  const triggered = useRef<Set<number>>(new Set())

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const hit = MILESTONES.find((m) => creditsEarned >= m && !triggered.current.has(m))
    if (!hit) return
    triggered.current.add(hit)

    // Import dinámico para no cargar canvas-confetti en el bundle principal
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#EF4444', '#10B981', '#F59E0B', '#ffffff'],
      })
    }).catch(() => { /* silencioso si falla */ })
  }, [creditsEarned])

  return null // Sin DOM — solo efectos secundarios
}
```

- [ ] **Step 2: Commit Chunk 4**

```bash
git add src/components/referral/
git commit -m "feat(referral): componentes UI — certificado, stats, lista, pasos, confetti"
```

---

## Chunk 5: Páginas e Integración Completa

**Files:**
- Create: `src/pages/Invita.tsx`
- Create: `src/pages/ReferralRedirect.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/BottomNavigation.tsx`
- Modify: `src/pages/auth/Register.tsx`

### Task 13: Página `Invita.tsx`

- [ ] **Step 1: Crear `src/pages/Invita.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { ArrowLeft, Gift, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReferral } from '@/hooks/useReferral'
import { ReferralCertificate } from '@/components/referral/ReferralCertificate'
import { ReferralStats } from '@/components/referral/ReferralStats'
import { HowItWorks } from '@/components/referral/HowItWorks'
import { ReferralList } from '@/components/referral/ReferralList'
import { MilestoneCelebration } from '@/components/referral/MilestoneCelebration'

export default function Invita() {
  const { code, url, stats, referrals, isLoading, error, refetch } = useReferral()

  const handleCopy = async () => {
    if (url) await navigator.clipboard.writeText(url)
  }

  return (
    <div className="container max-w-2xl px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Gift className="h-6 w-6 text-primary" />
            Invita y gana firmas gratis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cada autónomo o pyme que empiece con FirmaClara gracias a ti te da 5 firmas.
            Los dos ganáis.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </div>
      )}

      {/* Contenido */}
      {!isLoading && !error && code && (
        <>
          <MilestoneCelebration creditsEarned={stats.credits_earned} />

          {/* Certificado + compartir */}
          <ReferralCertificate code={code} url={url} />

          {/* Contadores */}
          <ReferralStats stats={stats} />

          {/* Cómo funciona */}
          <HowItWorks />

          {/* Lista de referidos */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Mis referidos</h2>
            <ReferralList referrals={referrals} onCopy={handleCopy} />
          </div>
        </>
      )}
    </div>
  )
}
```

### Task 14: Página `ReferralRedirect.tsx`

- [ ] **Step 1: Crear `src/pages/ReferralRedirect.tsx`**

```tsx
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

const CODE_REGEX = /^FC-[A-Z2-9]{6}$/

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>()

  useEffect(() => {
    if (code && CODE_REGEX.test(code)) {
      // Guardar solo si no hay ya uno (first-touch)
      if (!localStorage.getItem('fc_ref')) {
        localStorage.setItem('fc_ref', code)
        localStorage.setItem('fc_ref_ts', Date.now().toString())
      }
    }
    // Siempre redirigir — no revelar si el código es válido
    window.location.replace('/register')
  }, [code])

  return null
}
```

### Task 15: Modificar `src/App.tsx`

- [ ] **Step 1: Añadir imports lazy + captureReferralCode**

En `src/App.tsx`:

1. Añadir estos dos imports lazy junto al resto:
```tsx
const Invita = lazy(() => import("@/pages/Invita"));
const ReferralRedirect = lazy(() => import("@/pages/ReferralRedirect"));
```

2. Añadir import de `captureReferralCode` y `useEffect`:
```tsx
import { useEffect } from "react";
import { captureReferralCode } from "@/lib/referral";
```

3. En el componente `App`, antes del `return`, añadir:
```tsx
useEffect(() => { captureReferralCode() }, [])
```

4. En las rutas públicas (`<Route element={<PublicLayout />}>`), añadir:
```tsx
<Route path="/r/:code" element={<ReferralRedirect />} />
```

5. Dentro del `<Route element={<AuthenticatedLayout />}>`, añadir:
```tsx
<Route path="/invita" element={<Invita />} />
```

**Resultado esperado en App.tsx:**

Sección lazy imports — añadir las dos líneas.

Sección rutas públicas — añadir `/r/:code`.

Sección rutas autenticadas — añadir `/invita`.

- [ ] **Step 2: Verificar que el build compila**

```bash
npm run build
# Esperado: sin errores de TypeScript
```

### Task 16: Modificar `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Añadir entrada "Invita y gana" con badge**

Modificaciones en `src/components/layout/Sidebar.tsx`:

1. Añadir import `Gift` a la lista de Lucide icons:
```tsx
import { Home, FileText, CreditCard, Settings, HelpCircle, Plus, User, LifeBuoy, FileStack, Gift } from "lucide-react";
```

2. Añadir import del hook:
```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
```

3. Dentro del componente `Sidebar`, después de `const { credits } = useCredits()`, añadir:
```tsx
  const { data: pendingReferrals = 0 } = useQuery({
    queryKey: ['referral-pending-count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const { data } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'pending')
      return data ?? 0
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
```

4. En el array `navItems`, añadir después de la entrada de `/credits`:
```tsx
    { to: "/invita", icon: Gift, label: "Invita y gana", badge: pendingReferrals > 0 ? pendingReferrals : undefined },
```

5. El badge ya se renderiza automáticamente por el patrón existente:
```tsx
{item.badge !== undefined && item.badge !== null && (
  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
    {item.badge}
  </span>
)}
```
> **Nota:** cambiar el color del badge de `/invita` a `bg-amber-500 text-white` para distinguirlo de los créditos. Esto requiere hacer el badge condicional por item — ver el render actual en Sidebar.tsx y ajustar.

### Task 17: Modificar `src/components/layout/BottomNavigation.tsx`

- [ ] **Step 1: Añadir /invita a la navegación móvil**

En `BottomNavigation.tsx`, añadir `Gift` a los imports:
```tsx
import { Home, FileText, CreditCard, Settings, Users, Gift } from "lucide-react";
```

Añadir al array `navItems` (antes de Settings, para no sobrepasar el espacio):
```tsx
  { to: "/invita", icon: Gift, label: "Invita" },
```

> **Nota:** BottomNavigation tiene 5 items actualmente. Con el nuevo item serán 6, lo que puede quedar apretado en móvil. Valorar si eliminar "Ajustes" del bottom nav y dejarlo solo en el sidebar, o reducir el label a "Invita".

### Task 18: Modificar `src/pages/auth/Register.tsx`

- [ ] **Step 1: Añadir banner de referral + llamada a register-referral**

Añadir estos imports al principio de `Register.tsx`:
```tsx
import { getStoredReferralCode, clearReferralCode } from '@/lib/referral'
import { supabase as supabaseClient } from '@/lib/supabase'
```

Añadir estado del banner después de `const [isSuccess, setIsSuccess] = useState(false)`:
```tsx
    const [referrerName, setReferrerName] = useState<string | null>(null)
    const storedRef = getStoredReferralCode()
```

Añadir `useEffect` para obtener el nombre del referidor (para el banner):
```tsx
    useEffect(() => {
        if (!storedRef) return
        supabaseClient.functions
            .invoke('get-referrer-name', {
                // GET no acepta body; usar query param via custom fetch
            })
            .then(() => {})
            // Alternativa: fetch directo
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-referrer-name?code=${storedRef}`, {
            headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }
        })
        .then(r => r.json())
        .then(d => setReferrerName(d.name ?? null))
        .catch(() => {})
    }, [storedRef])
```

En `onSubmit`, después de `setIsSuccess(true)`, añadir la llamada a `register-referral`:
```tsx
            // Registrar referral si viene de invitación
            if (storedRef && data?.user?.id) {
                supabase.functions.invoke('register-referral', {
                    body: { ref_code: storedRef, new_user_id: data.user.id }
                }).then(() => {
                    clearReferralCode()
                }).catch(() => {
                    // Best-effort: no bloquear el registro si falla
                    clearReferralCode()
                })
            }
```

> **Importante:** el `supabase.auth.signUp` ya existente devuelve `{ data, error }`. Cambiar la destructuración actual:
```tsx
const { error } = await supabase.auth.signUp({ ... })
```
por:
```tsx
const { data, error } = await supabase.auth.signUp({ ... })
```

Añadir el banner de referral **justo antes** del `<Form ...>` en el JSX, condicionado a `storedRef`:
```tsx
            {storedRef && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <Gift className="h-4 w-4 shrink-0" />
                    <span>
                        {referrerName
                            ? <><strong>{referrerName}</strong> te ha invitado. Ambos ganaréis créditos gratis al enviar tu primer contrato.</>
                            : <>Te han invitado a FirmaClara. Ambos ganaréis <strong>créditos gratis</strong> al enviar tu primer contrato.</>
                        }
                    </span>
                </div>
            )}
```

- [ ] **Step 2: Verificar flujo completo en desarrollo**

```bash
npm run dev
# Ir a http://localhost:8080/r/FC-ABCDEF (con un código de prueba)
# Esperado: redirige a /register con el código en localStorage
# Verificar que el banner aparece en /register
```

- [ ] **Step 3: Commit Chunk 5**

```bash
git add src/pages/Invita.tsx src/pages/ReferralRedirect.tsx src/App.tsx \
        src/components/layout/Sidebar.tsx src/components/layout/BottomNavigation.tsx \
        src/pages/auth/Register.tsx
git commit -m "feat(referral): integración completa — página /invita, sidebar badge, banner registro, rutas"
```

---

## Chunk 6: Test End-to-End manual

### Task 19: Prueba con dos cuentas

- [ ] **Step 1: Flujo del referidor**

1. Crear cuenta A (referidor) en `localhost:8080/register`
2. Ir a `/invita` → verificar que aparece código FC-XXXXXX
3. Copiar la URL `/r/FC-XXXXXX`

- [ ] **Step 2: Flujo del referido**

1. En ventana privada, visitar la URL `/r/FC-XXXXXX`
2. Verificar redirección a `/register` con banner de bienvenida
3. Crear cuenta B (referido)
4. Verificar en DB:
```sql
SELECT * FROM referrals;
-- Esperado: fila con status='pending', referrer_id=UUID-A, referred_id=UUID-B
```

- [ ] **Step 3: Trigger de recompensa**

1. Iniciar sesión con cuenta B, confirmar el email
2. Enviar el primer documento desde cuenta B
3. Verificar en DB:
```sql
SELECT * FROM referrals WHERE referred_id = 'UUID-B';
-- Esperado: status='rewarded', rewarded_at IS NOT NULL
SELECT * FROM user_credit_purchases WHERE user_id IN ('UUID-A', 'UUID-B')
  ORDER BY created_at DESC;
-- Esperado: 5 créditos a A, 3 créditos a B (tipo referral/gift)
```

4. Volver a `/invita` con cuenta A → verificar:
   - Contador "activos" incrementado
   - Contador "créditos ganados" +5
   - Toast en tiempo real (si Realtime está activo)

- [ ] **Step 4: Verificar anti-fraude**

```bash
# Auto-referido: intentar registrarse con el propio código
# Esperado: el campo 'ok' sigue siendo true (registro continúa) pero NO se crea referral

# Código inválido: visitar /r/FC-ZZZZZZ (inválido)
# Esperado: redirige a /register sin banner (código no guardado o ignorado)

# Cap: simular 10 referidos activos del mismo usuario
# SELECT SUM(credits_to_referrer) FROM referrals WHERE referrer_id = 'UUID-A' AND status = 'rewarded';
# Esperado: ≤ 50
```

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(referral): sistema de referidos completo — local testado"
```

---

## Notas importantes para la implementación

### Variables de entorno necesarias
Añadir a `.env.local`:
```
APP_URL=http://localhost:8080
```
(en producción será `https://firmaclara.es`)

### Limitación conocida: Google OAuth
El flujo de referral solo funciona con registro por email/contraseña. Si un usuario se registra con Google OAuth después de visitar un enlace de referido, el código en localStorage se perderá porque el OAuth redirige directamente al dashboard. Esto está excluido del scope de este MVP.

### n8n workflow (fuera de scope de este plan)
La notificación por email al referidor cuando un referido se activa se implementa en n8n (webhook en `referrals` UPDATE WHERE status='rewarded'). No bloquea el deployment de esta feature.

### Deploy a producción
Una vez probado localmente:
1. Aplicar migración SQL en el proyecto Supabase de producción vía SQL Editor
2. Desplegar las 3 Edge Functions: `supabase functions deploy get-referral-info register-referral get-referrer-name`
3. Añadir `APP_URL=https://firmaclara.es` a los secrets de Supabase
4. Deploy frontend a Vercel (automático al hacer push a main)
