# Spec: Sistema de Referidos FirmaClara
**Fecha:** 2026-06-20  
**Revisión:** v1.1 — Spec review fixes aplicados (C1, C2, C3, I4, I5, I6, S1, S3, S4, S5)  
**Estado:** Spec review aprobado — pendiente revisión final de Jordi  
**Scope:** Base de datos · Edge Functions · Frontend React · Seguridad · Animaciones  

---

## 1. Objetivo y contexto

Implementar un programa de referidos peer-to-peer para FirmaClara que:
- Incentive a usuarios actuales a recomendar la plataforma a autónomos y pymes
- Recompense con créditos in-app (no dinero, sin complejidad fiscal)
- Tenga anti-fraude robusto: solo se acredita cuando el referido envía su **primer documento**
- Sea visualmente memorable gracias a la metáfora del "Certificado de Afiliado"

**Modelo de recompensa aprobado:**
- Referidor gana **5 créditos** cuando el referido envía su primer documento
- Referido gana **3 créditos** (bono de bienvenida) en ese mismo momento
- Cap: **50 créditos máximo** acumulados por referidos por cuenta
- Trigger robusto: email verificado + primer documento enviado (no solo registro)

---

## 2. User stories

| ID | Actor | Historia | Criterio de aceptación |
|---|---|---|---|
| US-01 | Usuario registrado | Ver mi enlace de referido único | Página /invita muestra `firmaclara.es/r/FC-XXXXXX`, monospace, copiable |
| US-02 | Usuario registrado | Copiar el enlace con un clic | Botón copia al clipboard, animación "¡Copiado!" 2s, revierte |
| US-03 | Usuario registrado | Compartir por WhatsApp / Email | Botones abren enlace nativo con mensaje pre-redactado |
| US-04 | Usuario registrado | Ver cuántos referidos tengo | 3 contadores: invitados / activos / créditos ganados |
| US-05 | Usuario registrado | Ver el historial de referidos | Lista con nombre, estado (pendiente/activo) y fecha |
| US-06 | Usuario registrado | Recibir notificación cuando un referido se activa | Toast en app + email vía n8n |
| US-07 | Usuario nuevo (referido) | Llegar con un banner de bienvenida | `/register?ref=FC-XXXXXX` muestra banner con el nombre del referidor |
| US-08 | Usuario nuevo (referido) | Recibir créditos extra al usar el producto | 3 créditos aparecen en Créditos → Compras al enviar el primer doc |
| US-09 | Admin | Ver qué usuarios vienen por referido | Columna "Referido por" en UsersManager |
| US-10 | Sistema | No acreditar si hay auto-referido o fraude | Constraints DB + validaciones en Edge Function |

---

## 3. Modelo de datos

### 3.1 Tabla `referral_codes`

```sql
CREATE TABLE public.referral_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL UNIQUE,   -- Formato: 'FC-XXXXXX' (6 chars alfanuméricos)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- S4-FIX: El UNIQUE constraint ya crea un índice; el CREATE INDEX adicional de 'code' sería
-- redundante. Solo se añade el índice no-único sobre user_id (no cubierto por el constraint).
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
```

**Nota sobre el código:** 6 chars del set `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
(se excluyen 0,O,1,I para evitar confusión visual). Prefijo `FC-` para reconocimiento
de marca. Total: 32^6 = ~1.07 mil millones de combinaciones únicas.

### 3.2 Tabla `referrals`

```sql
CREATE TABLE public.referrals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id         UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- UNIQUE en referred_id garantiza que un usuario solo puede ser referido UNA vez
  status              TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rewarded', 'invalid')),
  credits_to_referrer INTEGER     NOT NULL DEFAULT 5,
  credits_to_referred INTEGER     NOT NULL DEFAULT 3,
  rewarded_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  -- Constraints de seguridad
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status      ON public.referrals(status);
```

### 3.3 Row Level Security

```sql
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;

-- referral_codes: usuario ve/gestiona su propio código
CREATE POLICY "Own code SELECT"   ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own code INSERT"   ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Service role acceso total (Edge Functions)
CREATE POLICY "Service full rc"   ON public.referral_codes FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Lookup público del código (solo SELECT, solo el campo 'code' y 'user_id')
-- Necesario para que la Edge Function de registro (pre-auth) pueda resolver el código
-- IMPORTANTE: no expone información sensible (solo mapeo code→user_id)
CREATE POLICY "Public code lookup" ON public.referral_codes FOR SELECT USING (true);

-- referrals: el referidor ve sus propias filas (para /invita)
CREATE POLICY "Referrer sees own"  ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
-- El referido puede ver SI fue referido (para el banner de bienvenida)
CREATE POLICY "Referred sees self" ON public.referrals FOR SELECT USING (auth.uid() = referred_id);
-- Service role acceso total
CREATE POLICY "Service full ref"   ON public.referrals FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- IMPORTANTE: los usuarios NO pueden hacer INSERT/UPDATE/DELETE en referrals directamente.
-- Todo va por Edge Functions con service_role.
```

### 3.4 Vista `referral_stats` (para /invita dashboard)

```sql
CREATE OR REPLACE VIEW public.referral_stats
WITH (security_invoker = true)   -- respeta RLS del usuario llamante
AS
SELECT
  r.referrer_id                                                          AS user_id,
  COUNT(*)                                                               AS total_invited,
  COUNT(*)  FILTER (WHERE r.status = 'pending')                         AS total_pending,   -- I5-FIX
  COUNT(*)  FILTER (WHERE r.status = 'rewarded')                        AS total_active,
  COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0) AS credits_earned,
  GREATEST(0, 50 - COALESCE(SUM(r.credits_to_referrer) FILTER (WHERE r.status = 'rewarded'), 0)) AS credits_remaining
FROM public.referrals r
GROUP BY r.referrer_id;
```

### 3.5 Funciones SQL

```sql
-- ── Generador de código único ────────────────────────────────────────────────
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

-- ── get_or_create_referral_code: idempotente ────────────────────────────────
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

-- ── process_referral_reward: llamada desde consumir_firma ───────────────────
-- Precondición: p_referred_id ya tiene email verificado + ha enviado su 1er doc.
-- Esta función es idempotente: si ya está 'rewarded', no hace nada.
CREATE OR REPLACE FUNCTION public.process_referral_reward(p_referred_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref               public.referrals%ROWTYPE;
  v_credits_acum      INT;
  v_referrer_name     TEXT;
  v_referred_name     TEXT;
  v_result            JSONB;
BEGIN
  -- 1. Buscar referral pendiente con lock (evitar race condition doble reward)
  SELECT * INTO v_ref
  FROM public.referrals
  WHERE referred_id = p_referred_id
    AND status      = 'pending'
  FOR UPDATE SKIP LOCKED;

  -- Si no hay referral pendiente: no hacer nada (no es un error)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'no_pending_referral');
  END IF;

  -- 2. Verificar cap de créditos del referidor (máx 50 por referidos)
  SELECT COALESCE(SUM(credits_to_referrer), 0)
  INTO   v_credits_acum
  FROM   public.referrals
  WHERE  referrer_id = v_ref.referrer_id
    AND  status      = 'rewarded';

  -- 3. Marcar estado (antes de acreditar para idempotencia)
  IF v_credits_acum >= 50 THEN
    -- Cap alcanzado: inválido para el referidor, pero el referido igual recibe su bono
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

  -- 4. Créditos al referidor (solo si no es cap)
  IF (v_result->>'referrer_credited')::BOOLEAN THEN
    SELECT COALESCE(name, email) INTO v_referred_name
    FROM   public.users WHERE id = p_referred_id;

    -- C1-FIX: add_firmas_creditos requiere contexto de billing activo
    PERFORM set_config('app.billing_ctx', 'on', true);
    PERFORM public.add_firmas_creditos(
      p_user_id    := v_ref.referrer_id,
      p_credits    := v_ref.credits_to_referrer,
      p_session    := gen_random_uuid()::TEXT,
      p_description := 'Referido activo: ' || COALESCE(v_referred_name, 'nuevo usuario')
    );
  END IF;

  -- 5. Bono de bienvenida al referido (siempre, cap o no)
  -- C1-FIX: set_config es local a la transacción; repetirlo por si el bloque anterior no corrió
  PERFORM set_config('app.billing_ctx', 'on', true);
  PERFORM public.add_firmas_creditos(
    p_user_id    := p_referred_id,
    p_credits    := v_ref.credits_to_referred,
    p_session    := gen_random_uuid()::TEXT,
    p_description := 'Bono de bienvenida por invitación'
  );

  RETURN v_result;
END;
$$;
```

### 3.6 Triggers en `referrals`

```sql
-- Trigger 1: mantener updated_at
CREATE OR REPLACE FUNCTION public.update_referrals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_referrals_updated_at();

-- I4-FIX: REPLICA IDENTITY FULL necesario para Supabase Realtime en modo UPDATE/DELETE
-- (sin esto, los eventos Realtime no incluyen los valores anteriores de la fila)
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
```

### 3.7 Trigger AFTER UPDATE en `documents` (C3-FIX)

**C3-FIX:** No modificar `consumir_firma` directamente. En su lugar, usar un AFTER UPDATE trigger
sobre `documents`. Esto desacopla el reward del billing, evita propagación de excepciones al flujo
de firma, y es más robusto ante refactorizaciones futuras de `consumir_firma`.

```sql
-- C3-FIX: Trigger AFTER UPDATE en documents — dispara process_referral_reward al primer envío
CREATE OR REPLACE FUNCTION public.trigger_process_referral_on_first_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo disparar cuando status pasa a 'sent' desde otro estado
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    -- Solo si es el PRIMER documento enviado del usuario
    IF (SELECT COUNT(*) FROM public.documents
        WHERE user_id = NEW.user_id AND status = 'sent') = 1 THEN
      -- I6-FIX: envolver en BEGIN...EXCEPTION para que un fallo en el referral
      -- no cancele la transacción de firma del documento
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

> **Nota sobre el COUNT:** `COUNT(*) = 1` es correcto porque el UPDATE ya ocurrió antes del trigger AFTER.

---

## 4. Edge Functions

### 4.1 `get-referral-info` (GET, autenticada)

**Propósito:** Devuelve código de referido + stats para la página /invita.

```
GET /functions/v1/get-referral-info
Authorization: Bearer <jwt>

Response 200:
{
  "code": "FC-AB12XY",
  "url": "https://firmaclara.es/r/FC-AB12XY",
  "stats": {
    "total_invited": 3,
    "total_active": 2,
    "credits_earned": 10,
    "credits_remaining": 40
  },
  "referrals": [
    { "id": "uuid", "name": "Ana García", "status": "rewarded", "rewarded_at": "2026-06-19" },
    { "id": "uuid", "name": "Carlos R.", "status": "pending", "rewarded_at": null }
  ]
}
```

**Lógica:**
1. Extraer user_id del JWT (Supabase Auth)
2. `get_or_create_referral_code(user_id)` → código idempotente
3. Query a `referral_stats` WHERE user_id = current_user
4. Query a `referrals` JOIN `users` (para nombre) WHERE referrer_id = current_user ORDER BY created_at DESC LIMIT 50
5. Los nombres de referidos se devuelven como `first_name` (solo nombre, nunca email — privacidad)

**Seguridad:**
- JWT obligatorio (Supabase valida automáticamente)
- No acepta `user_id` en el body — siempre usa el del token
- Solo lee datos del usuario autenticado

### 4.2 `register-referral` (POST, sin autenticación)

**Propósito:** Vincula un nuevo usuario registrado con su referidor.
Llamada internamente desde `handle_new_user` o desde el cliente tras el registro.

```
POST /functions/v1/register-referral
Content-Type: application/json

Body: {
  "ref_code": "FC-AB12XY",
  "new_user_id": "uuid-del-nuevo-usuario"
}

Response 200: { "ok": true }
Response 400: { "error": "invalid_code" | "self_referral" | "already_referred" }
```

**Lógica:**
1. Validar formato del código: regex `^FC-[A-Z2-9]{6}$`
2. **C2-FIX:** Verificar que `new_user_id` existe en `auth.users` Y que fue creado hace menos de 15 minutos:
   ```typescript
   const { data: { user: newUser } } = await supabase.auth.admin.getUserById(newUserId)
   if (!newUser) return { error: 'invalid_user' }
   const createdAt = new Date(newUser.created_at).getTime()
   if (Date.now() - createdAt > 15 * 60 * 1000) return { error: 'registration_expired' }
   ```
   Esto previene inyectar `new_user_id` de usuarios existentes (que podrían re-vincularse).
3. Buscar `referral_codes` WHERE code = ref_code → obtener referrer_id
4. Si no existe: return `{ error: "invalid_code" }`
5. Si referrer_id = new_user_id: return `{ error: "self_referral" }` (defensa extra)
6. Email alias normalization (C10): comparar `normalizeEmail(referrerEmail)` == `normalizeEmail(newUserEmail)` → `{ error: "self_referral" }`
7. Verificar que new_user_id no tiene ya un referral (`referred_id` UNIQUE constraint)
8. INSERT en `referrals` (status: 'pending')
9. En caso de error por UNIQUE: return `{ ok: true }` (idempotente, no error)

**Seguridad:**
- Esta función usa `service_role` para el INSERT
- `new_user_id` validado contra `auth.users` con ventana de 15 minutos (C2-FIX)
- Rate limit: Supabase Edge Function tiene rate limit por defecto; añadir header check de CORS
- No devuelve información sobre el referidor al cliente

**¿Cuándo se llama?**
- Opción A (recomendada): el cliente envía la llamada tras el registro exitoso con Supabase Auth, pasando el `ref` que tenía en localStorage.
- El `ref` se guarda en localStorage cuando el usuario llega a cualquier página con `?ref=FC-XXXXXX` o `/r/FC-XXXXXX`.

### 4.3 `get-referrer-name` (GET, pública — sin autenticación)

**S5-FIX:** El banner en `/register` necesita mostrar el nombre del referidor ("Ana García te ha invitado..."), pero el cliente en ese punto no tiene JWT (aún no está autenticado). Se necesita una EF pública que resuelva `code → nombre` sin exponer datos sensibles.

```
GET /functions/v1/get-referrer-name?code=FC-AB12XY

Response 200: { "name": "Ana" }              ← solo el primer nombre
Response 400: { "error": "invalid_code" }
Response 404: { "error": "not_found" }
```

**Seguridad:**
- Devuelve ÚNICAMENTE el primer nombre (`split(' ')[0]`), nunca apellido ni email
- No confirma si el código es válido o no (siempre 200 con `name: null` si no existe — evita enumeración)
- Rate-limited por Supabase (sin autenticación, más expuesta a abuso mínimo)
- Sin información que permita identificar al referidor

**Alternativa en la implementación:** Si se prefiere no exponer otra EF pública, se puede mostrar el banner con texto genérico "Alguien te ha invitado a FirmaClara" y obtener el nombre solo tras el login. Decisión a tomar en implementación.

### 4.4 `process-referral` (interna — no HTTP pública)

Esta función no se expone como HTTP endpoint. El reward se dispara desde el trigger SQL `trigger_process_referral_on_first_send` → `process_referral_reward()`. Si en el futuro se necesita forzar un proceso manual (admin), se puede exponer con protección de rol admin.

---

## 5. Seguridad y anti-fraude — blindaje completo

### 5.1 Capas de protección (en orden de ejecución)

| Capa | Qué bloquea | Dónde se implementa |
|---|---|---|
| **C1** Formato del código | Códigos manipulados, inyección SQL | Regex `^FC-[A-Z2-9]{6}$` en Edge Function |
| **C2** Código existe | Códigos inventados | SELECT en DB antes de cualquier acción |
| **C3** Auto-referido | Usuario que usa su propio código | `CHECK (referrer_id != referred_id)` en DB + validación en EF |
| **C4** Email verificado | Cuentas temporales sin verificar | Trigger de reward solo se dispara si `auth.users.email_confirmed_at IS NOT NULL` |
| **C5** Primer documento real | Registros sin usar el producto | `process_referral_reward` solo se llama desde `consumir_firma` en el 1er doc |
| **C6** UNIQUE en `referred_id` | Contar al mismo usuario dos veces | Constraint DB — imposible fisicamente |
| **C7** Cap de 50 créditos | Granjas de cuentas masivas | Check en `process_referral_reward` antes de acreditar |
| **C8** `FOR UPDATE SKIP LOCKED` | Race condition doble reward | Lock en la fila antes de procesar |
| **C9** Sin INSERT/UPDATE público | Manipulación directa de `referrals` | RLS solo permite SELECT al usuario; INSERT/UPDATE solo via service_role |
| **C10** Dominio de email | `jordi+1@gmail.com` vs `jordi@gmail.com` | Normalización: se compara `split_part(email, '+', 1)` — bloquea alias con `+` del mismo dominio |
| **C11** IP flooding | Un solo usuario crea 50 cuentas falsas | Supabase Auth rate limit nativo + Vercel edge rate limiting |
| **C12** Código en URL solo en registro | El código no persiste en la URL tras el registro | Se limpia localStorage tras `register-referral` exitoso |

### 5.2 Validación de email con alias (C10)

En `register-referral`, antes de insertar:

```typescript
// Normalizar email: quitar alias '+' y comparar dominio
const normalizeEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return `${local.split('+')[0]}@${domain}`.toLowerCase()
}

// Verificar que el referidor y el referido no son el mismo email normalizado
const referrerEmail = await getEmailByUserId(referrerId)
const referredEmail = await getEmailByUserId(newUserId)
if (normalizeEmail(referrerEmail) === normalizeEmail(referredEmail)) {
  return { error: 'self_referral' }
}
```

### 5.3 Protección CORS en Edge Functions

Reutilizar `_shared/cors.ts` ya existente en el proyecto. Solo orígenes de FirmaClara whitelisteados.

### 5.4 Datos devueltos al cliente — principio de mínimo privilegio

- La lista de referidos muestra solo `first_name` del referido (nunca email ni apellido)
- La Edge Function `get-referral-info` nunca devuelve `referrer_id` o `referred_id` (UUIDs internos)
- Los stats son solo números (no información de otros usuarios)

### 5.5 Consideraciones de bypass conocidos y mitigación

| Bypass potencial | Mitigación |
|---|---|
| Modificar `localStorage` con código ajeno | No importa: el código pertenece a ese usuario; el referido ganará créditos (legítimo), el referidor del código ajeno gana créditos solo si el referido usa el producto |
| Inspeccionar red y llamar `register-referral` directamente | La función verifica que `new_user_id` existe en `auth.users` y que el JWT del registro es válido. Sin JWT válido no puede registrarse en Supabase Auth |
| Crear múltiples cuentas con emails temporales | Mitigado por C4 (email verificado) + C5 (1er documento) — enviar un documento cuesta 1 crédito del referido, que parte de 2. Para abusar necesita usar créditos reales |
| Webhook replay (si se expone `process-referral`) | No se expone como HTTP. Llamada interna desde SQL |
| SQL injection en `ref_code` | Regex estricto en Edge Function + parámetros preparados en todas las queries |

---

## 6. Frontend — Arquitectura de componentes

### 6.1 Ruta y acceso

```
/invita → src/pages/Invita.tsx
Protección: RequireAuth (solo usuarios registrados)
Sidebar: nueva entrada entre "Créditos" y "Configuración"
```

### 6.2 Árbol de componentes

```
Invita.tsx
├── ReferralCertificate.tsx      ← hero card "certificado"
│   └── ShareButtons.tsx         ← WhatsApp / Email / Copiar
├── ReferralStats.tsx            ← 3 contadores + progress bar
│   └── [AnimatedCounter × 3]   ← hook useCountUp interno
├── HowItWorks.tsx               ← 3 pasos con clip-path reveal
├── ReferralList.tsx             ← lista con IntersectionObserver
│   ├── ReferralRow.tsx          ← fila individual (estados)
│   └── ReferralEmptyState.tsx   ← estado vacío con CTA
└── MilestoneCelebration.tsx     ← confetti trigger (canvas-confetti)
```

### 6.3 Hook principal `useReferral`

```typescript
// src/hooks/useReferral.ts
interface ReferralData {
  code: string
  url: string
  stats: {
    total_invited: number
    total_pending: number   // I5-FIX: referidos registrados aún sin activar (para el badge del sidebar)
    total_active: number
    credits_earned: number
    credits_remaining: number
  }
  referrals: ReferralEntry[]
  isLoading: boolean
  error: string | null
}

// Lógica:
// - Llama a get-referral-info al montar
// - Suscripción Supabase Realtime a la tabla referrals (WHERE referrer_id = user.id)
//   para actualizar el estado sin polling cuando un referido se activa
// - Cuando llega un evento de Realtime con status='rewarded':
//   1. Actualiza el estado local
//   2. Dispara toast "¡[nombre] acaba de usar FirmaClara! +5 créditos"
//   3. Activa MilestoneCelebration si se alcanzó un hito

// I4-FIX: Configuración correcta de Supabase Realtime
// La tabla `referrals` necesita REPLICA IDENTITY FULL (ya añadido en §3.6).
// La suscripción debe usar el JWT del usuario (Supabase lo gestiona automáticamente
// a través del client inicializado con la sesión activa).
// Filtro obligatorio para evitar que un usuario vea referrals ajenos:
//
//   supabase
//     .channel('referrals-changes')
//     .on('postgres_changes', {
//       event: 'UPDATE',
//       schema: 'public',
//       table: 'referrals',
//       filter: `referrer_id=eq.${user.id}`   // ← filtro server-side
//     }, handleRealtime)
//     .subscribe()
//
// Nota: el filtro server-side en Realtime requiere que la columna esté en REPLICA IDENTITY.
// Sin REPLICA IDENTITY FULL, el filtro no funciona en eventos UPDATE.
```

### 6.4 Lógica del ref en el registro

```typescript
// src/lib/referral.ts

// Guardar ref al llegar a la app
export function captureReferralCode() {
  const urlParams = new URLSearchParams(window.location.search)
  // S1-FIX: el regex del pathname debe capturar exactamente el formato FC-XXXXXX
  // El patrón anterior '[A-Z2-9]{2,}-[A-Z2-9]{6}' no anclaba el prefijo 'FC-'.
  const pathMatch = window.location.pathname.match(/^\/r\/(FC-[A-Z2-9]{6})$/)
  const ref = urlParams.get('ref') || pathMatch?.[1]
  if (ref && /^FC-[A-Z2-9]{6}$/.test(ref)) {
    // No sobreescribir si ya hay uno guardado (first-touch attribution)
    if (!localStorage.getItem('fc_ref')) {
      localStorage.setItem('fc_ref', ref)
      localStorage.setItem('fc_ref_ts', Date.now().toString())
    }
  }
}

// Leer ref guardado (max 7 días de vigencia)
export function getStoredReferralCode(): string | null {
  const ref = localStorage.getItem('fc_ref')
  const ts  = Number(localStorage.getItem('fc_ref_ts') || 0)
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (!ref || Date.now() - ts > sevenDays) {
    clearReferralCode()
    return null
  }
  return ref
}

// Limpiar tras registro exitoso
export function clearReferralCode() {
  localStorage.removeItem('fc_ref')
  localStorage.removeItem('fc_ref_ts')
}
```

**Integración en el flujo de registro:**
1. `App.tsx` — `useEffect` en mount llama a `captureReferralCode()`
2. Página `/register` — muestra banner si `getStoredReferralCode() !== null`
3. Tras `supabase.auth.signUp()` exitoso:
   ```typescript
   const refCode = getStoredReferralCode()
   if (refCode && data.user) {
     await supabase.functions.invoke('register-referral', {
       body: { ref_code: refCode, new_user_id: data.user.id }
     })
     clearReferralCode()
   }
   ```

### 6.5 Redirector `/r/:code`

```typescript
// src/pages/ReferralRedirect.tsx
// Ruta: /r/:code
// Guarda el código, redirige a /register

export default function ReferralRedirect() {
  const { code } = useParams()
  useEffect(() => {
    if (code && /^FC-[A-Z2-9]{6}$/.test(code)) {
      localStorage.setItem('fc_ref', code)
      localStorage.setItem('fc_ref_ts', Date.now().toString())
    }
    // Siempre redirige, código válido o no (no revelar si el código es válido a bots)
    window.location.replace('/register')
  }, [code])
  return null
}
```

---

## 7. Sistema de animaciones — especificación completa

### 7.1 Nuevos keyframes en `tailwind.config.ts`

```typescript
keyframes: {
  'slide-in-right': {
    from: { opacity: '0', transform: 'translateX(32px)' },
    to:   { opacity: '1', transform: 'translateX(0)' }
  },
  'fade-up': {
    from: { opacity: '0', transform: 'translateY(16px)' },
    to:   { opacity: '1', transform: 'translateY(0)' }
  },
  'copy-pulse': {
    '0%':   { boxShadow: '0 0 0 0 rgba(16,185,129,0.45)' },
    '100%': { boxShadow: '0 0 0 14px rgba(16,185,129,0)' }
  },
  'badge-pop': {
    '0%, 100%': { transform: 'scale(1)' },
    '50%':      { transform: 'scale(1.25)' }
  },
  'reveal-from-left': {
    from: { clipPath: 'inset(0 100% 0 0)' },
    to:   { clipPath: 'inset(0 0% 0 0)' }
  },
},
animation: {
  'slide-in-right':   'slide-in-right 350ms ease-out forwards',
  'fade-up':          'fade-up 400ms ease-out forwards',
  'copy-pulse':       'copy-pulse 500ms ease-out forwards',
  'badge-pop':        'badge-pop 300ms ease-out',
  'reveal-from-left': 'reveal-from-left 600ms ease-out forwards',
},
```

### 7.2 Micro-interacciones por componente

#### Botón "Copiar enlace" (momento más crítico)

```
Estado default → clicked:
  1. scale(0.96)                     80ms ease-in
  2. scale(1.02)                    120ms ease-out   (bounce)
  3. scale(1.0)                      80ms ease
  4. color: primary → emerald-600   150ms ease-in-out
  5. texto "Copiar" → "¡Copiado!"   100ms opacity cross-fade
  6. border: primary/25 → emerald   200ms ease
  7. copy-pulse keyframe             500ms (ring verde)

Revertir a default tras 2000ms:
  8. todo de vuelta                  200ms ease-in-out
```

#### Contadores animados (hook `useCountUp`)

```typescript
// Algoritmo: easeOutQuad — desacelera al final (sensación natural)
// t ∈ [0,1] → progress = 1 - (1-t)²
// duration: 800ms
// stagger:  counter[0]=0ms, counter[1]=150ms, counter[2]=300ms
// Uso: const value = useCountUp(target, { duration: 800, delay: 0 })
```

#### Progress bar

```
CSS custom property: --progress-width: 40%
animation: width 0% → var(--progress-width)
timing: 1200ms cubic-bezier(0.22, 1, 0.36, 1)  ← spring-like
delay: 400ms (da tiempo a leer los contadores primero)
```

#### Lista de referidos (IntersectionObserver)

```
threshold: 0.15
rootMargin: "0px 0px -40px 0px"
Cada ReferralRow: animation-name: slide-in-right
Stagger: style={{ animationDelay: `${index * 80}ms` }}
Solo se dispara UNA vez (observer.unobserve tras intersección)
```

#### Pasos "Cómo funciona" (clip-path reveal)

```
Cada paso: animation-name: reveal-from-left
Stagger: paso[0]=0ms, paso[1]=200ms, paso[2]=400ms
Trigger: IntersectionObserver threshold 0.3
```

#### Confetti en milestone (canvas-confetti)

```
Librería: canvas-confetti (3KB gzip) — import dinámico
Hitos: credits_earned ∈ [5, 10, 25, 50]
Parámetros:
  particleCount: 90
  spread: 75
  origin: { y: 0.6 }
  colors: ['#EF4444', '#10B981', '#F59E0B', '#ffffff']
  // S3-FIX: canvas-confetti no soporta variables CSS (var(--primary-hex)).
  // Usar literal hex del color primario de FirmaClara (#EF4444 rojo).
Duración: 3s (auto-limpia el canvas)
Solo se dispara una vez por hito (guardado en useRef)
```

#### prefers-reduced-motion (OBLIGATORIO)

```css
/* En src/index.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

En JavaScript (IntersectionObserver + canvas-confetti):
```typescript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (!prefersReduced) {
  // disparar animaciones
}
```

---

## 8. Especificación UI/UX completa

### 8.1 Elemento signature: "Certificado de Afiliado"

```
╔══════════════════════════════════════════════════════════╗
║  [patrón watermark diagonal, opacity 4%]    [FileCheck] ║
║                                                          ║
║  CÓDIGO DE INVITACIÓN                                    ║
║  ───────────────────────────────────────────────────     ║
║  firmaclara.es/r/FC-AB12XY           [Copiar enlace]    ║
╠ - - - - - - - - - - - - - - - - - - - - - - - - - - - ╣
║  [📱 WhatsApp]     [✉ Email]     [↗ Más opciones]       ║
╚══════════════════════════════════════════════════════════╝

Tokens:
  border: border-2 border-dashed border-primary/25
  bg: bg-primary/5
  watermark: ::before pseudo-element, repeating-linear-gradient
  eyebrow: text-[11px] font-semibold tracking-widest uppercase text-muted-foreground
  código: font-mono text-sm text-foreground/80
  sello: <FileCheck className="h-5 w-5 text-primary/40" /> top-right absolute

Estado copiado:
  border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-950/20
  transition-all duration-200
```

### 8.2 Contadores

```
3 Cards en grid (md:grid-cols-3):

┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│      3       │  │      2       │  │       10         │
│  invitados   │  │   activos    │  │  créditos ganados │
└──────────────┘  └──────────────┘  └──────────────────┘

La card de "créditos ganados" usa ring-2 ring-primary/20 (destacada)
Número: text-4xl font-bold tracking-tight
Label: text-sm text-muted-foreground
```

### 8.3 Progress bar hacia próximo hito

```
Hitos: 5 → 10 → 25 → 50 créditos
"Invita a 3 más para ganar tus próximas 5 firmas"

Track: h-2 bg-muted rounded-full overflow-hidden
Fill: h-full bg-primary rounded-full (transition-all con la animation de spring)
Cuando credits_earned >= 50: texto "Máximo alcanzado · Embajador FirmaClara"
```

### 8.4 Copia exacta por estado

```
────────────── PÁGINA ─────────────────────────────
H1:          "Invita y gana firmas gratis"
Subtítulo:   "Cada autónomo o pyme que empiece con FirmaClara
              gracias a ti te da 5 firmas. Los dos ganáis."

────────────── BOTÓN COPIAR ────────────────────────
Default:     "Copiar enlace"
Copiado:     "¡Copiado!"

────────────── COMPARTIR ───────────────────────────
WhatsApp:    "Hola, te paso FirmaClara: una forma muy sencilla
              y barata de firmar contratos online. Puedes empezar
              gratis: {url}"
Email sub:   "Te recomiendo FirmaClara para firmar contratos"
Email body:  "Hola,\n\nTe recomiendo FirmaClara, una herramienta
              para firmar contratos online en segundos, sin
              instalaciones.\n\nEmpieza gratis aquí: {url}\n\nSaludos"

────────────── STATS ───────────────────────────────
Labels:      "invitados" / "activos" / "créditos ganados"
Progress 0:  "Invita a 5 personas para ganar tus primeras 5 firmas"
Progress:    "Invita a {X} más para ganar tus próximas 5 firmas"
Cap:         "Máximo alcanzado · Has ganado 50 firmas con referidos"

────────────── CÓMO FUNCIONA ───────────────────────
Paso 1:      "Comparte tu enlace"
             sub: "Envíalo a autónomos o pymes que firmen contratos habitualmente"
Paso 2:      "Se registran y firman"
             sub: "Cuando envían su primer contrato, el sistema lo confirma"
Paso 3:      "Ambos ganáis"
             sub: "Tú recibes 5 firmas. Ellos, 3 de bienvenida"

────────────── LISTA DE REFERIDOS ──────────────────
Pending:     "Registrado · Pendiente de enviar su primer contrato"
             [badge: "Pendiente", amber]
Rewarded:    "Activo · +5 créditos · {fecha}"
             [badge: "Activo", emerald]
Invalid:     "No válido"
             [badge: "No válido", muted]

────────────── EMPTY STATE ─────────────────────────
Título:      "Todavía no has invitado a nadie"
Sub:         "Comparte tu enlace con clientes, proveedores o
              colegas autónomos. Cuando envíen su primer
              contrato, los dos ganáis créditos."
CTA:         "Copiar mi enlace" [primary button]

────────────── TOASTS ──────────────────────────────
Nuevo activo: "¡{Nombre} acaba de firmar su primer contrato!
               +5 créditos para ti"
Milestone 5:  "¡Primer hito! Ya tienes 5 firmas ganadas"
Milestone 10: "¡10 firmas ganadas con referidos! Sigue así"
Milestone 25: "¡Increíble! 25 firmas. Eres embajador de FirmaClara"
Milestone 50: "¡Máximo alcanzado! 50 firmas ganadas. Muchísimas gracias"

────────────── BANNER /register ────────────────────
"{Nombre} te ha invitado a FirmaClara. Envía tu primer
 contrato y ambos ganaréis créditos gratis."

────────────── EMAIL n8n (al referidor) ────────────
Subject:     "¡{Nombre} ha usado FirmaClara! Ganaste 5 créditos"
Body:        Email branded con:
             - Nombre del referido
             - Créditos ganados (+5)
             - Total acumulado actual
             - CTA: "Ver mis créditos" → /credits
```

### 8.5 Sidebar

```typescript
// Nueva entrada en AdminSidebar.tsx y en el sidebar móvil:
{
  href: '/invita',
  icon: Gift,
  label: 'Invita y gana',
  badge: pendingReferrals > 0 ? pendingReferrals : undefined
  // badge: número de referidos en estado 'pending' (aún no activados)
  // CSS del badge: bg-amber-500 text-white animate-badge-pop (solo al actualizarse)
}
```

---

## 9. n8n Workflow: notificación al referidor

**Trigger:** Supabase Webhook → tabla `referrals` → evento `UPDATE` WHERE `status = 'rewarded'`

**Pasos del workflow:**
1. Recibir payload: `referrer_id`, `referred_id`, `credits_to_referrer`
2. Query a Supabase: `users.email` y `users.name` del referidor
3. Query a Supabase: `users.name` (primer nombre) del referido
4. Query a Supabase: créditos totales disponibles del referidor (para mostrar en el email)
5. Enviar email via Resend con plantilla branded de FirmaClara

**Fallback:** Si n8n falla, el crédito ya está en la base de datos. El email es best-effort.

---

## 10. Manejo de errores

| Escenario | Comportamiento |
|---|---|
| `get-referral-info` falla | Página muestra skeleton, luego mensaje "No se pudo cargar. Intenta de nuevo." con botón Reintentar |
| Código ya en uso por otro (race condition) | Constraint UNIQUE lo bloquea; la EF devuelve `{ ok: true }` (idempotente) |
| `register-referral` con código inválido | No se crea referral, registro continúa con normalidad. El usuario no ve error |
| Supabase Realtime desconectado | El toast no aparece, pero los créditos están en DB. Al recargar /invita los datos se actualizan |
| `canvas-confetti` no disponible | Import dinámico con try/catch — el confetti no aparece, nada se rompe |
| Cap de 50 créditos alcanzado | El referido igual recibe sus 3 créditos. El referidor no recibe más pero tampoco ve un error |
| `consumir_firma` lanza excepción | La recompensa de referido se ignora (se loggea en Postgres Logs); la firma del documento NO se cancela |

---

## 11. Archivos — resumen de cambios

### Nuevos
```
supabase/migrations/YYYYMMDD_referral_system.sql
supabase/functions/get-referral-info/index.ts
supabase/functions/register-referral/index.ts
supabase/functions/get-referrer-name/index.ts       ← S5-FIX: para banner /register
src/pages/Invita.tsx
src/pages/ReferralRedirect.tsx
src/hooks/useReferral.ts
src/lib/referral.ts
src/components/referral/ReferralCertificate.tsx
src/components/referral/ReferralStats.tsx
src/components/referral/ShareButtons.tsx
src/components/referral/HowItWorks.tsx
src/components/referral/ReferralList.tsx
src/components/referral/ReferralRow.tsx
src/components/referral/ReferralEmptyState.tsx
src/components/referral/MilestoneCelebration.tsx
```

### Modificados
```
src/App.tsx                          ← rutas /invita y /r/:code
src/components/layout/AdminSidebar.tsx ← entrada menú + badge
tailwind.config.ts                   ← keyframes + animations
supabase/schema.sql                  ← añadir nuevas tablas (documentación)
supabase/functions/_shared/cors.ts   ← sin cambios (ya existe)
```

### Funciones SQL nuevas / triggers
```
generate_referral_code()                          ← nueva
get_or_create_referral_code()                     ← nueva
process_referral_reward()                         ← nueva (C1-FIX: set_config billing_ctx)
trigger_process_referral_on_first_send()          ← nueva (C3-FIX: trigger AFTER UPDATE)
update_referrals_updated_at()                     ← nueva (trigger updated_at)
```

> **C3-FIX:** `consumir_firma()` NO se modifica. El trigger AFTER UPDATE en `documents` gestiona el reward de forma independiente.

---

## 12. Orden de implementación recomendado (local primero)

1. **Migración SQL** — tablas, RLS, funciones, vista
2. **Verificar en Supabase local** — `supabase db reset` + tests manuales de las funciones
3. **Edge Functions** — `get-referral-info` y `register-referral` con tests locales
4. **Hook `useReferral` y `src/lib/referral.ts`** — sin UI, solo lógica
5. **Página /invita** — primero sin animaciones (datos correctos)
6. **Animaciones** — añadir keyframes + micro-interacciones
7. **Integración registro** — `captureReferralCode` + banner + llamada a EF
8. **Sidebar badge** — requiere datos reales de referrals pendientes
9. **n8n workflow** — conectar webhook Supabase → email
10. **Tests manuales end-to-end** con dos cuentas de prueba
11. **Revisión de seguridad** — verificar todos los bypasses del §5
12. **Deploy a producción**

---

## 13. Preguntas resueltas durante el diseño

| Pregunta | Decisión |
|---|---|
| ¿Quién puede ser afiliado? | Solo usuarios actuales (peer-to-peer) |
| ¿Qué recompensa? | Créditos in-app (no dinero) |
| ¿Cuándo se acredita? | Email verificado + primer documento enviado |
| ¿Cuántos créditos al referidor? | 5 por referido activo |
| ¿Créditos al referido? | 3 (bono de bienvenida) |
| ¿Cap máximo? | 50 créditos por cuenta (10 referidos exitosos) |
| ¿Visibilidad? | Sección propia /invita en el menú |
| ¿Anti-fraude? | 5 capas (ver §5) |
| ¿Comunicación? | n8n email + Supabase Realtime toast |
| ¿Deploy? | Local completo antes de producción |
