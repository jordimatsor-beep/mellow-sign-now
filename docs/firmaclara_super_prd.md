# FirmaClara — Super PRD Consolidado

## 1. Propósito del documento

Este documento unifica y cierra la visión técnica y de producto de FirmaClara. Establece las reglas de negocio vigentes para la versión 1.0 y refleja el estado técnico real del sistema sin asunciones futuras.

Se basa en la información contenida en:
- `firmaclara-prd.md`
- `firmaclara-supabase-schema.md`
- `firmaclara-antigravity-guide.md`
- `firmaclara-lovable-guide.md`
- `firmaclara-n8n-flows.md`
- `firmaclara-vercel-config.md`

---

## 2. Definición del producto

### 2.1 Qué es FirmaClara

FirmaClara es una plataforma legaltech para **creación, análisis, envío y firma electrónica de documentos**, asistida por **Clara AI**.

**Reglas de Negocio Cerradas:**
- **Clara AI es GRATUITA:** El uso del asistente para análisis, redacción o consultas NO consume créditos.
- **Pago por Envío:** Los créditos representan exclusivamente contratos enviados a terceros.
- **Sin Caducidad:** Los créditos adquiridos no expiran.

### 2.2 Qué NO es FirmaClara

(Ref: `firmaclara-prd.md`)
- No es una firma electrónica cualificada.
- No es un sustituto de un abogado.
- No es un chatbot genérico.

---

## 3. Arquitectura global del sistema

### 3.1 Visión de alto nivel

```
Frontend (Vite + React)
↓
Supabase (Auth + DB + Storage)
↓
Clara AI (Gemini 1.5 Flash)
↓
Servicios externos:
- Stripe
- n8n
- Vercel
```

### 3.2 Decisiones críticas

- **Backend:** Supabase como backend único (Ref: `firmaclara-antigravity-guide.md`).
- **IA:** Gemini 1.5 Flash (Ref: `src/components/ClaraChat.tsx`).
- **Entorno:** Desarrollo local estratégico (Ref: `firmaclara-antigravity-guide.md`).

### 3.3 Stack tecnológico (Documentado)

**Frontend:**
- Vite + React + Tailwind CSS (Ref: `package.json`, `firmaclara-lovable-guide.md`).
- Estado: React Query (Ref: `firmaclara-lovable-guide.md`).

**Backend:**
- Node.js + Antigravity (Ref: `firmaclara-antigravity-guide.md`).
- Supabase (PostgreSQL, Storage, Auth) (Ref: `supabase/schema.sql`).
- Google Gemini 1.5 Flash (Ref: `src/components/ClaraChat.tsx`).

**Integraciones:**
- Stripe (Ref: `src/lib/stripe.ts`).
- n8n (Ref: `firmaclara-n8n-flows.md`).

---

## 4. Clara AI — Asistente Legal Gratuito

### 4.1 Rol y Coste

El uso de Clara AI para redactar, analizar o corregir documentos es **totalmente gratuito e ilimitado** (sujeto a políticas de uso razonable).

**Protección Operativa:** La plataforma puede aplicar límites técnicos en caso de abuso, sin introducir monetización ni consumo de créditos.

**Regla de Facturación:**
- Chat con Clara = **0 Créditos**.
- Análisis de PDF = **0 Créditos**.
- Generación de borrador = **0 Créditos**.

### 4.2 Seguridad y blindaje

**System Prompt implementado:** (Ref: `src/components/ClaraChat.tsx`)
Contiene instrucciones explícitas para:
- Rechazar temas no legales ("RESTRICCIÓN DE DOMINIO").
- Detectar manipulación ("BLINDAJE ANTI-PROMPT HACKING").
- Mantener tono profesional.

**Implementación técnica:**
- Modelo: `gemini-1.5-flash` (Ref: `src/components/ClaraChat.tsx`).
- Temperature: 0.2 (Ref: `src/components/ClaraChat.tsx`).
- Sanitización de input regex (Ref: `src/components/ClaraChat.tsx`).

### 4.3 Gestión de memoria

- Tabla `clara_conversations` y `clara_messages` definidas (Ref: `supabase/schema.sql`).
- Política de borrado (>90 días) implementada en SQL (Ref: `supabase/schema.sql`).

---

## 5. Modelo de datos y créditos

### 5.1 Estructura de Datos

(Ref: `supabase/schema.sql`)
Tablas principales definidas:
- `users`: Perfil y vinculación auth.
- `documents`: Metadatos y estados.
- `signatures`: Evidencias y hashes.
- `credit_packs`: Gestión de saldo.
- `event_logs`: Auditoría.

### 5.2 Sistema de Créditos (Estado Real)

**Definición de Crédito:**
- 1 Crédito = 1 Contrato enviado para firma.
- El número de firmantes en el documento **NO altera el coste** (1 envío = 1 crédito).

**Implementación técnica actual:**
- Tabla `credit_packs` almacena el saldo.
- Campos:
    - `credits_total`: Cantidad comprada.
    - `credits_used`: Contador acumulativo de uso.
- **Modelo:** Contador simple.
- **Integridad:** La lógica de consumo debe ser atómica para evitar duplicidades.

**Pendiente de formalización técnica (TODO):**
- **Trigger de consumo:** No existe función automática en DB. La lógica de restar crédito al enviar debe implementarse en la API/Edge Function.
- **FIFO:** No existe lógica FIFO implementada ni requerida contractualmente (créditos fungibles).
- **Trigger de bienvenida:** Función `handle_new_user` pendiente de verificación en entorno productivo.

### 5.3 Seguridad de Datos

**Row Level Security (RLS):**
- Políticas habilitadas (`ENABLE ROW LEVEL SECURITY`) para todas las tablas (Ref: `supabase/schema.sql`).
- Políticas específicas `auth.uid() = user_id` definidas (Ref: `supabase/schema.sql`).

---

## 6. Flujos (Estado de implementación)

### 6.1 Análisis con Clara (Gratuito)
- Frontend: `src/pages/Clara.tsx` y `src/components/ClaraChat.tsx` (Implementado).
- Backend: Integración con Google Generative AI (Implementado en componente cliente actualmente).
- **Consumo:** No registra consumo de créditos.

### 6.2 Envío y Firma (Facturable)
- **Acción:** Usuario hace clic en "Enviar a firmar".
- **Validación (Logica Frontend/API):** Validar `(credits_total - credits_used) > 0`.
- **Consumo:** Incrementar `credits_used + 1` en `credit_packs`.
- **Estado:**
    - Base de datos y Storage configurados (Ref: `supabase/schema.sql`).
    - Flujo de firma visual (Ref: `firmaclara-lovable-guide.md`).
    - Lógica de consumo automática: **TODO**.

### 6.3 Monetización
- Frontend: `src/lib/stripe.ts` (Implementado).
- Modelo de datos: `credit_packs` (Ref: `supabase/schema.sql`).
- Packs visualizados en UI: Trial, Basic, Pro, Business.

---

## 7. Métrica y Estrategia

### 7.1 Métricas Técnicas
- **TODO:** Implementación de dashboards de métricas de negocio.
- Tablas base para métricas (`event_logs`) existen (Ref: `supabase/schema.sql`).

### 7.2 Roadmap (Estado real)

**Implementado (Ref: Código actual):**
- Auth, DB, Storage (Supabase).
- Chat UI + Integración Gemini (`ClaraChat.tsx`).
- Setup Stripe Frontend (`stripe.ts`).
- Modelo de datos completo (`schema.sql`).

**Pendiente / Por verificar (TODO):**
- Activación Stripe producción.
- Implementación final integración FreeTSA (Código backend específico no revisado en esta sesión).
- Lógica de retries para servicios externos.

---

## 8. Riesgos y Mitigaciones (Técnicas)

| Riesgo | Mitigación Documentada | Referencia |
|--------|------------------------|------------|
| Injection | Sanitización Regex | `src/components/ClaraChat.tsx` |
| Coste IA | Configuración `maxOutputTokens: 1000` | `src/components/ClaraChat.tsx` |
| Acceso datos | RLS Policies | `supabase/schema.sql` |
| Fallo TSA | **TODO: Definir política de reintentos** | - |
| Gestión Créditos | **TODO: Formalizar lógica de consumo atómico** | - |

---

**Nota:** Este documento refleja las reglas de negocio cerradas y el estado actual del código. Las secciones marcadas como TODO indican deuda técnica o implementaciones pendientes.
