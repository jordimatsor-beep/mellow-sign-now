# Decisiones técnicas — FirmaClara

Registro de decisiones arquitectónicas y de implementación con su justificación.
Formato ligero ADR (Architecture Decision Record): contexto → decisión → alternativas descartadas.

---

## 2026-05-25

### DEC-001 — Stripe: dos tablas en vez de una para créditos

**Contexto:** El sistema original usaba `credit_packs` como tabla de compras.

**Decisión:** Se usan dos tablas separadas:
- `user_credit_purchases` — ledger de compras (una fila por pago)
- `credit_transactions` — historial de operaciones de débito/crédito

**Por qué:** Separa las responsabilidades de "qué compró el usuario" (inmutable, ligado a Stripe) de "cómo se gastaron esos créditos" (mutable, con historial). Permite auditoría completa y rollback de créditos sin afectar el registro de pago.

**Alternativas descartadas:** Una sola tabla con columnas `type` (purchase/debit) — descartada porque mezcla semántica de pago y consumo, complicando la deduplicación de webhooks de Stripe.

---

### DEC-002 — FIFO multi-pack en `admin_revoke_credits`

**Contexto:** La función original buscaba un único pack con créditos suficientes. Si el usuario tenía los créditos distribuidos en varios packs, la revocación fallaba silenciosamente (devolvía 0 afectados).

**Decisión:** Iterar los packs en orden FIFO (por `created_at ASC`) y deducir parcialmente de cada uno hasta completar el total. Si hay inconsistencia (`v_remaining > 0` al final), lanzar excepción explícita.

**Por qué:** Coherencia con cómo `consume_credit` ya funciona. El fallo silencioso anterior podía dejar créditos sin revocar sin que el admin lo supiera.

---

### DEC-003 — CORS con whitelist explícita, sin wildcard

**Contexto:** Las Edge Functions tenían `Access-Control-Allow-Origin: *`.

**Decisión:** `_shared/cors.ts` con lista explícita de orígenes permitidos. Las peticiones de orígenes no listados reciben `Access-Control-Allow-Origin: null` (no vacío — `null` hace que el browser bloquee la respuesta CORS correctamente).

**Por qué:** Con wildcard, cualquier web podría llamar a las Edge Functions con las credenciales del usuario autenticado (si el usuario las tiene). Crítico en funciones que consumen créditos o finalizan firmas.

**Trade-off:** Requiere actualizar la lista al añadir dominios nuevos (Vercel preview URLs, nuevos dominios). Decisión aceptada: seguridad > conveniencia de dev.

---

### DEC-004 — Stripe webhook: `whsec_` como secret en Supabase, no en código

**Contexto:** El secret de firma del webhook es necesario para verificar que los eventos vienen de Stripe.

**Decisión:** Almacenado en Supabase Secrets (`STRIPE_WEBHOOK_SECRET`). La Edge Function lo lee con `Deno.env.get()`.

**Por qué:** Si estuviera en el código (commiteado), cualquier acceso al repositorio comprometería todos los pagos (un atacante podría forjar eventos de pago completado). Supabase Secrets los cifra en reposo y solo los expone dentro del runtime de las Edge Functions.

---

### DEC-005 — SupportChat montado en `AuthenticatedLayout`, no por página

**Contexto:** El widget de chat estaba construido pero nunca montado.

**Decisión:** Montarlo una sola vez en `AuthenticatedLayout`. La página de Ayuda (`/help`) lo usa vía `ref` con `hideTriggerButton` para no duplicar el botón flotante.

**Por qué:** Una sola instancia mantiene el estado de sesión del chat (chatId en localStorage) sin importar la página en la que esté el usuario. Si se montase por página, el chat se reiniciaría al navegar.

**Alternativa descartada:** Context provider global con portal — más complejidad sin beneficio real dado que el componente ya gestiona su propio estado con localStorage.

---

### DEC-006 — Passwords: mínimo 12 caracteres + upper + lower + digit

**Contexto:** El mínimo anterior era 8 caracteres (regla estándar antigua).

**Decisión:** Mínimo 12, con al menos una mayúscula, una minúscula y un dígito. Aplicado tanto en frontend (`isValidPassword` en `validators.ts`) como en la configuración de Supabase Auth (via Management API).

**Por qué:** NIST SP 800-63B recomienda longitud sobre complejidad, pero dado el contexto legal de la plataforma (firma de documentos con valor jurídico), se aplican ambos criterios. 12 caracteres resiste ataques de diccionario modernos con GPUs.

**Nota de implementación:** La regla de Supabase Auth se aplica al registro y cambio de contraseña. La validación frontend da feedback inmediato antes del submit.

---

### DEC-007 — Bundle splitting: `tanstack` y `router` separados de `vendor`

**Contexto:** Vite agrupaba React Query y React Router en el chunk `vendor` (641 KB).

**Decisión:** `manualChunks` extrae `@tanstack/*` → `tanstack.js` (35 KB) y `react-router*` → `router.js` (36 KB). `vendor` queda en 570 KB.

**Por qué:** Estos chunks cambian en versiones distintas. Separándolos, un deploy que solo actualiza React Query no invalida la caché del bundle de React Router en el navegador del usuario.

**Alternativa rechazada:** Split del propio React (`react` + `react-dom`) — genera una dependencia circular entre chunks en Rollup (react-dom → scheduler → vendor → react). No tiene solución limpia sin eject.

---

### DEC-008 — `applyClosedChatState` como helper centralizado en SupportChat

**Contexto:** La lógica "si el chat está cerrado, marcarlo y saltar a `done` si ya hay rating" estaba inline en 4 lugares del componente.

**Decisión:** Extraerla como `useCallback` que devuelve `boolean` (fue aplicado / no aplicado).

**Por qué:** Los 4 call sites deben comportarse idénticamente. Con la duplicación, un bug en uno de ellos (o un nuevo estado terminal del chat) requería 4 cambios coordinados. El `boolean` de retorno permite que cada caller decida sus side-effects (limpiar localStorage, limpiar polling) sin re-evaluar la condición.

---

### DEC-009 — OTP hasheado (SHA-256) antes de almacenar en DB

**Contexto:** Los códigos OTP se guardaban en texto plano en `otp_logs`.

**Decisión:** SHA-256 antes de INSERT. El código plano solo viaja por Twilio (SMS/WhatsApp) y se verifica hasheando el input del usuario al comparar.

**Por qué:** Una brecha en la base de datos no expone códigos OTP activos. Aunque los OTP tienen vida corta (~5 min), en una brecha de datos el atacante podría usarlos en el mismo instante.

---

### DEC-010 — Dashboard query limitada a 50 documentos

**Contexto:** La query del dashboard cargaba todos los documentos del usuario sin `LIMIT`.

**Decisión:** `.limit(50)` en la query. El widget de "Documentos recientes" solo muestra 5; el total se calcula sobre la muestra.

**Trade-off aceptado:** Los stats (pendientes/firmados/total) son aproximados para usuarios con >50 documentos. La página `/documents` tiene paginación completa. Para el dashboard el dato exacto no es crítico — el usuario verá "50+" en vez de "87".

**Alternativa considerada:** Dos queries separadas (una con `COUNT(*)` para stats, otra con `LIMIT 5` para la lista). Descartada: dobla el número de queries sin beneficio significativo al nivel de escala actual.
