# Plan de implementación — Features grandes del PRD

**Fecha:** 2026-06-12 · **Cubre:** ME-02 (multi-firma), ME-05 (API + webhooks),
ME-07 (equipos), ME-11 (loop de referidos).

Estos cuatro ítems no se implementaron en el lote de junio porque son los de mayor
esfuerzo (el PRD los estima en 5–12 días cada uno) y mayor riesgo: ME-02 toca el
núcleo legal de firma y ME-05/ME-07 cambian modelos de datos centrales. Además,
en ese momento había trabajo concurrente de **planes/suscripción** modificando
archivos compartidos sin commitear (`send-invite-v2`, `stripe-webhook`, `App.tsx`,
`Dashboard.tsx`, `NewDocument.tsx`). Este documento deja cada feature lista para
ejecutarse de forma segura una vez ese trabajo esté commiteado.

> **Regla de oro antes de empezar cualquiera de estas:** que el trabajo de planes
> esté commiteado y `git status` limpio, y regenerar `src/integrations/supabase/types.ts`
> tras cada migración (`supabase gen types typescript`).

---

## ME-11 · Loop de referidos en el email al firmante (0,5 días)

El más rápido. Bloqueado solo porque `send-invite-v2/index.ts` tenía cambios sin
commitear del trabajo de planes.

**Cambio en `supabase/functions/send-invite-v2/index.ts`** — en la plantilla
Resend, antes del `<div class="footer">`, añadir un bloque CTA:

```html
<div style="margin: 24px 40px 0; padding-top: 16px; border-top: 1px solid #f3f4f6; text-align: center;">
  <p style="font-size: 12px; color: #9ca3af; margin: 0 0 6px;">
    ¿Tú también envías documentos a firmar?
  </p>
  <a href="${siteUrl}/register?ref=sign" style="font-size: 13px; color: ${brandColor}; font-weight: 600; text-decoration: none;">
    Prueba FirmaClara gratis →
  </a>
</div>
```

- Usar `${brandColor}` (ya disponible por ME-03) para que respete la marca.
- Si la empresa configuró su propia marca (`brandSenderName`), **omitir** el CTA
  (no tiene sentido promocionar FirmaClara en un email white-label):
  `${brandSenderName ? '' : ctaHtml}`.
- Replicar el mismo bloque en la **plantilla de n8n** (workflow externo), que es
  el camino primario de envío.
- Atribución: en `Register.tsx`, si `searchParams.get('ref') === 'sign'`, registrar
  el origen (p. ej. `event_logs` o un campo `signup_source`) para medir el loop.

**Esfuerzo real:** ~2 h. **Riesgo:** mínimo.

---

## ME-02 · Multi-firma (5–8 días) — el más delicado

Cambia el modelo "1 documento → 1 firmante" a "1 documento → N firmantes". Toca el
núcleo legal (`SignDocument`, `sign-complete-v2`, certificado). **Hacerlo detrás de
un flag** y mantener el camino mono-firmante intacto hasta validar.

### 1. Schema — tabla `document_signers`

```sql
-- supabase/migrations/XXXX_multi_signer.sql
BEGIN;

CREATE TABLE public.document_signers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signer_name   text NOT NULL,
  signer_email  text NOT NULL,
  signer_phone  text,
  signing_order integer NOT NULL DEFAULT 1,        -- para firma secuencial
  status        text NOT NULL DEFAULT 'pending'    -- pending | signed | rejected
                CHECK (status IN ('pending','signed','rejected')),
  signed_at     timestamptz,
  token         text UNIQUE,                        -- token único por firmante
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_signers_document ON public.document_signers(document_id);
CREATE INDEX idx_document_signers_token    ON public.document_signers(token);

ALTER TABLE public.document_signers ENABLE ROW LEVEL SECURITY;

-- El dueño del documento gestiona sus firmantes.
CREATE POLICY "Owner manages signers" ON public.document_signers FOR ALL
  USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

-- Modo de firma a nivel de documento.
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signing_mode text NOT NULL DEFAULT 'single'
    CHECK (signing_mode IN ('single','parallel','sequential'));

COMMIT;
```

- `signing_mode = 'single'` preserva el comportamiento actual (no romper nada).
- La firma del público (anon) se valida por `token` igual que hoy con `sign_token`,
  pero contra `document_signers.token`. Mantener `documents.sign_token` para el
  modo single.

### 2. Derivación de estado del documento

El `documents.status` pasa a derivarse de sus firmantes (trigger o al cerrar cada
firma): `signed` solo cuando **todos** los `document_signers` están `signed`.

```sql
CREATE OR REPLACE FUNCTION public.refresh_document_status(p_document_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pending int; v_total int;
BEGIN
  SELECT count(*) FILTER (WHERE status <> 'signed'), count(*)
    INTO v_pending, v_total
  FROM public.document_signers WHERE document_id = p_document_id;
  IF v_total > 0 AND v_pending = 0 THEN
    UPDATE public.documents SET status = 'signed', signed_at = now()
    WHERE id = p_document_id;
  END IF;
END; $$;
```

### 3. Flujo de envío (`NewDocument.tsx` + `send-invite-v2`)

- Paso 3 "Firmante": reemplazar el formulario único por una **lista dinámica**
  (botón "Añadir firmante", hasta 5) + selector **Secuencial / Paralelo**.
- Al crear el documento, insertar N filas en `document_signers` (con `token`
  propio por firmante) en vez de los campos `signer_*` del documento.
- `send-invite-v2`: en **paralelo** enviar a todos; en **secuencial** enviar solo
  al `signing_order = 1` y, al firmar cada uno, disparar el email del siguiente.

### 4. Firma pública (`SignDocument.tsx` + `sign-complete-v2`)

- Resolver el firmante por `document_signers.token` (no por `documents.sign_token`).
- `sign-complete-v2`: marcar ese firmante como `signed`, registrar su evidencia en
  `signatures` (añadir `signer_id uuid REFERENCES document_signers(id)`), y llamar
  a `refresh_document_status`. En secuencial, enviar invitación al siguiente.

### 5. Certificado / audit trail

- `generate-audit-trail`: iterar sobre todos los `document_signers` e incluir
  fecha/hora, IP y evidencia de **cada** firma. El PDF de firma debe estampar las
  N firmas (una página de evidencias por firmante o una tabla resumen).

### Riesgos / mitigación
- **Riesgo legal:** una regresión rompe la firma para todos. → Implementar con
  `signing_mode='single'` como default; el código nuevo solo actúa con
  `parallel`/`sequential`. Tests e2e (Playwright) del camino single antes de merge.
- **Tokens:** un token por firmante; nunca reutilizar el `sign_token` del documento.

---

## ME-05 · API pública y webhooks (8–12 días)

Ya existe base: tabla `api_clients` y la edge function `signature-requests`
(integración Nexo). Extender, no reinventar.

### 1. Schema

```sql
-- API keys (hasheadas, nunca en claro)
CREATE TABLE public.api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  key_hash     text NOT NULL,            -- SHA-256 de la clave
  key_prefix   text NOT NULL,            -- primeros 8 chars para mostrar (fc_live_xxxx…)
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages api keys" ON public.api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Webhooks
CREATE TABLE public.webhooks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url        text NOT NULL,
  events     text[] NOT NULL DEFAULT '{}',   -- document.sent|signed|completed
  secret     text NOT NULL,                  -- para firmar el payload (HMAC-SHA256)
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages webhooks" ON public.webhooks FOR ALL
  USING (auth.uid() = user_id);

-- Cola de entregas (reintentos)
CREATE TABLE public.webhook_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id  uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event       text NOT NULL,
  payload     jsonb NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  delivered_at timestamptz,
  next_retry_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_queue ENABLE ROW LEVEL SECURITY; -- sin políticas: solo service_role
```

### 2. Gateway (edge function `api-v1`)
- Valida `Authorization: Bearer fc_live_…` → hashea → busca en `api_keys`
  (no revocada) → mapea a `user_id` → actualiza `last_used_at`.
- Endpoints mínimos: `POST /documents` (crear+enviar), `GET /documents/{id}`,
  `GET /documents`. Reutilizar la lógica de `send-invite-v2`.
- Rate-limit por key (reusar patrón `check_clara_rate_limit`).

### 3. Webhooks
- Al ocurrir `document.sent|signed|completed` (en `send-invite-v2` /
  `sign-complete-v2`), encolar en `webhook_queue` para los webhooks suscritos.
- Worker (`pg_cron` + función, o Inngest) que entrega con HMAC-SHA256 en cabecera
  `X-FirmaClara-Signature` y reintenta con backoff.

### 4. UI (Ajustes → API)
- Generar key (mostrar **una sola vez** en claro), listar por prefijo, revocar.
- Alta/baja de webhooks con test de entrega.
- Documentación pública (OpenAPI) en `docs.firmaclara.es`.

### Riesgos
- Seguridad de la key (mostrarla solo al crearla; guardar solo el hash).
- El gateway es superficie de ataque nueva → validación estricta de inputs y
  rate-limit por key obligatorios.

---

## ME-07 · Gestión de equipo / multi-usuario (grande)

Cambia el modelo de propiedad de "documento por usuario" a "documento por cuenta".
Ya existe un `AdminTeam` interno; esto es distinto: equipos **de cliente**.

### Enfoque recomendado (incremental, sin romper RLS existente)
1. Tabla `organizations` (id, name, owner_id) y `organization_members`
   (org_id, user_id, role: owner|admin|member).
2. Añadir `org_id` (nullable) a `documents`, `contacts`, `user_credit_purchases`.
   Backfill: crear una org por usuario existente y asignar sus filas.
3. **RLS:** ampliar las políticas para permitir acceso por pertenencia a la org:
   `USING (user_id = auth.uid() OR org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()))`.
   Hacerlo tabla por tabla y con el test `rls-isolation.test.ts` extendido a un
   tercer usuario de otra org (no debe ver nada).
4. Créditos compartidos a nivel de org (el saldo pasa a ser de la org, no del user).
5. UI: sección "Equipo" en Ajustes (invitar por email, roles, quitar miembros).

### Riesgos
- Es el cambio con mayor impacto en RLS → altísimo riesgo de fuga entre orgs si
  una política queda mal. Cada tabla debe pasar el test de aislamiento ampliado
  **antes** de exponerse. Considerar feature flag + rollout gradual.

---

## Orden sugerido de ejecución

1. **ME-11** (2 h) — en cuanto `send-invite-v2` esté commiteado.
2. **ME-02** (multi-firma) — detrás de `signing_mode`, con e2e del camino single.
3. **ME-05** (API + webhooks) — base ya existe (`api_clients`, `signature-requests`).
4. **ME-07** (equipos) — el último; máximo impacto en RLS, requiere el test de
   aislamiento ampliado a multi-org como puerta de calidad.
