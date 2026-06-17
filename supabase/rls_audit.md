# Auditoría de Row Level Security (RLS) — FirmaClara

**Ítem PRD:** ME-01 · **Fecha:** 2026-06-12 · **Proyecto Supabase:** `pmzfwwtgjvlvuawxguiw`

Este documento responde a la preocupación de la auditoría externa: la petición
`GET /rest/v1/documents` no lleva `user_id=eq.{uid}` en la URL, por lo que el
aislamiento entre usuarios depende **enteramente** de las políticas RLS. Aquí se
verifica que ese aislamiento existe, se inventarían las políticas y se dejan dos
herramientas reproducibles:

- [`rls_audit.sql`](./rls_audit.sql) — consultas de solo lectura para el SQL Editor.
- [`src/test/rls-isolation.test.ts`](../src/test/rls-isolation.test.ts) — test
  automatizado que intenta leer datos de otro usuario y exige resultado vacío.

> El frontend usa la `anon key` (pública, va en el bundle — esto es correcto en
> apps Supabase). La seguridad NO depende de ocultar esa clave sino de las
> políticas RLS de cada tabla. Por eso este ítem es prioritario.

---

## Veredicto sobre la preocupación del PRD

**El aislamiento de `documents` está correctamente implementado por diseño.** La
tabla tiene RLS activo y una política `SELECT USING (auth.uid() = user_id)`
(migración `20260126_security_fixes.sql`, reforzada después). Una `GET /documents`
sin filtro devuelve **solo** las filas del usuario del JWT; PostgREST aplica el
`USING` como `WHERE` implícito. Por tanto, omitir `user_id=eq.{uid}` en la URL
**no** es una vulnerabilidad: es el comportamiento esperado de Supabase.

Para dejarlo **probado** (no solo argumentado), ver el test de aislamiento.

---

## Inventario de políticas (reconstruido desde migraciones)

Fuente de verdad: `supabase/schema.sql` + `supabase/migrations/*`. El estado vivo
debe confirmarse ejecutando `rls_audit.sql` (bloques 1–2).

| Tabla | RLS | Lectura (SELECT) | Escritura | Notas |
|---|---|---|---|---|
| `users` | ✅ | `auth.uid() = id` + admin ve todo | update propio; admin update | `20260212_fix_users_rls.sql` |
| `documents` | ✅ | `auth.uid() = user_id` + admin | insert/update/delete propios; el paso a `sent`/`signed` lo bloquea el trigger `guard_document_status` (solo server-side) | núcleo del aislamiento |
| `signatures` | ✅ | dueño vía documento + admin | sin update / sin delete; insert solo server-side (RPC eliminado en v3) | `20260121_harden_rls.sql`, v3 |
| `contacts` | ✅ | `auth.uid() = user_id` | dueño | `20260121_harden_rls.sql` |
| `credit_transactions` | ✅ | `auth.uid() = user_id` + admin | insert service_role | `20260129_credit_transactions.sql` |
| `user_credit_purchases` | ✅ | `auth.uid() = user_id` + admin | service_role; sin delete | `20260211`, `20260212_security_hardening.sql` |
| `credit_packs` | ✅ | **VER HALLAZGO 1** | — | esquema ambiguo entre migraciones |
| `event_logs` | ✅ | `auth.uid() = user_id` + admin | insert propio; sin update/delete | `20260212_security_hardening.sql` |
| `clara_conversations` | ✅ | `auth.uid() = user_id` + admin | dueño | |
| `clara_messages` | ✅ | dueño vía conversación + admin | dueño | |
| `clara_usage_logs` | ✅ | sin políticas (solo RPC `SECURITY DEFINER`) | — | rate-limit durable, v3 |
| `notifications` | ✅ | `auth.uid() = user_id` | | `20260121_upgrade_schema.sql` |
| `otp_logs` | ✅ | restringido | | `20260127_otp_rate_limiting.sql` |
| `support_chats` / `support_messages` | ✅ | dueño + rol admin/support | dueño | `20260501_*` |
| `pack_types` | ✅ | lectura pública (catálogo de precios) | service_role | aceptable: sin datos de usuario |
| `email_queue` | ✅ | `service_role_only` | service_role | `20260510_email_queue.sql` |
| `webhook_events` | ✅ | `service_role_only` | service_role | `20260510_webhook_events.sql` |
| `api_clients` | ✅ | `service_role_only` | service_role | `20260608_nexo_integration.sql` |

Conclusión del inventario: **todas** las tablas con datos de usuario tienen RLS
activo y una política de lectura ligada a `auth.uid()`. No hay tablas de usuario
con lectura abierta… salvo el hallazgo siguiente, que debe confirmarse en vivo.

---

## Hallazgos

### Hallazgo 1 (ALTA — verificar en prod) · Doble definición de `credit_packs`

Hay dos migraciones que definen `credit_packs` de forma **incompatible**:

1. `schema.sql` + `20260121_harden_rls.sql`: tabla de **packs del usuario**
   (`user_id`, `credits_total`, `credits_used`, `stripe_payment_id`…). Es la que
   usan `consume_credit()` y `get_available_credits()`. RLS:
   `SELECT USING (auth.uid() = user_id)`.
2. `20260210_improve_credit_packs.sql`: redefine `credit_packs` como **catálogo
   público** (`slug`, `price`, `is_active`) con `CREATE TABLE IF NOT EXISTS`
   (que **no** recrea si ya existe), añade la política
   `"Allow public read access to active packs" USING (is_active = true)` y un
   `GRANT SELECT ON public.credit_packs TO anon, authenticated`.

**Riesgo:** si en prod sobrevive la tabla de *packs del usuario* y además quedó
activa la política de lectura pública del paso 2, cualquiera (incluso `anon`)
podría leer el saldo y los pagos de **todos** los usuarios. Si por el contrario
quedó viva la tabla *catálogo*, entonces el sistema de créditos estaría leyendo
de una tabla sin `user_id` (otro bug distinto).

**Acción:** ejecutar el bloque 5 de `rls_audit.sql`.
- Si `credit_packs` tiene `user_id` **y** una política pública/anon → **eliminarla**
  y dejar solo `auth.uid() = user_id`.
- Aclarar el modelo: el catálogo de packs debería vivir en una tabla aparte
  (p. ej. `pack_types`, que ya existe) y `credit_packs` quedar solo para packs del
  usuario.

### Hallazgo 2 (INFO — por diseño) · Lectura pública del bucket `documents`

`20260123_security_remediation.sql` crea `"Documents Public Read"` sobre
`storage.objects`. Es **intencionado**: el firmante no autenticado abre el PDF
desde su URL (`getPublicUrl` en `NewDocument.tsx`). La mitigación es que la ruta
del objeto incluye el `user_id` + timestamp y no es adivinable. `20260522_storage_security.sql`
restringió la **escritura** a la carpeta propia del usuario. Aceptable, pero
documentado: las URLs de documento son, en la práctica, *bearer URLs* (quien
tiene el enlace, lee). Si se quisiera endurecer, migrar a bucket privado + URLs
firmadas con caducidad para el firmante.

---

## Verificación automatizada

`src/test/rls-isolation.test.ts` (Vitest) crea dos clientes con la `anon key`,
inicia sesión como usuario A y usuario B y comprueba que A **no** ve filas de B en
`documents`, `contacts` ni `credit_transactions` (array vacío, no 403). Es
**opt-in**: se salta solo si no están las credenciales de prueba en entorno.

```bash
# .env.test.local (NO commitear)
VITE_SUPABASE_URL=https://pmzfwwtgjvlvuawxguiw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
RLS_TEST_USER_A_EMAIL=rls-a@example.com
RLS_TEST_USER_A_PASSWORD=...
RLS_TEST_USER_B_EMAIL=rls-b@example.com
RLS_TEST_USER_B_PASSWORD=...

npx vitest run src/test/rls-isolation.test.ts
```

Crear dos usuarios de prueba (confirmados), que cada uno tenga ≥1 documento y
≥1 contacto, y ejecutar. Resultado esperado: A ve solo lo suyo; 0 filas de B.

---

## Checklist (rellenar tras ejecutar `rls_audit.sql` en prod)

- [ ] Bloque 1: `rowsecurity = true` en todas las tablas de usuario.
- [ ] Bloque 3: ninguna tabla de usuario sin políticas.
- [ ] Bloque 4: toda política anon/public es de catálogo sin datos personales.
- [ ] Bloque 5: `credit_packs` resuelto (Hallazgo 1) — sin lectura pública de packs de usuario.
- [ ] Bloque 6: escritura en Storage restringida a la carpeta del propio usuario.
- [ ] `rls-isolation.test.ts` ejecutado en verde con dos usuarios reales.
